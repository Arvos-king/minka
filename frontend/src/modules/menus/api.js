import { api } from '../../lib/apiClient.js';

export const menusApi = {
  // --- Planning ---
  plan: (from, to) => api.get(`/menus/plan?from=${from}&to=${to}`),
  setEntry: (date, slot, contenu) => api.put(`/menus/plan/${date}/${slot}`, contenu),
  clearEntry: (date, slot) => api.delete(`/menus/plan/${date}/${slot}`),

  /** Pose une semaine entière d'un coup, en une transaction côté serveur. */
  importer: (entries) => api.post('/menus/import', { entries }),

  /*
   * --- Passerelles vers d'autres modules -----------------------------------
   *
   * Rien n'est importé de leur code : seulement leur API HTTP publique, comme
   * le frigo le fait pour les courses. La présence de chacun est vérifiée
   * auprès de `/api/health` (`useServerModule`), et s'il manque, la
   * fonctionnalité correspondante s'éteint sans rien casser — le planning se
   * remplit alors en texte libre, ce qu'il sait faire depuis toujours.
   */

  /** Le répertoire de recettes, pour le sélecteur. */
  recettes: () => api.get('/recipes/items'),

  /** Crée une recette du seul intitulé : ses ingrédients viendront plus tard. */
  creerRecette: (title) => api.post('/recipes/items', { title }),

  /** Ingrédients de plusieurs recettes, regroupés, libellés prêts. */
  ingredientsDeRecettes: (ids) => api.get(`/recipes/ingredients?ids=${ids.join(',')}`),

  /** Des intitulés lus dans un texte → des identifiants de recettes. */
  resoudreRecettes: (plats) => api.post('/recipes/resolve', { plats }),

  /** Envoie un ingrédient dans la liste de courses. */
  ajouterAuxCourses: (name) => api.post('/shopping/items', { name }),
};

/**
 * L'adresse de la fiche d'une recette, dans le module recettes.
 *
 * Le pendant, pour la navigation, des passerelles ci-dessus : ce module
 * n'importe pas la fiche, il y mène. Le module recettes retire le paramètre à
 * l'arrivée, et ramène ici quand on referme la fiche.
 */
export const adresseRecette = (id) => `/recettes?recette=${id}`;
