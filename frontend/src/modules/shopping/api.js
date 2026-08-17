import { api } from '../../lib/apiClient.js';

/** Appels réseau du module. Toutes les réponses contiennent les compteurs à jour. */
export const shoppingApi = {
  list: () => api.get('/shopping/items?status=all'),
  create: (name, quantity) => api.post('/shopping/items', { name, quantity }),
  update: (id, fields) => api.patch(`/shopping/items/${id}`, fields),
  remove: (id) => api.delete(`/shopping/items/${id}`),
  purgeCompleted: () => api.delete('/shopping/items/completed'),
};
