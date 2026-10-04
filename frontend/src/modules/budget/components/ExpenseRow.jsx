import { formateurDate } from '../../../lib/langue.js';
import { couleurPersonne, nomPersonne } from '../../../lib/people.js';
import { formaterMontant } from '../montants.js';

const formatJour = formateurDate({ day: 'numeric', month: 'short' });

/**
 * Une ligne de dépense.
 *
 * Le montant garde toujours ses centimes : c'est un relevé, on doit pouvoir y
 * retrouver la somme exacte d'un ticket.
 */
export function ExpenseRow({ expense, people, onOuvrir }) {
  const { label, amountCents, spentOn, categoryLabel, personId, pending } = expense;
  const couleur = couleurPersonne(personId);

  return (
    <li className={`rounded-2xl bg-surface ring-1 ring-sand-200 ${pending ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={() => onOuvrir(expense)}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-2 text-left active:bg-sand-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sand-900">{label}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-sand-500">
            <span>{formatJour.format(new Date(`${spentOn}T12:00:00`))}</span>
            {categoryLabel && <span>· {categoryLabel}</span>}
            {personId != null && (
              <span className="inline-flex items-center gap-1">
                ·<span className={`size-2 rounded-full ${couleur.pastille}`} aria-hidden="true" />
                {nomPersonne(personId, people)}
              </span>
            )}
          </span>
        </span>

        <span className="shrink-0 font-medium tabular-nums text-sand-900">
          {formaterMontant(amountCents)}
        </span>
      </button>
    </li>
  );
}
