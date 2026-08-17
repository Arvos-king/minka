import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { router } from './routes.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export default {
  name: 'calendar',
  basePath: '/api/calendar',
  requiresAuth: true,
  router,
  migrationsDir: path.join(moduleDir, 'migrations'),
};
