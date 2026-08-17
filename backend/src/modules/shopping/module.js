import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { router } from './routes.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export default {
  name: 'shopping',
  basePath: '/api/shopping',
  // Valeur par défaut, rappelée ici pour être explicite : toutes les routes
  // exigent une session.
  requiresAuth: true,
  router,
  migrationsDir: path.join(moduleDir, 'migrations'),
};
