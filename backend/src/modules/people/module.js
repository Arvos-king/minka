import { syncAccountsAsPeople } from '../../lib/people.js';
import { router } from './routes.js';

/**
 * Expose les membres du foyer.
 *
 * La table et sa logique d'accès appartiennent au socle (`src/lib/people.js`),
 * puisque plusieurs modules attribuent leurs objets à une personne. Ce module
 * ne fait que porter les routes — un module qui a besoin de la liste importe
 * le socle, jamais ce module.
 */
export default {
  name: 'people',
  basePath: '/api/people',
  requiresAuth: true,
  router,

  /** Un compte créé après coup apparaît de lui-même parmi les membres. */
  init: syncAccountsAsPeople,
};
