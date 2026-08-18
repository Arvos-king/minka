import { useCallback } from 'react';

import { useCollection } from '../../lib/useCollection.js';
import { fridgeApi } from './api.js';

/**
 * État du contenu du frigo.
 *
 * Le cycle commun vient de `useCollection`. La particularité du module tient en
 * une phrase : **le classement appartient au serveur**, qui trie par échéance
 * la plus proche. Toute action qui touche à une date se conclut donc par un
 * rechargement silencieux, sans quoi le produit resterait au mauvais rang
 * jusqu'au prochain passage sur la page.
 */
export function useFridge() {
  const charger = useCallback(async () => {
    const data = await fridgeApi.list();
    return { elements: data.items };
  }, []);

  const appelQuantite = useCallback(async (id, quantity) => {
    const data = await fridgeApi.update(id, { quantity });
    return { element: data.item };
  }, []);

  const {
    elements: items,
    status,
    error,
    dismissError,
    refresh,
    ajouter,
    modifier,
    retirer,
    changerQuantite,
  } = useCollection(charger, { appelQuantite });

  const addItem = useCallback(
    async ({ name, expiresOn }) => {
      const reponse = await ajouter({ name, quantity: 1, expiresOn }, async () => {
        const data = await fridgeApi.create({ name, expiresOn });
        return { element: data.item };
      });

      await refresh({ silent: true });
      return reponse?.element;
    },
    [ajouter, refresh],
  );

  /** Change ou retire la date de péremption (`null` la retire). */
  const changeExpiry = useCallback(
    async (item, expiresOn) => {
      const reponse = await modifier(item, { expiresOn }, async () => {
        const data = await fridgeApi.update(item.id, { expiresOn });
        return { element: data.item };
      });

      if (reponse) await refresh({ silent: true });
    },
    [modifier, refresh],
  );

  const removeItem = useCallback(
    (item) => retirer(item, () => fridgeApi.remove(item.id)),
    [retirer],
  );

  return {
    items,
    status,
    error,
    dismissError,
    addItem,
    changeQuantity: changerQuantite,
    changeExpiry,
    removeItem,
  };
}
