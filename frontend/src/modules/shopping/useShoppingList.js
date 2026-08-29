import { useCallback, useState } from 'react';

import { useCollection } from '../../lib/useCollection.js';
import { shoppingApi } from './api.js';

/**
 * État de la liste de courses.
 *
 * Le cycle commun — chargement, erreur, rafraîchissement au retour, actions
 * optimistes avec restauration — vient de `useCollection`. Ne reste ici que ce
 * qui est propre aux courses : la traduction de la forme de l'API, et la tenue
 * des compteurs d'en-tête, qu'on ajuste sans attendre le serveur pour que le
 * décompte suive le geste.
 */
export function useShoppingList() {
  /*
   * Les rayons arrivent avec les articles, mais ne passent volontairement pas
   * par `extra` : `toggleItem` et `removeItem` reconstruisent `extra` de zéro
   * pour ajuster les compteurs, et les effaceraient au premier tap sur une
   * case, sans erreur ni trace. `extra`, ici, c'est exactement les compteurs.
   */
  const [rayons, setRayons] = useState([]);

  const charger = useCallback(async () => {
    const data = await shoppingApi.list();
    setRayons(data.rayons ?? []);
    return { elements: data.items, extra: data.counts };
  }, []);

  const appelQuantite = useCallback(async (id, quantity) => {
    const data = await shoppingApi.update(id, { quantity });
    return { element: data.item, extra: data.counts };
  }, []);

  const {
    elements: items,
    extra: counts,
    status,
    error,
    dismissError,
    refresh,
    setElements,
    setExtra,
    ajouter,
    modifier,
    retirer,
    retirerPlusieurs,
    changerQuantite,
  } = useCollection(charger, { appelQuantite });

  const addItem = useCallback(
    async (name, quantity = 1) => {
      setExtra((precedent) => ({ ...precedent, pending: precedent.pending + 1 }));

      try {
        return await ajouter(
          { name, quantity, completed: false, createdAt: new Date().toISOString() },
          async () => {
            const data = await shoppingApi.create(name, quantity);
            return { element: data.item, extra: data.counts };
          },
        );
      } catch (apiError) {
        setExtra((precedent) => ({ ...precedent, pending: precedent.pending - 1 }));
        // Relancée : le champ d'ajout rend sa saisie à l'utilisateur.
        throw apiError;
      }
    },
    [ajouter, setExtra],
  );

  const toggleItem = useCallback(
    (item) => {
      const completed = !item.completed;
      setExtra((precedent) => ({
        pending: precedent.pending + (completed ? -1 : 1),
        completed: precedent.completed + (completed ? 1 : -1),
      }));

      return modifier(
        item,
        { completed, completedAt: completed ? new Date().toISOString() : null },
        async () => {
          const data = await shoppingApi.update(item.id, { completed });
          return { element: data.item, extra: data.counts };
        },
      );
    },
    [modifier, setExtra],
  );

  const removeItem = useCallback(
    async (item) => {
      const retire = { pending: item.completed ? 0 : 1, completed: item.completed ? 1 : 0 };
      const ajuster = (signe) =>
        setExtra((precedent) => ({
          pending: precedent.pending + signe * retire.pending,
          completed: precedent.completed + signe * retire.completed,
        }));

      ajuster(-1);
      const reponse = await retirer(item, async () => ({
        extra: (await shoppingApi.remove(item.id)).counts,
      }));
      if (!reponse) ajuster(+1);
    },
    [retirer, setExtra],
  );

  const rangerItem = useCallback(
    async (item, rayon) => {
      const reponse = await modifier(item, { rayon }, async () => {
        const data = await shoppingApi.update(item.id, { rayon });
        return { element: data.item, extra: data.counts, autresRanges: data.autresRanges };
      });

      /*
       * Le serveur range d'un coup tous les articles du même produit, et retient
       * la correction. On suit son verdict, sinon deux lignes portant le même
       * nom resteraient dans deux rayons différents jusqu'au prochain
       * rafraîchissement.
       */
      const ranges = new Set(reponse?.autresRanges ?? []);
      if (ranges.size > 0) {
        setElements((precedents) =>
          precedents.map((element) =>
            ranges.has(element.id) ? { ...element, rayon } : element,
          ),
        );
      }
    },
    [modifier, setElements],
  );

  const purgeCompleted = useCallback(async () => {
    const avant = counts;
    setExtra((precedent) => ({ ...precedent, completed: 0 }));

    const reponse = await retirerPlusieurs(
      (item) => item.completed,
      async () => ({ extra: (await shoppingApi.purgeCompleted()).counts }),
    );
    if (!reponse) setExtra(avant);
  }, [counts, retirerPlusieurs, setExtra]);

  return {
    items,
    rayons,
    counts: counts ?? { pending: 0, completed: 0 },
    status,
    error,
    dismissError,
    refresh,
    addItem,
    toggleItem,
    changeQuantity: changerQuantite,
    removeItem,
    rangerItem,
    purgeCompleted,
  };
}
