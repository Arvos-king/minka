import { useServerModule } from '../../lib/serverModules.js';
import { AddProductForm } from './components/AddProductForm.jsx';
import { ProductRow } from './components/ProductRow.jsx';
import { fridgeApi } from './api.js';
import { FridgeIcon } from './FridgeIcon.jsx';
import { statutPeremption } from './expiry.js';
import { useFridge } from './useFridge.js';

export function FridgePage() {
  const { items, status, error, dismissError, addItem, changeQuantity, changeExpiry, removeItem } =
    useFridge();

  // Le module courses est-il monté côté API ? Le lien entre les deux modules
  // se limite à ce test et à un appel HTTP : aucun code partagé.
  const coursesDisponibles = useServerModule('shopping');

  const urgents = items.filter((item) => {
    const niveau = statutPeremption(item.expiresOn).niveau;
    return niveau === 'perime' || niveau === 'aujourdhui' || niveau === 'bientot';
  });
  const perimes = urgents.filter((item) => statutPeremption(item.expiresOn).niveau === 'perime');

  return (
    <div className="pb-28">
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3">
          <p className="flex-1 text-sm text-danger">{error}</p>
          <button type="button" onClick={dismissError} className="text-sm font-medium text-danger underline">
            Fermer
          </button>
        </div>
      )}

      {status === 'loading' && <p className="py-10 text-center text-sm text-sand-500">Chargement…</p>}

      {status === 'ready' && (
        <>
          {/* Raison d'être du module : ce qu'il faut manger en priorité. */}
          {urgents.length > 0 && (
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-sm ${
                perimes.length > 0 ? 'bg-red-50 text-danger' : 'bg-amber-50 text-amber-900'
              }`}
            >
              {perimes.length > 0 && (
                <p className="font-medium">
                  {perimes.length === 1
                    ? '1 produit est périmé'
                    : `${perimes.length} produits sont périmés`}
                </p>
              )}
              {urgents.length > perimes.length && (
                <p className={perimes.length > 0 ? 'mt-0.5' : 'font-medium'}>
                  {urgents.length - perimes.length === 1
                    ? '1 produit est à consommer rapidement'
                    : `${urgents.length - perimes.length} produits sont à consommer rapidement`}
                </p>
              )}
            </div>
          )}

          <p className="mb-3 text-sm font-medium text-sand-600">
            {items.length === 0
              ? 'Frigo vide'
              : `${items.length} produit${items.length > 1 ? 's' : ''}`}
          </p>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sand-300 px-6 py-12 text-center">
              <FridgeIcon className="mx-auto size-8 text-sand-400" />
              <p className="mt-3 text-sm font-medium text-sand-700">Rien dans le frigo</p>
              <p className="mt-1 text-sm text-sand-500">
                Ajoute un produit avec le champ en bas de l'écran.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <ProductRow
                  key={item.id}
                  item={item}
                  onChangeQuantity={changeQuantity}
                  onChangeExpiry={changeExpiry}
                  onRemove={removeItem}
                  onAddToShoppingList={coursesDisponibles ? fridgeApi.ajouterAuxCourses : null}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <AddProductForm onAdd={addItem} />
    </div>
  );
}
