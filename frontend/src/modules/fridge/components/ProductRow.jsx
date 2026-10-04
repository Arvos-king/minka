import { useState } from 'react';

import { CartIcon, CheckIcon, MinusIcon, PlusIcon, TrashIcon } from '../../../components/icons.jsx';
import { STYLES_BADGE, statutPeremption } from '../expiry.js';
import { T } from '../textes.js';

/**
 * Un produit du frigo.
 *
 * La ligne reste compacte — nom, échéance, quantité — et un tap déplie les
 * actions secondaires. Tout afficher en permanence saturerait la largeur d'un
 * téléphone et rendrait chaque cible plus difficile à viser.
 */
export function ProductRow({ item, onChangeQuantity, onChangeExpiry, onRemove, onAddToShoppingList }) {
  const [ouvert, setOuvert] = useState(false);
  const [envoyeAuxCourses, setEnvoyeAuxCourses] = useState(false);

  const statut = statutPeremption(item.expiresOn);

  async function envoyerAuxCourses() {
    try {
      await onAddToShoppingList(item.name);
      setEnvoyeAuxCourses(true);
      // Confirmation brève : le bouton reprend son état initial ensuite.
      setTimeout(() => setEnvoyeAuxCourses(false), 2500);
    } catch {
      // L'erreur est déjà remontée à la page par le hook.
    }
  }

  return (
    <li
      className={[
        'rounded-2xl bg-surface ring-1 transition',
        statut.niveau === 'perime' ? 'ring-red-200' : 'ring-sand-200',
        item.pending ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOuvert((valeur) => !valeur)}
          className="flex min-h-14 flex-1 items-center gap-2 rounded-l-2xl py-2 pl-3 text-left active:bg-sand-50"
          aria-expanded={ouvert}
        >
          <span className="min-w-0 flex-1 break-words text-sand-900">{item.name}</span>

          {statut.libelle && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STYLES_BADGE[statut.niveau]}`}
            >
              {statut.libelle}
            </span>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-0.5 pr-1.5 pl-1">
          <button
            type="button"
            // À 1, réduire revient à sortir le produit du frigo : c'est le
            // geste qu'on fait en le consommant.
            onClick={() => (item.quantity > 1 ? onChangeQuantity(item, -1) : onRemove(item))}
            aria-label={item.quantity > 1 ? T.ligne.reduire(item.name) : T.ligne.retirer(item.name)}
            className="grid size-9 place-items-center rounded-lg text-sand-500 active:bg-sand-100"
          >
            {item.quantity > 1 ? <MinusIcon className="size-4" /> : <TrashIcon className="size-4" />}
          </button>

          <span
            className="w-6 text-center text-sm font-medium tabular-nums text-sand-700"
            aria-label={T.ligne.quantite(item.quantity)}
          >
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() => onChangeQuantity(item, 1)}
            aria-label={T.ligne.augmenter(item.name)}
            className="grid size-9 place-items-center rounded-lg text-sand-500 active:bg-sand-100"
          >
            <PlusIcon className="size-4" />
          </button>
        </div>
      </div>

      {ouvert && (
        <div className="flex flex-wrap items-center gap-2 border-t border-sand-100 px-3 py-3">
          <input
            type="date"
            value={item.expiresOn ?? ''}
            onChange={(event) => onChangeExpiry(item, event.target.value || null)}
            aria-label={T.ligne.datePeremption(item.name)}
            className="min-h-10 rounded-lg bg-surface px-3 text-sm text-sand-700 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-500"
          />

          {item.expiresOn && (
            <button
              type="button"
              onClick={() => onChangeExpiry(item, null)}
              className="min-h-10 rounded-lg px-3 text-sm font-medium text-sand-600 active:bg-sand-100"
            >
              {T.ligne.retirerLaDate}
            </button>
          )}

          {/* N'apparaît que si le module courses répond côté serveur. */}
          {onAddToShoppingList && (
            <button
              type="button"
              onClick={envoyerAuxCourses}
              disabled={envoyeAuxCourses}
              className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-50 px-3 text-sm font-medium text-accent active:bg-brand-100"
            >
              {envoyeAuxCourses ? (
                <>
                  <CheckIcon className="size-4" />
                  {T.ligne.ajoute}
                </>
              ) : (
                <>
                  <CartIcon className="size-4" />
                  {T.ligne.auxCourses}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
