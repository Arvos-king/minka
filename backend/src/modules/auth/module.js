import { router } from './routes.js';
import { seedUsers } from './seed.js';

export default {
  name: 'auth',
  basePath: '/api/auth',

  /**
   * Seul module public de la plateforme : la page de connexion doit pouvoir
   * appeler /login sans être déjà connectée. Les routes qui exigent une session
   * (`/me`, `/password`) appliquent `requireAuth` individuellement.
   */
  requiresAuth: false,

  router,

  /** Création des comptes déclarés dans l'environnement, après les migrations. */
  init: seedUsers,
};
