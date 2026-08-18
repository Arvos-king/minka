import { useEffect, useRef, useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { aujourdhui } from '../../../lib/dates.js';
import { couleurPersonne } from '../../../lib/people.js';

/**
 * Panneau de saisie d'un événement, glissé depuis le bas de l'écran.
 *
 * Un calendrier demande plus de champs qu'une liste de courses : le champ
 * unique en bas d'écran ne suffit plus, et un formulaire pleine page ferait
 * perdre le contexte de l'agenda. Le panneau est le compromis habituel sur
 * mobile.
 *
 * @param {object|null} event  événement à modifier, ou null pour une création
 */
export function EventSheet({ event, dateParDefaut, people, onSave, onDelete, onClose }) {
  const enEdition = Boolean(event?.id);

  const [title, setTitle] = useState(event?.title ?? '');
  const [startsOn, setStartsOn] = useState(event?.startsOn ?? dateParDefaut ?? aujourdhui());
  const [journeeEntiere, setJourneeEntiere] = useState(!event?.startsAt);
  const [startsAt, setStartsAt] = useState(event?.startsAt ?? '09:00');
  const [endsAt, setEndsAt] = useState(event?.endsAt ?? '');
  const [endsOn, setEndsOn] = useState(event?.endsOn ?? '');
  const [ownerId, setOwnerId] = useState(event?.ownerId ?? null);
  const [note, setNote] = useState(event?.note ?? '');

  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const champTitre = useRef(null);

  useEffect(() => {
    champTitre.current?.focus();
  }, []);

  // Échap referme le panneau, comme n'importe quelle boîte de dialogue.
  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  async function soumettre(evenement) {
    evenement.preventDefault();
    setErreur(null);
    setEnregistrement(true);

    try {
      await onSave({
        ...(enEdition ? { id: event.id } : {}),
        title: title.trim(),
        startsOn,
        startsAt: journeeEntiere ? null : startsAt,
        endsOn: endsOn || null,
        // Une heure de fin n'a de sens que si l'événement a une heure de début.
        endsAt: journeeEntiere || !endsAt ? null : endsAt,
        ownerId,
        note: note.trim() || null,
      });
      onClose();
    } catch (apiError) {
      setErreur(apiError.details?.[0]?.message ?? apiError.message);
      setEnregistrement(false);
    }
  }

  const choixPersonnes = [{ id: null, displayName: 'Tout le monde' }, ...people];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-voile" role="presentation">
      {/* Toucher le fond ferme le panneau : geste attendu sur mobile. */}
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={enEdition ? "Modifier l'événement" : 'Nouvel événement'}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">
          {enEdition ? "Modifier l'événement" : 'Nouvel événement'}
        </h2>

        <form onSubmit={soumettre} className="mt-4 space-y-4 pb-4">
          <input
            ref={champTitre}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Intitulé"
            aria-label="Intitulé"
            required
            maxLength={120}
            className="min-h-12 w-full rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
          />

          <div className="rounded-xl bg-surface p-3 ring-1 ring-sand-200">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-sand-700">Date</span>
              <input
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                required
                className="min-h-10 rounded-lg bg-sand-50 px-3 text-sand-800 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>

            <label className="mt-3 flex items-center justify-between gap-3 border-t border-sand-100 pt-3">
              <span className="text-sm font-medium text-sand-700">Journée entière</span>
              <input
                type="checkbox"
                checked={journeeEntiere}
                onChange={(e) => setJourneeEntiere(e.target.checked)}
                className="size-5 accent-brand-600"
              />
            </label>

            {!journeeEntiere && (
              <div className="mt-3 flex items-center gap-2 border-t border-sand-100 pt-3">
                <input
                  type="time"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  aria-label="Heure de début"
                  className="min-h-10 flex-1 rounded-lg bg-sand-50 px-3 text-sand-800 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-sand-400">→</span>
                <input
                  type="time"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  aria-label="Heure de fin (facultative)"
                  className="min-h-10 flex-1 rounded-lg bg-sand-50 px-3 text-sand-800 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            <label className="mt-3 flex items-center justify-between gap-3 border-t border-sand-100 pt-3">
              <span className="text-sm font-medium text-sand-700">
                Se termine le
                <span className="ml-1 font-normal text-sand-500">(séjour)</span>
              </span>
              <input
                type="date"
                value={endsOn}
                min={startsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                aria-label="Date de fin, pour un événement sur plusieurs jours"
                className="min-h-10 rounded-lg bg-sand-50 px-3 text-sand-800 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">Qui est concerné&nbsp;?</p>
            <div className="flex flex-wrap gap-2">
              {choixPersonnes.map((personne) => {
                const actif = ownerId === personne.id;
                const couleur = couleurPersonne(personne.id);
                return (
                  <button
                    key={personne.id ?? 'tous'}
                    type="button"
                    onClick={() => setOwnerId(personne.id)}
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
            placeholder="Note (facultative)"
            aria-label="Note"
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
              Annuler
            </Button>
            <Button type="submit" loading={enregistrement} className="flex-1">
              Enregistrer
            </Button>
          </div>

          {enEdition && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
              className="w-full text-danger"
            >
              Supprimer l'événement
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
