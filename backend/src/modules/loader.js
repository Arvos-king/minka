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

/**
 * Un seul segment, en minuscules : `/api/budget`, pas `/api/` ni
 * `/api/budget/depenses`.
 *
 * `/api/` seul passerait un simple test de préfixe et monterait le module à la
 * racine de l'API, où il intercepterait les routes de tous les modules chargés
 * après lui — dans l'ordre alphabétique des dossiers, donc sans rien de visible
 * qui l'explique.
 */
const BASE_PATH_VALIDE = /^\/api\/[a-z0-9-]+$/;

/**
 * Chemins que le socle occupe déjà (voir `app.js`, qui les monte avant les
 * modules). Un module qui s'y installerait ne recevrait jamais aucune requête.
 */
const CHEMINS_RESERVES = new Set(['/api/health']);

/** Valide le contrat et applique les valeurs par défaut. */
export function normalize(definition, folder) {
  if (!definition || typeof definition !== 'object') {
    throw new Error(`Le module « ${folder} » doit avoir un export par défaut (objet).`);
  }

  const { name = folder, basePath, router, migrationsDir, init } = definition;

  if (typeof basePath !== 'string' || !BASE_PATH_VALIDE.test(basePath)) {
    throw new Error(
      `Le module « ${folder} » doit déclarer un basePath de la forme /api/<nom>, ` +
        `en minuscules et sans sous-chemin (reçu : ${JSON.stringify(basePath)}).`,
    );
  }
  if (CHEMINS_RESERVES.has(basePath)) {
    throw new Error(
      `Le module « ${folder} » réclame ${basePath}, déjà occupé par le socle : ` +
        `ses routes ne seraient jamais atteintes.`,
    );
  }
  if (typeof router !== 'function') {
    throw new Error(`Le module « ${folder} » doit exporter un router Express.`);
  }
  if (init !== undefined && typeof init !== 'function') {
    throw new Error(`Le champ init du module « ${folder} » doit être une fonction.`);
  }

  return {
    folder,
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

/**
 * Refuse deux modules qui se marcheraient dessus.
 *
 * Aucune de ces collisions ne provoque d'erreur d'elle-même, et c'est bien le
 * problème :
 *
 *   — deux `basePath` identiques, et Express sert le premier routeur monté ;
 *     les routes du second répondent 404 sans que rien ne le signale ;
 *   — deux `name` identiques, et les migrations partagent leur espace de noms
 *     (`nom:fichier`) : le `001_init.sql` du second module est considéré comme
 *     déjà appliqué, donc sa table n'est jamais créée.
 *
 * Le second cas touche aux données : mieux vaut un démarrage refusé, avec un
 * message qui nomme les deux dossiers fautifs.
 */
export function verifierCollisions(modules) {
  const parNom = new Map();
  const parChemin = new Map();

  for (const module of modules) {
    const nomOccupe = parNom.get(module.name);
    if (nomOccupe) {
      throw new Error(
        `Les modules « ${nomOccupe} » et « ${module.folder} » portent le même nom ` +
          `« ${module.name} » : leurs migrations se confondraient.`,
      );
    }
    parNom.set(module.name, module.folder);

    const cheminOccupe = parChemin.get(module.basePath);
    if (cheminOccupe) {
      throw new Error(
        `Les modules « ${cheminOccupe} » et « ${module.folder} » réclament tous deux ` +
          `${module.basePath} : les routes du second ne seraient jamais atteintes.`,
      );
    }
    parChemin.set(module.basePath, module.folder);
  }

  return modules;
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

  return verifierCollisions(modules);
}
