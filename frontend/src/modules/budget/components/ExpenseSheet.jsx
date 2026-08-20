import { useEffect, useRef, useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { couleurPersonne } from '../../../lib/people.js';
import { analyserMontant, formaterMontant } from '../montants.js';

/**
 * Détail d'une dépense, glissé depuis le bas.
 *
 * Le formulaire d'ajout ne demande que le montant et le libellé ; c'est ici
 * qu'on précise le reste, quand on en a le temps — ou jamais, une dépense sans
 * catégorie restant une dépense comptée.
 */
export function ExpenseSheet({ expense, categories, people, onSave, onDelete, onClose }) {
  const [montant, setMontant] = useState(() =>
    formaterMontant(expense.amountCents).replace(/[^\d,]/g, ''),
  );
  const [label, setLabel] = useState(expense.label);
  const [spentOn, setSpentOn] = useState(expense.spentOn);
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [personId, setPersonId] = useState(expense.personId);

  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const champLibelle = useRef(null);

  useEffect(() => {
    champLibelle.current?.focus();
  }, []);

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  const centimes = analyserMontant(montant);

  async function soumettre(evenement) {
    evenement.preventDefault();
    if (centimes === null || centimes <= 0) {
      setErreur('Ce montant ne se lit pas.');
      return;
    }

    setErreur(null);
    setEnregistrement(true);
    try {
      await onSave({ label: label.trim(), amountCents: centimes, spentOn, categoryId, personId });
      onClose();
    } catch (apiError) {
      setErreur(apiError.details?.[0]?.message ?? apiError.message);
      setEnregistrement(false);
    }
  }

  const choixPersonnes = [{ id: null, displayName: 'Le foyer' }, ...people];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-voile" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Modifier la dépense"
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">Modifier la dépense</h2>

        <form onSubmit={soumettre} className="mt-4 space-y-4 pb-4">
          <div className="flex gap-2">
            <input
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              aria-label="Montant"
              inputMode="decimal"
              required
              className="min-h-12 w-28 shrink-0 rounded-xl bg-surface px-3 text-right tabular-nums ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              ref={champLibelle}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              aria-label="Ce que c'était"
              required
              maxLength={120}
              className="min-h-12 min-w-0 flex-1 rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3 ring-1 ring-sand-200">
            <span className="text-sm font-medium text-sand-700">Date</span>
            <input
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              required
              className="min-h-10 rounded-lg bg-sand-50 px-3 text-sand-800 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">Catégorie</p>
            <div className="flex flex-wrap gap-2">
              {[{ id: null, label: 'Sans catégorie' }, ...categories].map((categorie) => {
                const actif = categoryId === categorie.id;
                return (
                  <button
                    key={categorie.id ?? 'aucune'}
                    type="button"
                    onClick={() => setCategoryId(categorie.id)}
                    aria-pressed={actif}
                    className={[
                      'inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium ring-1 transition',
                      actif
                        ? 'bg-brand-50 text-accent ring-brand-300'
                        : 'bg-surface text-sand-600 ring-sand-300',
                    ].join(' ')}
                  >
                    {categorie.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">Qui a payé&nbsp;?</p>
            <div className="flex flex-wrap gap-2">
              {choixPersonnes.map((personne) => {
                const actif = personId === personne.id;
                const couleur = couleurPersonne(personne.id);
                return (
                  <button
                    key={personne.id ?? 'foyer'}
                    type="button"
                    onClick={() => setPersonId(personne.id)}
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

          {confirmationSuppression ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => {
                  onDelete(expense);
                  onClose();
                }}
              >
                Supprimer la dépense
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
              Supprimer la dépense
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
