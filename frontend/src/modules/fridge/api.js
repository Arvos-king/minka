import { api } from '../../lib/apiClient.js';

export const fridgeApi = {
  list: () => api.get('/fridge/items'),
  create: (item) => api.post('/fridge/items', item),
  update: (id, fields) => api.patch(`/fridge/items/${id}`, fields),
  remove: (id) => api.delete(`/fridge/items/${id}`),

  /**
   * Envoie un produit dans la liste de courses.
   *
   * C'est le seul point de contact entre les deux modules, et il passe par
   * l'API HTTP publique du module courses — aucun import de son code. Si ce
   * module venait à disparaître, seul ce bouton s'éteindrait (voir
   * `useServerModule` dans la page).
   */
  ajouterAuxCourses: (name) => api.post('/shopping/items', { name }),
};
