import { useEffect, useRef, useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { aujourdhui } from '../../../lib/dates.js';
import { formateurDate } from '../../../lib/langue.js';
import { couleurPersonne } from '../../../lib/people.js';
import { T as SOCLE } from '../../../textes.js';
import { RYTHMES } from '../echeances.js';
import { T } from '../textes.js';

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

  const choixPersonnes = [{ id: null, displayName: T.feuille.quiVeut }, ...people];
  const pastille =
    'inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1 transition';

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
        aria-label={enEdition ? T.feuille.regler : T.feuille.nouvelle}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">
          {enEdition ? T.feuille.regler : T.feuille.nouvelle}
        </h2>

        <form onSubmit={soumettre} className="mt-4 space-y-4 pb-4">
          <input
            ref={champLabel}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={T.feuille.placeholder}
            aria-label={T.feuille.aFaire}
            required
            maxLength={160}
            className="min-h-12 w-full rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
          />

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">{T.feuille.piece}</p>
            <div className="flex flex-wrap gap-2">
              {[{ id: null, label: T.touteLaMaison }, ...zones].map((zone) => {
                const actif = zoneId === zone.id;
                return (
                  <button
                    key={zone.id ?? 'maison'}
                    type="button"
                    onClick={() => setZoneId(zone.id)}
                    aria-pressed={actif}
                    className={`${pastille} ${actif ? 'bg-brand-100 text-accent ring-brand-300' : 'bg-surface text-sand-600 ring-sand-300'}`}
                  >
                    {zone.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">{T.feuille.rythme}</p>
            <div className="flex flex-wrap gap-2">
              {RYTHMES.map((rythme) => {
                const actif = recurrence === rythme.valeur;
                return (
                  <button
                    key={rythme.valeur}
                    type="button"
                    onClick={() => setRecurrence(rythme.valeur)}
                    aria-pressed={actif}
                    className={`${pastille} ${actif ? 'bg-brand-100 text-accent ring-brand-300' : 'bg-surface text-sand-600 ring-sand-300'}`}
                  >
                    {rythme.libelle}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3 ring-1 ring-sand-200">
            <span className="text-sm font-medium text-sand-700">{T.feuille.prochaineFois}</span>
            <input
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
              required
              className="min-h-10 rounded-lg bg-sand-50 px-3 text-sand-800 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-600"
            />
          </label>

          {tache?.lastDoneOn && (
            <p className="text-sm text-sand-500">
              {T.feuille.dernierPassage(
                formateurDate({ day: 'numeric', month: 'long', year: 'numeric' }).format(
                  new Date(`${tache.lastDoneOn}T12:00:00`),
                ),
              )}
            </p>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">{T.feuille.quiSEnOccupe}</p>
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
            placeholder={T.feuille.notePlaceholder}
            aria-label={SOCLE.commun.note}
            rows={2}
            maxLength={500}
            className="w-full rounded-xl bg-surface px-4 py-3 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
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
            <>
              {/* Repousser sans prétendre que c'est fait : sans cette porte de
                  sortie, on finit par cocher pour faire taire la ligne, et le
                  planning ne veut plus rien dire. */}
              <div className="border-t border-sand-200 pt-4">
                <p className="mb-2 text-sm font-medium text-sand-700">{T.feuille.pasMaintenant}</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { jours: 7, libelle: T.feuille.dansUneSemaine },
                    { jours: 30, libelle: T.feuille.dansUnMois },
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
                    {T.feuille.retirer}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmationSuppression(false)}>
                    {SOCLE.commun.annuler}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmationSuppression(true)}
                  className="w-full text-danger"
                >
                  {T.feuille.retirer}
                </Button>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
