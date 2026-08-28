import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { router } from './routes.js';
import { seedPlanning } from './service.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export default {
  name: 'entretien',
  basePath: '/api/entretien',
  requiresAuth: true,
  router,
  migrationsDir: path.join(moduleDir, 'migrations'),

  /** Le planning de départ, posé une seule fois — voir `seedPlanning`. */
  init: seedPlanning,
};
