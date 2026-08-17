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
 *     Icon: ShoppingIcon,   // facultatif
 *     accent: 'brand',      // facultatif, teinte de la tuile
 *   };
 */

const loaded = import.meta.glob('./*/index.js', { eager: true });

function validate(definition, path) {
  const missing = ['id', 'label', 'path', 'Component'].filter((key) => !definition?.[key]);
  if (missing.length > 0) {
    console.error(`[modules] ${path} ignoré — champs manquants : ${missing.join(', ')}`);
    return false;
  }
  return true;
}

export const modules = Object.entries(loaded)
  .map(([path, imported]) => ({ path, definition: imported.default }))
  .filter(({ path, definition }) => validate(definition, path))
  .map(({ definition }) => definition)
  .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

/** Retrouve le module correspondant à une URL, pour le titre de l'en-tête. */
export function findModuleByPath(pathname) {
  return modules.find((module) => pathname === module.path || pathname.startsWith(`${module.path}/`));
}
