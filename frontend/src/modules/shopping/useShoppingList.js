import { useCallback, useEffect, useRef, useState } from 'react';

import { shoppingApi } from './api.js';

/**
 * État de la liste de courses.
 *
 * Toutes les actions sont **optimistes** : l'interface se met à jour
 * immédiatement, puis l'appel réseau confirme ou annule. C'est indispensable
 * dans un supermarché, où la connexion est souvent médiocre — attendre la
 * réponse du serveur avant de barrer un article rendrait l'application
 * pénible à utiliser au moment précis où elle sert.
 */
export function useShoppingList() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, completed: 0 });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  /*
   * Dernière quantité demandée pour chaque article, mémorisée hors du cycle de
   * rendu.
   *
   * Deux raisons, toutes deux visibles dès qu'on tape trois fois de suite sur
   * « + » pour mettre 4 :
   *   — les taps s'enchaînent plus vite que les rendus de React, et repartir de
   *     `item.quantity` ferait calculer plusieurs fois la même valeur ;
   *   — les réponses du serveur peuvent revenir dans le désordre, et la plus
   *     ancienne écraserait alors la plus récente.
   */
  const requestedQuantities = useRef(new Map());

  const refresh = useCallback(async ({ silent = false } = {}) => {
    try {
      const data = await shoppingApi.list();
      // La liste du serveur fait foi : les demandes en attente n'ont plus lieu
      // d'être comparées à un état qui vient d'être remplacé.
      requestedQuantities.current.clear();
      setItems(data.items);
      setCounts(data.counts);
      setStatus('ready');
    } catch (apiError) {
      // Un rafraîchissement d'arrière-plan qui échoue ne doit pas remplacer une
      // liste déjà affichée par un écran d'erreur.
      if (silent) return;
      setError(apiError.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /*
   * Rafraîchissement au retour sur l'application.
   *
   * Sans temps réel, c'est ce qui permet de voir les articles ajoutés par
   * l'autre : on rouvre l'onglet ou l'application, et la liste est à jour.
   */
  useEffect(() => {
    // Retour depuis un autre onglet ou depuis l'écran verrouillé du téléphone.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh({ silent: true });
    };
    // Retour depuis une autre fenêtre : la page était déjà « visible » au sens
    // de l'API, seul le focus a changé. Ne pas retester la visibilité ici, ce
    // cas passerait sinon entre les mailles du filet.
    const handleFocus = () => refresh({ silent: true });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refresh]);

  const addItem = useCallback(async (name, quantity = 1) => {
    // Identifiant négatif provisoire : aucun risque de collision avec un
    // identifiant attribué par SQLite.
    const tempId = -Date.now();
    setItems((previous) => [
      ...previous,
      { id: tempId, name, quantity, completed: false, createdAt: new Date().toISOString(), pending: true },
    ]);
    setCounts((previous) => ({ ...previous, pending: previous.pending + 1 }));

    try {
      const data = await shoppingApi.create(name, quantity);
      setItems((previous) => previous.map((item) => (item.id === tempId ? data.item : item)));
      setCounts(data.counts);
    } catch (apiError) {
      setItems((previous) => previous.filter((item) => item.id !== tempId));
      setCounts((previous) => ({ ...previous, pending: previous.pending - 1 }));
      setError(apiError.message);
      throw apiError;
    }
  }, []);

  /** Applique une modification en local, avec restauration si le serveur refuse. */
  const patchItem = useCallback(async (item, fields, optimistic) => {
    setItems((previous) => previous.map((i) => (i.id === item.id ? { ...i, ...optimistic } : i)));

    try {
      const data = await shoppingApi.update(item.id, fields);
      setItems((previous) => previous.map((i) => (i.id === item.id ? data.item : i)));
      setCounts(data.counts);
    } catch (apiError) {
      setItems((previous) => previous.map((i) => (i.id === item.id ? item : i)));
      setError(apiError.message);
    }
  }, []);

  const toggleItem = useCallback(
    (item) => {
      const completed = !item.completed;
      setCounts((previous) => ({
        pending: previous.pending + (completed ? -1 : 1),
        completed: previous.completed + (completed ? 1 : -1),
      }));
      return patchItem(
        item,
        { completed },
        { completed, completedAt: completed ? new Date().toISOString() : null },
      );
    },
    [patchItem],
  );

  const changeQuantity = useCallback(async (item, delta) => {
    const base = requestedQuantities.current.get(item.id) ?? item.quantity;
    const quantity = Math.min(99, Math.max(1, base + delta));
    if (quantity === base) return;

    requestedQuantities.current.set(item.id, quantity);
    setItems((previous) => previous.map((i) => (i.id === item.id ? { ...i, quantity } : i)));

    try {
      const data = await shoppingApi.update(item.id, { quantity });
      // Une demande plus récente est partie entre-temps : on garde l'affichage
      // optimiste, c'est lui qui reflète l'intention de l'utilisateur.
      if (requestedQuantities.current.get(item.id) !== quantity) return;

      requestedQuantities.current.delete(item.id);
      setItems((previous) => previous.map((i) => (i.id === item.id ? data.item : i)));
      setCounts(data.counts);
    } catch (apiError) {
      requestedQuantities.current.delete(item.id);
      setItems((previous) => previous.map((i) => (i.id === item.id ? item : i)));
      setError(apiError.message);
    }
  }, []);

  const removeItem = useCallback(async (item) => {
    setItems((previous) => previous.filter((i) => i.id !== item.id));
    setCounts((previous) => ({
      pending: previous.pending - (item.completed ? 0 : 1),
      completed: previous.completed - (item.completed ? 1 : 0),
    }));

    try {
      const data = await shoppingApi.remove(item.id);
      setCounts(data.counts);
    } catch (apiError) {
      // L'article revient à sa place : la liste doit rester le reflet fidèle
      // de ce qui est enregistré.
      setItems((previous) => [...previous, item]);
      setCounts((previous) => ({
        pending: previous.pending + (item.completed ? 0 : 1),
        completed: previous.completed + (item.completed ? 1 : 0),
      }));
      setError(apiError.message);
    }
  }, []);

  const purgeCompleted = useCallback(async () => {
    const removed = items.filter((item) => item.completed);
    setItems((previous) => previous.filter((item) => !item.completed));
    setCounts((previous) => ({ ...previous, completed: 0 }));

    try {
      const data = await shoppingApi.purgeCompleted();
      setCounts(data.counts);
    } catch (apiError) {
      setItems((previous) => [...previous, ...removed]);
      setCounts((previous) => ({ ...previous, completed: removed.length }));
      setError(apiError.message);
    }
  }, [items]);

  return {
    items,
    counts,
    status,
    error,
    dismissError: () => setError(null),
    refresh,
    addItem,
    toggleItem,
    changeQuantity,
    removeItem,
    purgeCompleted,
  };
}
