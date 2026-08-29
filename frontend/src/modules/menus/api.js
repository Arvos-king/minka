import { api } from '../../lib/apiClient.js';

const periode = (from, to) => `?from=${from}&to=${to}`;

export const menusApi = {
  // --- Planning ---
  plan: (from, to) => api.get(`/menus/plan${periode(from, to)}`),
  setEntry: (date, slot, contenu) => api.put(`/menus/plan/${date}/${slot}`, contenu),
  clearEntry: (date, slot) => api.delete(`/menus/plan/${date}/${slot}`),

  // --- Recettes ---
  recipes: () => api.get('/menus/recipes'),
  recipe: (id) => api.get(`/menus/recipes/${id}`),
  createRecipe: (recipe) => api.post('/menus/recipes', recipe),
  updateRecipe: (id, fields) => api.patch(`/menus/recipes/${id}`, fields),
  removeRecipe: (id) => api.delete(`/menus/recipes/${id}`),

  /** Pose une semaine entière d'un coup, en une transaction côté serveur. */
  importer: (entries) => api.post('/menus/import', { entries }),

  /** Ingrédients de la semaine, regroupés par nom. */
  ingredients: (from, to) => api.get(`/menus/ingredients${periode(from, to)}`),

  /**
   * Envoie un ingrédient dans la liste de courses.
   *
   * Seul point de contact avec le module courses, et il passe par son API HTTP
   * publique — aucun import de son code. S'il venait à disparaître, seul le
   * bouton d'envoi s'éteindrait (voir `useServerModule` dans la page).
   */
  ajouterAuxCourses: (name) => api.post('/shopping/items', { name }),
};
