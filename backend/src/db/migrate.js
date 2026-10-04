/**
 * Applicateur de migrations SQL.
 *
 * Chaque migration est un fichier `.sql` numéroté. Le socle apporte les siennes
 * (`src/migrations/`), et chaque module peut apporter les siennes via la
 * propriété `migrationsDir` de son `module.js` : ajouter un module n'oblige
 * donc jamais à toucher au socle.
 *
 * Les migrations déjà appliquées sont retenues dans `schema_migrations`, ce qui
 * rend l'opération idempotente — le conteneur peut redémarrer autant de fois
 * que nécessaire.
 */

import fs from 'node:fs';
import path from 'node:path';

import { T } from '../textes.js';
import { db } from './index.js';

/**
 * @param {Array<{ name: string, dir: string }>} sources
 *   `name` identifie la provenance (« core », ou le nom du module) et
 *   préfixe l'identifiant enregistré : deux modules peuvent ainsi avoir
 *   chacun leur `001_init.sql` sans se marcher dessus.
 */
export function runMigrations(sources) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const isApplied = db.prepare('SELECT 1 FROM schema_migrations WHERE id = ?');
  const markApplied = db.prepare('INSERT INTO schema_migrations (id) VALUES (?)');

  let appliedCount = 0;

  for (const { name, dir } of sources) {
    // Un module sans migrations est parfaitement valide.
    if (!dir || !fs.existsSync(dir)) continue;

    const files = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.sql'))
      .sort(); // ordre lexicographique, d'où la numérotation 001_, 002_…

    for (const file of files) {
      const id = `${name}:${file}`;
      if (isApplied.get(id)) continue;

      const sql = fs.readFileSync(path.join(dir, file), 'utf8');

      // Migration et enregistrement dans la même transaction : en cas d'échec
      // au milieu du fichier, rien n'est conservé et la migration sera
      // retentée au prochain démarrage.
      db.transaction(() => {
        db.exec(sql);
        markApplied.run(id);
      })();

      console.log(T.migrations.appliquee(id));
      appliedCount += 1;
    }
  }

  if (appliedCount === 0) {
    console.log(T.migrations.aJour);
  }
}
