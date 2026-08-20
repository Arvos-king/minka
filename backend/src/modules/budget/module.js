import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { router } from './routes.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export default {
  name: 'budget',
  basePath: '/api/budget',
  requiresAuth: true,
  router,
  migrationsDir: path.join(moduleDir, 'migrations'),
};
