/**
 * Point d'entrée de l'API.
 *
 * Séquence de démarrage, dans cet ordre précis :
 *   1. découverte des modules ;
 *   2. migrations (socle, puis celles apportées par chaque module) ;
 *   3. initialisation des modules (`init`) — c'est là que les comptes sont créés ;
 *   4. construction de l'application et écoute.
 *
 * Les migrations précèdent forcément les `init` : un module doit pouvoir écrire
 * en base dès son initialisation.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from './app.js';
import { config } from './config/index.js';
import { closeDatabase } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { loadModules } from './modules/loader.js';

const srcDir = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const modules = await loadModules();

  runMigrations([
    { name: 'core', dir: path.join(srcDir, 'migrations') },
    ...modules.map((module) => ({ name: module.name, dir: module.migrationsDir })),
  ]);

  for (const module of modules) {
    if (module.init) await module.init();
  }

  const app = createApp(modules);

  // Express 5 ne lève plus les erreurs d'écoute (port occupé, port réservé) :
  // il les passe en premier argument à ce rappel. Les ignorer, c'est annoncer
  // un serveur qui n'écoute pas, puis laisser le processus sortir en code 0 —
  // un démarrage raté que Docker ou un script prendraient pour un arrêt normal.
  const server = app.listen(config.port, (error) => {
    if (error) {
      const raison =
        error.code === 'EADDRINUSE' ? `le port ${config.port} est déjà occupé` : error.message;
      console.error(`[server] Démarrage impossible : ${raison}`);
      closeDatabase();
      process.exit(1);
    }
    console.log(`[server] Minka écoute sur le port ${config.port} (${config.env}).`);
  });

  // Arrêt propre : sans cela, `docker compose down` coupe le processus au bout
  // de dix secondes et la base peut rester avec un journal WAL non consolidé.
  const shutdown = (signal) => {
    console.log(`[server] ${signal} reçu, arrêt en cours…`);
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('[server] Démarrage impossible :', error);
  process.exit(1);
});
