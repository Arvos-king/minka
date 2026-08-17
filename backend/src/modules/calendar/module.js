import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { router } from './routes.js';
import { syncAccountsAsPeople } from './service.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export default {
  name: 'calendar',
  basePath: '/api/calendar',
  requiresAuth: true,
  router,
  migrationsDir: path.join(moduleDir, 'migrations'),

  /** Un compte créé après coup apparaît de lui-même parmi les participants. */
  init: syncAccountsAsPeople,
};
