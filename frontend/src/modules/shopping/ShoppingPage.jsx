import { useState } from 'react';

import { CartIcon, ChevronDownIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { AddItemForm } from './components/AddItemForm.jsx';
import { ItemRow } from './components/ItemRow.jsx';
import { useShoppingList } from './useShoppingList.js';

export function ShoppingPage() {
  const {
    items,
    counts,
    status,
    error,
    dismissError,
    addItem,
    toggleItem,
    changeQuantity,
    removeItem,
    purgeCompleted,
  } = useShoppingList();

  const [showCompleted, setShowCompleted] = useState(false);
  // Confirmation en deux temps sur le même bouton : moins intrusif qu'une
  // fenêtre modale, et sans risque de purger la liste d'un tap malheureux.
  const [confirmingPurge, setConfirmingPurge] = useState(false);

  const pending = items.filter((item) => !item.completed);
  const completed = items.filter((item) => item.completed);

  const rowProps = {
    onToggle: toggleItem,
    onChangeQuantity: changeQuantity,
    onRemove: removeItem,
  };

  return (
    // Réserve la place du champ d'ajout, qui flotte au-dessus de la liste.
    <div className="pb-28">
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3">
          <p className="flex-1 text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={dismissError}
            className="text-sm font-medium text-danger underline"
          >
            Fermer
          </button>
        </div>
      )}

      {status === 'loading' && <p className="py-10 text-center text-sm text-sand-500">Chargement…</p>}

      {status === 'ready' && (
        <>
          <p className="mb-3 text-sm font-medium text-sand-600">
            {counts.pending === 0
              ? 'Rien à acheter'
              : `${counts.pending} article${counts.pending > 1 ? 's' : ''} à acheter`}
          </p>

          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sand-300 px-6 py-12 text-center">
              <CartIcon className="mx-auto size-8 text-sand-400" />
              <p className="mt-3 text-sm font-medium text-sand-700">La liste est vide</p>
              <p className="mt-1 text-sm text-sand-500">
                Ajoute un article avec le champ en bas de l'écran.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {pending.map((item) => (
                <ItemRow key={item.id} item={item} {...rowProps} />
              ))}
            </ul>
          )}

          {completed.length > 0 && (
            <section className="mt-8">
              <button
                type="button"
                onClick={() => setShowCompleted((value) => !value)}
                className="flex min-h-11 w-full items-center gap-2 text-sm font-medium text-sand-600"
                aria-expanded={showCompleted}
              >
                <ChevronDownIcon
                  className={`size-4 transition-transform ${showCompleted ? '' : '-rotate-90'}`}
                />
                Déjà pris ({completed.length})
              </button>

              {showCompleted && (
                <>
                  <ul className="mt-2 space-y-2">
                    {completed.map((item) => (
                      <ItemRow key={item.id} item={item} {...rowProps} />
                    ))}
                  </ul>

                  <div className="mt-4">
                    {confirmingPurge ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            purgeCompleted();
                            setConfirmingPurge(false);
                            setShowCompleted(false);
                          }}
                        >
                          {completed.length > 1
                            ? `Supprimer les ${completed.length} articles`
                            : "Supprimer l'article"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmingPurge(false)}>
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setConfirmingPurge(true)}>
                        Vider les articles achetés
                      </Button>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}

      <AddItemForm onAdd={addItem} />
    </div>
  );
}
