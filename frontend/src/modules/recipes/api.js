import { api } from '../../lib/apiClient.js';

export const recipesApi = {
  /** Le répertoire, sans les ingrédients — mais avec leur nombre. */
  list: () => api.get('/recipes/items'),

  /** Une recette entière : le sélecteur ne connaît pas ses ingrédients. */
  get: (id) => api.get(`/recipes/items/${id}`),

  create: (recette) => api.post('/recipes/items', recette),
  update: (id, champs) => api.patch(`/recipes/items/${id}`, champs),
  remove: (id) => api.delete(`/recipes/items/${id}`),
};
