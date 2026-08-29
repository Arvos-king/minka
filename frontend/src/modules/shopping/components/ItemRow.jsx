import { CheckIcon, MinusIcon, PlusIcon, TrashIcon } from '../../../components/icons.jsx';
import { useAppuiLong } from '../useAppuiLong.js';

/**
 * Une ligne de la liste.
 *
 * La case à cocher et le nom forment un seul bouton occupant toute la largeur
 * disponible : c'est une cible facile à viser au pouce, en marchant, d'une
 * main. Les commandes de quantité restent à part pour éviter de cocher un
 * article en voulant l'incrémenter.
 *
 * Le rayon ne s'affiche pas sur la ligne — c'est la section qui le porte — et
 * se corrige par un appui long, qui n'ajoute rien à l'écran et laisse la grande
 * cible intacte. `onRanger` n'est fourni que pour les articles à acheter :
 * « Déjà pris » étant à plat, y changer un rayon ne produirait aucun effet
 * visible et le geste passerait pour cassé.
 */
export function ItemRow({ item, onToggle, onChangeQuantity, onRemove, onRanger }) {
  const { completed, name, quantity, pending } = item;

  const gestes = useAppuiLong({
    onClic: () => onToggle(item),
    onAppuiLong: onRanger ? () => onRanger(item) : undefined,
  });

  return (
    <li
      className={[
        // `relative` porte le bouton de rangement, qui se dessine par-dessus la
        // ligne quand on l'atteint au clavier.
        'relative flex items-center rounded-2xl bg-surface ring-1 transition',
        completed ? 'ring-sand-200/70' : 'ring-sand-200',
        // Un article en cours d'envoi s'affiche légèrement estompé : l'action
        // est prise en compte, mais pas encore confirmée par le serveur.
        pending ? 'opacity-60' : '',
      ].join(' ')}
    >
      <button
        type="button"
        {...gestes}
        className="flex min-h-14 flex-1 items-center gap-3 rounded-l-2xl py-2 pl-3 text-left select-none active:bg-sand-50"
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

      {/*
        Un appui long n'existe ni au clavier ni au lecteur d'écran. Ce bouton
        est le même geste sous une forme atteignable par tabulation : invisible
        au repos, il ne se dessine qu'une fois focalisé, et se pose alors
        par-dessus la ligne sans en repousser le contenu. La cible de tap reste
        entière, et la ligne n'a toujours pas d'étiquette permanente.
      */}
      {onRanger && (
        <button
          type="button"
          onClick={() => onRanger(item)}
          className="sr-only focus:not-sr-only focus:absolute focus:inset-y-1 focus:right-2 focus:z-10 focus:grid focus:place-items-center focus:rounded-lg focus:bg-surface-haute focus:px-3 focus:text-sm focus:font-medium focus:text-sand-700 focus:ring-2 focus:ring-brand-500"
        >
          Ranger dans un rayon
        </button>
      )}

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
