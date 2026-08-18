import { useCallback, useEffect, useRef, useState } from 'react';

import { ArrowLeftIcon, TrashIcon } from '../../../components/icons.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { notesApi } from '../api.js';
import { PinIcon } from '../NotesIcon.jsx';

/** Délai d'inactivité avant enregistrement. Assez court pour rassurer, assez
 *  long pour ne pas envoyer une requête par lettre tapée. */
const DELAI_SAUVEGARDE = 800;

/**
 * Édition d'une note, en plein écran.
 *
 * Pas de bouton « Enregistrer » : le texte part tout seul après une pause dans
 * la frappe, et un indicateur discret dit où en est l'envoi. C'est l'idiome du
 * reste de l'application, où rien n'attend jamais une confirmation.
 *
 * Le cas délicat est l'écriture à deux. Le serveur refuse d'écraser un texte
 * modifié entre-temps, et l'éditeur pose alors la question plutôt que de
 * trancher : perdre trois lignes sans le savoir serait pire que de devoir
 * choisir.
 */
export function NoteEditor({ note, onEnregistree, onEpingler, onSupprimer, onClose }) {
  const [id, setId] = useState(note?.id ?? null);
  const [version, setVersion] = useState(note?.version ?? null);
  const [pinned, setPinned] = useState(note?.pinned ?? false);

  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');

  /** Ce que le serveur détient, pour savoir s'il y a quelque chose à envoyer. */
  const [sauvegarde, setSauvegarde] = useState({
    title: note?.title ?? null,
    body: note?.body ?? '',
  });

  const [etat, setEtat] = useState('repos'); // repos | attente | envoi | enregistre | conflit | erreur
  const [messageErreur, setMessageErreur] = useState(null);
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);

  const champCorps = useRef(null);
  const champTitre = useRef(null);

  useEffect(() => {
    // Une note vierge s'ouvre sur le titre ; une note existante sur son corps,
    // qu'on vient presque toujours compléter.
    (note?.id ? champCorps : champTitre).current?.focus();
  }, [note?.id]);

  const titrePropre = title.trim() === '' ? null : title.trim();
  const aChange = titrePropre !== sauvegarde.title || body !== sauvegarde.body;

  const enregistrer = useCallback(async () => {
    if (!aChange) return;
    // Une note jamais enregistrée et encore vide ne doit pas exister : ouvrir
    // l'éditeur puis se raviser ne doit rien laisser derrière soi.
    if (id === null && titrePropre === null && body.trim() === '') return;

    setEtat('envoi');
    setMessageErreur(null);

    try {
      const data =
        id === null
          ? await notesApi.create({ title: titrePropre, body })
          : await notesApi.update(id, { title: titrePropre, body, expectedVersion: version });

      setId(data.note.id);
      setVersion(data.note.version);
      setSauvegarde({ title: data.note.title, body: data.note.body });
      setEtat('enregistre');
      onEnregistree(data.note);
    } catch (apiError) {
      if (apiError.status === 409) {
        setEtat('conflit');
        return;
      }
      setEtat('erreur');
      setMessageErreur(apiError.message);
    }
  }, [aChange, body, id, onEnregistree, titrePropre, version]);

  // Sauvegarde différée : chaque frappe repousse l'échéance.
  useEffect(() => {
    if (!aChange) return undefined;
    // Tant que le conflit n'est pas tranché, on n'insiste pas : ce serait
    // réessayer d'écraser le texte de l'autre à chaque lettre.
    if (etat === 'conflit') return undefined;

    setEtat('attente');
    const minuteur = setTimeout(enregistrer, DELAI_SAUVEGARDE);
    return () => clearTimeout(minuteur);
  }, [aChange, enregistrer, etat]);

  const fermer = useCallback(async () => {
    // Ce qui n'est pas encore parti part maintenant : fermer ne doit jamais
    // perdre les derniers mots tapés.
    if (etat !== 'conflit') await enregistrer();
    onClose();
  }, [enregistrer, etat, onClose]);

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') fermer();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [fermer]);

  /** Abandonner ma version et reprendre celle enregistrée. */
  async function reprendreLAutre() {
    const { note: courante } = await notesApi.get(id);
    setTitle(courante.title ?? '');
    setBody(courante.body);
    setVersion(courante.version);
    setSauvegarde({ title: courante.title, body: courante.body });
    setEtat('enregistre');
    onEnregistree(courante);
  }

  /** Garder mon texte : on repart de la version courante, qu'on écrase. */
  async function imposerMonTexte() {
    const { note: courante } = await notesApi.get(id);
    setVersion(courante.version);
    setSauvegarde({ title: courante.title, body: courante.body });
    // L'état quitte « conflit » : la sauvegarde différée reprend d'elle-même.
    setEtat('repos');
  }

  function basculerEpingle() {
    setPinned((precedent) => !precedent);
    onEpingler({ id, pinned });
  }

  const INDICATEURS = {
    attente: 'Modifications en attente…',
    envoi: 'Enregistrement…',
    enregistre: 'Enregistré',
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-fond" role="dialog" aria-modal="true" aria-label="Note">
      <header className="pt-safe shrink-0 bg-entete text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-2">
          <button
            type="button"
            onClick={fermer}
            aria-label="Fermer la note"
            className="grid size-11 place-items-center rounded-full transition-colors hover:bg-white/10 active:bg-white/20"
          >
            <ArrowLeftIcon className="size-5" />
          </button>

          <p className="flex-1 truncate text-sm text-white/80" role="status">
            {INDICATEURS[etat] ?? ''}
          </p>

          {id !== null && (
            <button
              type="button"
              onClick={basculerEpingle}
              aria-pressed={pinned}
              aria-label={pinned ? 'Détacher la note' : 'Épingler la note'}
              className="grid size-11 place-items-center rounded-full transition-colors hover:bg-white/10 active:bg-white/20"
            >
              <PinIcon className="size-5" rempli={pinned} />
            </button>
          )}
        </div>
      </header>

      {etat === 'conflit' && (
        <div role="alert" className="bg-amber-100 px-4 py-3 text-amber-900">
          <p className="mx-auto max-w-2xl text-sm font-medium">
            Cette note a été modifiée ailleurs pendant que tu écrivais.
          </p>
          <div className="mx-auto mt-2 flex max-w-2xl flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={reprendreLAutre}>
              Voir leur version
            </Button>
            <Button size="sm" onClick={imposerMonTexte}>
              Garder mon texte
            </Button>
          </div>
        </div>
      )}

      {etat === 'erreur' && messageErreur && (
        <p role="alert" className="bg-red-50 px-4 py-2 text-center text-sm text-danger">
          {messageErreur}
        </p>
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-y-auto px-4 pt-4">
        <input
          ref={champTitre}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre (facultatif)"
          aria-label="Titre de la note"
          maxLength={120}
          className="w-full shrink-0 bg-transparent text-lg font-semibold text-sand-900 outline-none placeholder:font-normal placeholder:text-sand-400"
        />

        <textarea
          ref={champCorps}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Écris ici…"
          aria-label="Contenu de la note"
          maxLength={20000}
          className="mt-3 min-h-64 w-full flex-1 resize-none bg-transparent leading-relaxed text-sand-800 outline-none placeholder:text-sand-400"
        />

        {id !== null && (
          <div className="pb-safe shrink-0 py-4">
            {confirmationSuppression ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    onSupprimer(id);
                    onClose();
                  }}
                >
                  Supprimer la note
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmationSuppression(false)}>
                  Annuler
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmationSuppression(true)}
                className="text-danger"
              >
                <TrashIcon className="size-4" />
                Supprimer
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
