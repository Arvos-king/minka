import { useState } from 'react';

import { ChevronRightIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { aujourdhui } from '../../lib/dates.js';
import { usePeople } from '../../lib/people.js';
import { T as SOCLE } from '../../textes.js';
import { BudgetIcon } from './BudgetIcon.jsx';
import { AddExpenseForm } from './components/AddExpenseForm.jsx';
import { CategoryBar } from './components/CategoryBar.jsx';
import { CategorySheet } from './components/CategorySheet.jsx';
import { ExpenseRow } from './components/ExpenseRow.jsx';
import { ExpenseSheet } from './components/ExpenseSheet.jsx';
import { libelleMois } from './mois.js';
import { formaterMontantCourt } from './montants.js';
import { T } from './textes.js';
import { useBudget } from './useBudget.js';

export function BudgetPage() {
  const {
    debut,
    fin,
    moisPrecedent,
    moisSuivant,
    revenirAuMoisCourant,
    expenses,
    totals,
    categories,
    status,
    error,
    dismissError,
    ajouterDepense,
    modifierDepense,
    supprimerDepense,
    enregistrerCategorie,
    supprimerCategorie,
  } = useBudget();

  const { people } = usePeople();

  const [depenseOuverte, setDepenseOuverte] = useState(null);
  const [categoriesOuvertes, setCategoriesOuvertes] = useState(false);

  const ceJour = aujourdhui();
  const moisCourant = ceJour >= debut && ceJour <= fin;

  /** Total par catégorie, indexé pour un accès direct. `null` = sans étiquette. */
  const parCategorie = new Map(totals.byCategory.map((l) => [l.categoryId, l.spentCents]));
  const sansCategorie = parCategorie.get(null) ?? 0;

  return (
    <div className="pb-28">
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3">
          <p className="flex-1 text-sm text-danger">{error}</p>
          <button type="button" onClick={dismissError} className="text-sm font-medium text-danger underline">
            {SOCLE.commun.fermer}
          </button>
        </div>
      )}

      {/* Navigation entre mois, comme la semaine des menus : les flèches
          encadrent le libellé et restent loin l'une de l'autre. */}
      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          onClick={moisPrecedent}
          aria-label={T.moisPrecedent}
          className="grid size-11 shrink-0 place-items-center rounded-full text-sand-600 active:bg-sand-200"
        >
          <ChevronRightIcon className="size-5 rotate-180" />
        </button>

        <p className="flex-1 text-center font-titre text-lg font-medium text-sand-900 first-letter:uppercase">
          {libelleMois(debut)}
        </p>

        <button
          type="button"
          onClick={moisSuivant}
          aria-label={T.moisSuivant}
          className="grid size-11 shrink-0 place-items-center rounded-full text-sand-600 active:bg-sand-200"
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>

      {!moisCourant && (
        <div className="mb-4 text-center">
          <Button size="sm" variant="secondary" onClick={revenirAuMoisCourant}>
            {T.revenirAuMoisCourant}
          </Button>
        </div>
      )}

      {status === 'loading' && <p className="py-10 text-center text-sm text-sand-500">{SOCLE.chargement}</p>}

      {status === 'ready' && (
        <>
          {/* Le chiffre qu'on vient chercher, avant tout le reste. */}
          <p className="mb-1 text-center text-3xl font-medium tabular-nums text-sand-900">
            {formaterMontantCourt(totals.spentCents)}
          </p>
          <p className="mb-5 text-center text-sm text-sand-500">
            {expenses.length === 0 ? T.aucuneDepense : T.depenses(expenses.length)}
          </p>

          <section className="mb-6">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-medium text-sand-600">{T.parCategorie}</h2>
              <button
                type="button"
                onClick={() => setCategoriesOuvertes(true)}
                className="min-h-9 text-sm font-medium text-accent"
              >
                {SOCLE.commun.gerer}
              </button>
            </div>

            {categories.length === 0 && sansCategorie === 0 ? (
              <p className="rounded-xl border border-dashed border-brand-300 bg-linear-to-b from-brand-50 to-peche-50 px-4 py-6 text-center text-sm text-sand-500">
                {T.aucuneCategorie}
              </p>
            ) : (
              <ul className="space-y-2">
                {categories.map((categorie) => (
                  <CategoryBar
                    key={categorie.id}
                    label={categorie.label}
                    spentCents={parCategorie.get(categorie.id) ?? 0}
                    budgetCents={categorie.monthlyBudgetCents}
                  />
                ))}
                {sansCategorie > 0 && (
                  <CategoryBar label={T.sansCategorie} spentCents={sansCategorie} budgetCents={null} />
                )}
              </ul>
            )}
          </section>
        </>
      )}

      {status === 'ready' && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-sand-600">{T.leDetail}</h2>

          {expenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-300 bg-linear-to-b from-brand-50 to-peche-50 px-6 py-12 text-center">
              <BudgetIcon className="mx-auto size-8 text-brand-500" />
              <p className="mt-3 text-sm font-medium text-sand-700">{T.rienDeNote}</p>
              <p className="mt-1 text-sm text-sand-500">{T.aideAjout}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  people={people}
                  onOuvrir={setDepenseOuverte}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <AddExpenseForm onAdd={ajouterDepense} moisAffiche={debut} moisCourant={moisCourant} />

      {depenseOuverte && (
        <ExpenseSheet
          expense={depenseOuverte}
          categories={categories}
          people={people}
          onSave={(champs) => modifierDepense(depenseOuverte, champs)}
          onDelete={supprimerDepense}
          onClose={() => setDepenseOuverte(null)}
        />
      )}

      {categoriesOuvertes && (
        <CategorySheet
          categories={categories}
          depensesParCategorie={parCategorie}
          onSave={enregistrerCategorie}
          onDelete={supprimerCategorie}
          onClose={() => setCategoriesOuvertes(false)}
        />
      )}
    </div>
  );
}
