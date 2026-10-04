import { useEffect, useRef, useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { aujourdhui, decalerJours } from '../../../lib/dates.js';
import { couleurPersonne } from '../../../lib/people.js';
import { T as SOCLE } from '../../../textes.js';
import { RYTHMES } from '../echeance.js';
import { T } from '../textes.js';

const RACCOURCIS_DATE = [
  { libelle: T.feuille.raccourcis.sansDate, jours: null },
  { libelle: T.feuille.raccourcis.aujourdhui, jours: 0 },
  { libelle: T.feuille.raccourcis.demain, jours: 1 },
  { libelle: T.feuille.raccourcis.semaine, jours: 7 },
];

/**
 * Saisie d'une tâche, dans un panneau glissé depuis le bas.
 *
 * @param {object|null} task  tâche à modifier, ou null pour une création
 */
export function TaskSheet({ task, people, onSave, onDelete, onClose }) {
  const enEdition = Boolean(task?.id);

  const [title, setTitle] = useState(task?.title ?? '');
  const [dueOn, setDueOn] = useState(task?.dueOn ?? null);
  const [recurrence, setRecurrence] = useState(task?.recurrence ?? null);
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? null);
  const [note, setNote] = useState(task?.note ?? '');

  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const champTitre = useRef(null);

  useEffect(() => {
    champTitre.current?.focus();
  }, []);

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  /*
   * Une tâche qui se répète a besoin d'une échéance de départ, sinon elle ne
   * reviendrait jamais. Plutôt que de laisser le serveur refuser, on donne
   * la date du jour dès que l'utilisateur choisit un rythme.
   */
  function choisirRythme(valeur) {
    setRecurrence(valeur);
    if (valeur && !dueOn) setDueOn(aujourdhui());
  }

  async function soumettre(evenement) {
    evenement.preventDefault();
    setErreur(null);
    setEnregistrement(true);

    try {
      await onSave({
        ...(enEdition ? { id: task.id } : {}),
        title: title.trim(),
        dueOn,
        recurrence,
        assigneeId,
        note: note.trim() || null,
      });
      onClose();
    } catch (apiError) {
      setErreur(apiError.details?.[0]?.message ?? apiError.message);
      setEnregistrement(false);
    }
  }

  const choixPersonnes = [{ id: null, displayName: SOCLE.membres.toutLeMonde }, ...people];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-voile" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={SOCLE.commun.fermer}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={enEdition ? T.feuille.modifier : T.feuille.nouvelle}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">
          {enEdition ? T.feuille.modifier : T.feuille.nouvelle}
        </h2>

        <form onSubmit={soumettre} className="mt-4 space-y-4 pb-4">
          <input
            ref={champTitre}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={T.feuille.placeholder}
            aria-label={T.feuille.intitule}
            required
            maxLength={160}
            className="min-h-12 w-full rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
          />

          <div className="rounded-xl bg-surface p-3 ring-1 ring-sand-200">
            <p className="text-sm font-medium text-sand-700">{T.feuille.aFairePour}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {RACCOURCIS_DATE.map(({ libelle, jours }) => {
                const valeur = jours === null ? null : decalerJours(aujourdhui(), jours);
                const actif = dueOn === valeur;
                return (
                  <button
                    key={libelle}
                    type="button"
                    // Retirer l'échéance d'une tâche qui se répète la rendrait
                    // impossible à replanifier.
                    disabled={valeur === null && recurrence !== null}
                    onClick={() => setDueOn(valeur)}
                    className={[
                      'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      actif ? 'bg-brand-600 text-white' : 'bg-sand-50 text-sand-600 ring-1 ring-sand-300',
                      'disabled:opacity-40',
                    ].join(' ')}
                  >
                    {libelle}
                  </button>
                );
              })}
              <input
                type="date"
                value={dueOn ?? ''}
                onChange={(e) => setDueOn(e.target.value || null)}
                aria-label={T.feuille.echeancePrecise}
                className="rounded-full bg-sand-50 px-3 py-1 text-sm text-sand-600 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <p className="mt-4 border-t border-sand-100 pt-3 text-sm font-medium text-sand-700">
              {T.feuille.seRepete}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RYTHMES.map(({ valeur, libelle }) => {
                const actif = recurrence === valeur;
                return (
                  <button
                    key={libelle}
                    type="button"
                    onClick={() => choisirRythme(valeur)}
                    aria-pressed={actif}
                    className={[
                      'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      actif ? 'bg-brand-600 text-white' : 'bg-sand-50 text-sand-600 ring-1 ring-sand-300',
                    ].join(' ')}
                  >
                    {libelle}
                  </button>
                );
              })}
            </div>
            {recurrence && (
              <p className="mt-2 text-xs text-sand-500">
                {T.feuille.explicationRythme}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">{T.feuille.pourQui}</p>
            <div className="flex flex-wrap gap-2">
              {choixPersonnes.map((personne) => {
                const actif = assigneeId === personne.id;
                const couleur = couleurPersonne(personne.id);
                return (
                  <button
                    key={personne.id ?? 'tous'}
                    type="button"
                    onClick={() => setAssigneeId(personne.id)}
                    aria-pressed={actif}
                    className={[
                      'inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1 transition',
                      actif
                        ? `${couleur.fond} ${couleur.texte} ${couleur.bordure}`
                        : 'bg-surface text-sand-600 ring-sand-300',
                    ].join(' ')}
                  >
                    <span className={`size-2.5 rounded-full ${couleur.pastille}`} aria-hidden="true" />
                    {personne.displayName}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={SOCLE.commun.noteFacultative}
            aria-label={SOCLE.commun.note}
            rows={2}
            maxLength={500}
            className="w-full rounded-xl bg-surface px-4 py-3 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
          />

          {erreur && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              {erreur}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {SOCLE.commun.annuler}
            </Button>
            <Button type="submit" loading={enregistrement} className="flex-1">
              {SOCLE.commun.enregistrer}
            </Button>
          </div>

          {enEdition && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
              className="w-full text-danger"
            >
              {T.feuille.supprimer}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
