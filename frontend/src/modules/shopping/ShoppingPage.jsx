import { useState } from 'react';

import { CartIcon, ChevronDownIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { AddItemForm } from './components/AddItemForm.jsx';
import { ItemRow } from './components/ItemRow.jsx';
import { RayonSheet } from './components/RayonSheet.jsx';
import { grouperParRayon } from './rayons.js';
import { useShoppingList } from './useShoppingList.js';

export function ShoppingPage() {
  const {
    items,
    rayons,
    counts,
    status,
    error,
    dismissError,
    addItem,
    toggleItem,
    changeQuantity,
    removeItem,
    rangerItem,
    purgeCompleted,
  } = useShoppingList();

  const [showCompleted, setShowCompleted] = useState(false);
  // Confirmation en deux temps sur le même bouton : moins intrusif qu'une
  // fenêtre modale, et sans risque de purger la liste d'un tap malheureux.
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const [aRanger, setARanger] = useState(null);

  const pending = items.filter((item) => !item.completed);
  const completed = items.filter((item) => item.completed);
  // Recalculé à chaque rendu, jamais mémorisé : une trentaine d'articles et une
  // passe de Map, contre un tableau de dépendances de plus à tenir juste.
  const sections = grouperParRayon(pending, rayons);

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
            <>
              {sections.map((section) => (
                <section key={section.cle ?? 'tous'} className="mb-5">
                  {section.libelle && (
                    // `top-14` : sous l'en-tête de l'application, qui fait cette
                    // hauteur. `-mx-4` annule la marge du contenu, pour que le
                    // titre collant occupe toute la largeur.
                    <h2 className="sticky top-14 z-10 -mx-4 bg-fond/95 px-4 py-1.5 text-sm font-semibold text-sand-600 backdrop-blur">
                      {section.libelle}
                    </h2>
                  )}
                  <ul className="mt-1 space-y-2">
                    {section.articles.map((item) => (
                      <ItemRow key={item.id} item={item} {...rowProps} onRanger={setARanger} />
                    ))}
                  </ul>
                </section>
              ))}

              {/*
                En bas, et non en tête : c'est en parcourant la liste qu'on
                remarque un article égaré, et le haut de l'écran appartient au
                décompte.
              */}
              <p className="mb-6 text-xs text-sand-500">
                Mal rangé&nbsp;? Appuie longuement sur l'article pour changer son rayon.
              </p>
            </>
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

      {aRanger && (
        <RayonSheet
          item={aRanger}
          rayons={rayons}
          onRanger={(rayon) => rangerItem(aRanger, rayon)}
          onClose={() => setARanger(null)}
        />
      )}
    </div>
  );
}
