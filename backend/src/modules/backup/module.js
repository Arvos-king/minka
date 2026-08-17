import { router } from './routes.js';
import { demarrerPlanificateur } from './scheduler.js';

/**
 * Sauvegarde automatique de la base.
 *
 * Module sans interface : il n'apporte pas de fonctionnalité au foyer, mais une
 * tâche de fond et deux routes de diagnostic. C'est aussi une démonstration du
 * contrat de module — `init` sert ici à démarrer un planificateur, pas
 * seulement à préparer des données.
 */
export default {
  name: 'backup',
  basePath: '/api/backup',
  requiresAuth: true,
  router,
  init: demarrerPlanificateur,
};
