import { useCallback, useEffect, useRef, useState } from 'react';

import { useRefreshOnFocus } from '../../lib/useRefreshOnFocus.js';
import { fridgeApi } from './api.js';

/**
 * État du contenu du frigo.
 *
 * Même principe que la liste de courses : toutes les actions sont optimistes,
 * et le serveur confirme ou annule ensuite.
 */
export function useFridge() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  // Dernière quantité demandée par produit : les taps sur « + » s'enchaînent
  // plus vite que les rendus de React, et les réponses du serveur peuvent
  // revenir dans le désordre.
  const quantitesDemandees = useRef(new Map());

  const refresh = useCallback(async ({ silent = false } = {}) => {
    try {
      const data = await fridgeApi.list();
      quantitesDemandees.current.clear();
      setItems(data.items);
      setStatus('ready');
    } catch (apiError) {
      if (silent) return;
      setError(apiError.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshSilently = useCallback(() => refresh({ silent: true }), [refresh]);
  useRefreshOnFocus(refreshSilently);

  const addItem = useCallback(async ({ name, expiresOn }) => {
    const tempId = -Date.now();
    setItems((previous) => [
      ...previous,
      { id: tempId, name, quantity: 1, expiresOn, pending: true },
    ]);

    try {
      const data = await fridgeApi.create({ name, expiresOn });
      // On recharge plutôt que d'insérer sur place : la liste est triée par
      // échéance côté serveur, et le nouveau produit doit trouver son rang.
      setItems((previous) => previous.filter((item) => item.id !== tempId));
      await refresh({ silent: true });
      return data.item;
    } catch (apiError) {
      setItems((previous) => previous.filter((item) => item.id !== tempId));
      setError(apiError.message);
      throw apiError;
    }
  }, [refresh]);

  const changeQuantity = useCallback(async (item, delta) => {
    const base = quantitesDemandees.current.get(item.id) ?? item.quantity;
    const quantity = Math.min(99, Math.max(1, base + delta));
    if (quantity === base) return;

    quantitesDemandees.current.set(item.id, quantity);
    setItems((previous) => previous.map((i) => (i.id === item.id ? { ...i, quantity } : i)));

    try {
      const data = await fridgeApi.update(item.id, { quantity });
      if (quantitesDemandees.current.get(item.id) !== quantity) return;

      quantitesDemandees.current.delete(item.id);
      setItems((previous) => previous.map((i) => (i.id === item.id ? data.item : i)));
    } catch (apiError) {
      quantitesDemandees.current.delete(item.id);
      setItems((previous) => previous.map((i) => (i.id === item.id ? item : i)));
      setError(apiError.message);
    }
  }, []);

  /** Change ou retire la date de péremption (`null` la retire). */
  const changeExpiry = useCallback(
    async (item, expiresOn) => {
      setItems((previous) => previous.map((i) => (i.id === item.id ? { ...i, expiresOn } : i)));

      try {
        await fridgeApi.update(item.id, { expiresOn });
        // Le classement dépend de cette date : il faut retrier.
        await refresh({ silent: true });
      } catch (apiError) {
        setItems((previous) => previous.map((i) => (i.id === item.id ? item : i)));
        setError(apiError.message);
      }
    },
    [refresh],
  );

  const removeItem = useCallback(async (item) => {
    setItems((previous) => previous.filter((i) => i.id !== item.id));

    try {
      await fridgeApi.remove(item.id);
    } catch (apiError) {
      // Le produit retrouve sa place : l'écran doit rester le reflet fidèle
      // de ce qui est enregistré.
      setItems((previous) => [...previous, item]);
      setError(apiError.message);
    }
  }, []);

  return {
    items,
    status,
    error,
    dismissError: () => setError(null),
    addItem,
    changeQuantity,
    changeExpiry,
    removeItem,
  };
}
