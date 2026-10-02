import { api } from '../../lib/apiClient.js';

export const menusApi = {
  // --- Planning ---
  plan: (from, to) => api.get(`/menus/plan?from=${from}&to=${to}`),
  setEntry: (date, slot, contenu) => api.put(`/menus/plan/${date}/${slot}`, contenu),
  clearEntry: (date, slot) => api.delete(`/menus/plan/${date}/${slot}`),

  /** Pose une semaine entière d'un coup, en une transaction côté serveur. */
  importer: (entries) => api.post('/menus/import', { entries }),

  /**
   * Déplace un repas en poussant ceux qu'il déloge — voir `reorganisation.js`.
   * Rend chaque case touchée, avec son état d'avant et d'après.
   */
  deplacer: (de, vers) => api.post('/menus/plan/deplacer', { de, vers }),

  /** Fixe plusieurs cases d'un bloc, sous condition : ce qu'emploie « Annuler ». */
  fixerCases: (cases) => api.patch('/menus/plan', { cases }),

  /** Les textes libres les plus fréquents du foyer. */
  raccourcis: () => api.get('/menus/raccourcis'),

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
