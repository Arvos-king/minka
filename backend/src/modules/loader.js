/**
 * Découverte automatique des modules.
 *
 * Tout sous-dossier de `src/modules/` contenant un `module.js` est chargé au
 * démarrage. Ajouter une fonctionnalité (calendrier, budget, tâches…) revient
 * donc à déposer un dossier : aucun fichier du socle n'est à modifier.
 *
 * Contrat attendu — `src/modules/<nom>/module.js` :
 *
 *   export default {
 *     name: 'shopping',                    // identifiant, sert aussi aux migrations
 *     basePath: '/api/shopping',           // préfixe de montage des routes
 *     requiresAuth: true,                  // facultatif, protégé par défaut
 *     router,                              // un Router Express
 *     migrationsDir: <chemin>,             // facultatif
 *     init: async () => {},                // facultatif, exécuté après migrations
 *   };
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const modulesDir = path.dirname(fileURLToPath(import.meta.url));

/** Valide le contrat et applique les valeurs par défaut. */
function normalize(definition, folder) {
  if (!definition || typeof definition !== 'object') {
    throw new Error(`Le module « ${folder} » doit avoir un export par défaut (objet).`);
  }

  const { name = folder, basePath, router, migrationsDir, init } = definition;

  if (typeof basePath !== 'string' || !basePath.startsWith('/api/')) {
    throw new Error(`Le module « ${folder} » doit déclarer un basePath commençant par /api/.`);
  }
  if (typeof router !== 'function') {
    throw new Error(`Le module « ${folder} » doit exporter un router Express.`);
  }
  if (init !== undefined && typeof init !== 'function') {
    throw new Error(`Le champ init du module « ${folder} » doit être une fonction.`);
  }

  return {
    name,
    basePath,
    router,
    migrationsDir,
    init,
    // Protégé par défaut : un module qui oublie de se déclarer reste fermé.
    // L'inverse — une route ouverte par omission — serait une fuite silencieuse.
    requiresAuth: definition.requiresAuth !== false,
  };
}

/** @returns {Promise<Array<object>>} les modules, triés par nom de dossier. */
export async function loadModules() {
  const folders = fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const modules = [];

  for (const folder of folders) {
    const entryPoint = path.join(modulesDir, folder, 'module.js');
    if (!fs.existsSync(entryPoint)) {
      console.warn(`[modules] « ${folder} » ignoré : pas de module.js.`);
      continue;
    }

    // pathToFileURL : sous Windows, un chemin « C:\… » n'est pas une URL valide
    // pour un import dynamique.
    const imported = await import(pathToFileURL(entryPoint).href);
    modules.push(normalize(imported.default, folder));
  }

  return modules;
}
