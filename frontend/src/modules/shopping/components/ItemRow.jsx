import { CheckIcon, MinusIcon, PlusIcon, TrashIcon } from '../../../components/icons.jsx';

/**
 * Une ligne de la liste.
 *
 * La case à cocher et le nom forment un seul bouton occupant toute la largeur
 * disponible : c'est une cible facile à viser au pouce, en marchant, d'une
 * main. Les commandes de quantité restent à part pour éviter de cocher un
 * article en voulant l'incrémenter.
 */
export function ItemRow({ item, onToggle, onChangeQuantity, onRemove }) {
  const { completed, name, quantity, pending } = item;

  return (
    <li
      className={[
        'flex items-center rounded-2xl bg-white ring-1 transition',
        completed ? 'ring-sand-200/70' : 'ring-sand-200',
        // Un article en cours d'envoi s'affiche légèrement estompé : l'action
        // est prise en compte, mais pas encore confirmée par le serveur.
        pending ? 'opacity-60' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onToggle(item)}
        className="flex min-h-14 flex-1 items-center gap-3 rounded-l-2xl py-2 pl-3 text-left active:bg-sand-50"
        aria-pressed={completed}
      >
        <span
          className={[
            'grid size-6 shrink-0 place-items-center rounded-full border-2 transition',
            completed ? 'border-brand-600 bg-brand-600 text-white' : 'border-sand-300',
          ].join(' ')}
          aria-hidden="true"
        >
          {completed && <CheckIcon className="size-4" strokeWidth={3} />}
        </span>

        <span
          className={[
            'min-w-0 flex-1 break-words',
            completed ? 'text-sand-400 line-through' : 'text-sand-900',
          ].join(' ')}
        >
          {name}
          {completed && quantity > 1 && <span className="ml-1.5 text-sm">×{quantity}</span>}
        </span>
      </button>

      {completed ? (
        <button
          type="button"
          onClick={() => onRemove(item)}
          aria-label={`Supprimer ${name}`}
          className="grid size-12 shrink-0 place-items-center rounded-r-2xl text-sand-400 active:bg-sand-100"
        >
          <TrashIcon className="size-5" />
        </button>
      ) : (
        <div className="flex shrink-0 items-center gap-0.5 pr-1.5 pl-1">
          <button
            type="button"
            onClick={() => (quantity > 1 ? onChangeQuantity(item, -1) : onRemove(item))}
            // À 1, le bouton « moins » supprime l'article : c'est le geste
            // naturel pour corriger un ajout de trop, sans encombrer la ligne
            // d'une corbeille supplémentaire.
            aria-label={quantity > 1 ? `Réduire la quantité de ${name}` : `Supprimer ${name}`}
            className="grid size-9 place-items-center rounded-lg text-sand-500 active:bg-sand-100"
          >
            {quantity > 1 ? <MinusIcon className="size-4" /> : <TrashIcon className="size-4" />}
          </button>

          <span
            className="w-6 text-center text-sm font-medium tabular-nums text-sand-700"
            aria-label={`Quantité : ${quantity}`}
          >
            {quantity}
          </span>

          <button
            type="button"
            onClick={() => onChangeQuantity(item, 1)}
            aria-label={`Augmenter la quantité de ${name}`}
            className="grid size-9 place-items-center rounded-lg text-sand-500 active:bg-sand-100"
          >
            <PlusIcon className="size-4" />
          </button>
        </div>
      )}
    </li>
  );
}
