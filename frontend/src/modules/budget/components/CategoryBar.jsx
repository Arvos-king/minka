import { formaterMontantCourt, partConsommee } from '../montants.js';

/**
 * Une catégorie et sa consommation du mois.
 *
 * La barre ne sert qu'aux catégories qui se sont fixé un plafond ; les autres
 * affichent leur total sans jauge, ce qui est souvent tout ce qu'on demande —
 * savoir ce qu'on a mis dans les restaurants, sans se donner de limite.
 */
export function CategoryBar({ label, spentCents, budgetCents, onOuvrir }) {
  const part = partConsommee(spentCents, budgetCents);
  const depasse = budgetCents != null && spentCents > budgetCents;

  const contenu = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-sand-800">{label}</span>
        <span className={`shrink-0 text-sm tabular-nums ${depasse ? 'text-danger' : 'text-sand-600'}`}>
          {formaterMontantCourt(spentCents)}
          {budgetCents != null && (
            <span className="text-sand-400"> / {formaterMontantCourt(budgetCents)}</span>
          )}
        </span>
      </div>

      {part !== null && (
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand-200"
          role="progressbar"
          aria-valuenow={Math.round(part * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} : ${Math.round(part * 100)} % du plafond`}
        >
          <div
            className={`h-full rounded-full transition-all ${depasse ? 'bg-red-500' : 'bg-brand-500'}`}
            style={{ width: `${part * 100}%` }}
          />
        </div>
      )}
    </>
  );

  if (!onOuvrir) return <li className="rounded-xl bg-surface px-4 py-3 ring-1 ring-sand-200">{contenu}</li>;

  return (
    <li>
      <button
        type="button"
        onClick={onOuvrir}
        className="w-full rounded-xl bg-surface px-4 py-3 text-left ring-1 ring-sand-200 active:bg-sand-50"
      >
        {contenu}
      </button>
    </li>
  );
}
