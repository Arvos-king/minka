/**
 * Registre des modules de l'interface.
 *
 * `import.meta.glob` est résolu par Vite à la compilation : déposer un dossier
 * `src/modules/<nom>/` contenant un `index.js` suffit à faire apparaître sa
 * route et sa tuile sur le tableau de bord. Aucun fichier du socle n'est à
 * modifier — pendant du chargeur de modules côté API.
 *
 * Contrat attendu — `src/modules/<nom>/index.js` :
 *
 *   export default {
 *     id: 'shopping',
 *     label: 'Liste de courses',
 *     description: "Ce qu'il faut acheter",
 *     path: '/courses',
 *     Component: ShoppingPage,
 *     Icon: ShoppingIcon,     // facultatif
 *     accent: 'brand',        // facultatif, teinte de la tuile
 *     shortLabel: 'Courses',  // facultatif, libellé de l'onglet
 *     tabOrder: 1,            // facultatif, rang dans la barre d'onglets
 *   };
 *
 * La validation, la détection des collisions et le tri vivent dans
 * `construireRegistre.js` : ce fichier-ci ne fait que la collecte, qui dépend
 * de Vite.
 */

import { construireRegistre, trouverModuleParChemin } from './construireRegistre.js';

const charges = import.meta.glob('./*/index.js', { eager: true });

export const modules = construireRegistre(charges);

/** Retrouve le module correspondant à une URL, pour le titre de l'en-tête. */
export function findModuleByPath(pathname) {
  return trouverModuleParChemin(modules, pathname);
}
