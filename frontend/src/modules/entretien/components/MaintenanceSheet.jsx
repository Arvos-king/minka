import { useEffect, useRef, useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { aujourdhui } from '../../../lib/dates.js';
import { couleurPersonne } from '../../../lib/people.js';
import { RYTHMES } from '../echeances.js';

/**
 * Réglage d'une intervention, glissé depuis le bas.
 *
 * On y vient rarement — pour changer un rythme qui ne convient pas, confier une
 * corvée à quelqu'un, ou repousser sans mentir en disant que c'est fait.
 */
export function MaintenanceSheet({ tache, zones, people, onSave, onRepousser, onDelete, onClose }) {
  const enEdition = Boolean(tache?.id);

  const [label, setLabel] = useState(tache?.label ?? '');
  const [zoneId, setZoneId] = useState(tache?.zoneId ?? null);
  const [recurrence, setRecurrence] = useState(tache?.recurrence ?? 'quarterly');
  const [dueOn, setDueOn] = useState(tache?.dueOn ?? aujourdhui());
  const [assigneeId, setAssigneeId] = useState(tache?.assigneeId ?? null);
  const [note, setNote] = useState(tache?.note ?? '');

  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const champLabel = useRef(null);

  useEffect(() => {
    champLabel.current?.focus();
  }, []);

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
        label: label.trim(),
        zoneId,
        recurrence,
        dueOn,
        assigneeId,
        note: note.trim() || null,
      });
      onClose();
    } catch (apiError) {
      setErreur(apiError.details?.[0]?.message ?? apiError.message);
      setEnregistrement(false);
    }
  }

  const choixPersonnes = [{ id: null, displayName: 'Qui veut' }, ...people];
  const pastille =
    'inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1 transition';

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-voile" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={enEdition ? "Régler l'intervention" : 'Nouvelle intervention'}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">
          {enEdition ? "Régler l'intervention" : 'Nouvelle intervention'}
        </h2>

        <form onSubmit={soumettre} className="mt-4 space-y-4 pb-4">
          <input
            ref={champLabel}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Détartrer la machine à espresso"
            aria-label="Ce qu'il y a à faire"
            required
            maxLength={160}
            className="min-h-12 w-full rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
          />

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">Pièce</p>
            <div className="flex flex-wrap gap-2">
              {[{ id: null, label: 'Toute la maison' }, ...zones].map((zone) => {
                const actif = zoneId === zone.id;
                return (
                  <button
                    key={zone.id ?? 'maison'}
                    type="button"
                    onClick={() => setZoneId(zone.id)}
                    aria-pressed={actif}
                    className={`${pastille} ${actif ? 'bg-brand-50 text-accent ring-brand-300' : 'bg-surface text-sand-600 ring-sand-300'}`}
                  >
                    {zone.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">Rythme</p>
            <div className="flex flex-wrap gap-2">
              {RYTHMES.map((rythme) => {
                const actif = recurrence === rythme.valeur;
                return (
                  <button
                    key={rythme.valeur}
                    type="button"
                    onClick={() => setRecurrence(rythme.valeur)}
                    aria-pressed={actif}
                    className={`${pastille} ${actif ? 'bg-brand-50 text-accent ring-brand-300' : 'bg-surface text-sand-600 ring-sand-300'}`}
                  >
                    {rythme.libelle}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3 ring-1 ring-sand-200">
            <span className="text-sm font-medium text-sand-700">Prochaine fois</span>
            <input
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
              required
              className="min-h-10 rounded-lg bg-sand-50 px-3 text-sand-800 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>

          {tache?.lastDoneOn && (
            <p className="text-sm text-sand-500">
              Dernier passage&nbsp;: {new Date(`${tache.lastDoneOn}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">Qui s'en occupe&nbsp;?</p>
            <div className="flex flex-wrap gap-2">
              {choixPersonnes.map((personne) => {
                const actif = assigneeId === personne.id;
                const couleur = couleurPersonne(personne.id);
                return (
                  <button
                    key={personne.id ?? 'quiconque'}
                    type="button"
                    onClick={() => setAssigneeId(personne.id)}
                    aria-pressed={actif}
                    className={`${pastille} ${actif ? `${couleur.fond} ${couleur.texte} ${couleur.bordure}` : 'bg-surface text-sand-600 ring-sand-300'}`}
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
            placeholder="Note (référence du filtre, numéro du chauffagiste…)"
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
            <>
              {/* Repousser sans prétendre que c'est fait : sans cette porte de
                  sortie, on finit par cocher pour faire taire la ligne, et le
                  planning ne veut plus rien dire. */}
              <div className="border-t border-sand-200 pt-4">
                <p className="mb-2 text-sm font-medium text-sand-700">Pas maintenant</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { jours: 7, libelle: 'Dans une semaine' },
                    { jours: 30, libelle: 'Dans un mois' },
                  ].map((choix) => (
                    <Button
                      key={choix.jours}
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        onRepousser(choix.jours);
                        onClose();
                      }}
                    >
                      {choix.libelle}
                    </Button>
                  ))}
                </div>
              </div>

              {confirmationSuppression ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      onDelete();
                      onClose();
                    }}
                  >
                    Retirer du planning
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmationSuppression(false)}>
                    Annuler
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmationSuppression(true)}
                  className="w-full text-danger"
                >
                  Retirer du planning
                </Button>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
