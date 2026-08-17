/**
 * Connexion SQLite unique, partagée par tous les modules.
 *
 * better-sqlite3 est synchrone : pas d'`await` sur les requêtes, ce qui rend le
 * code des modules nettement plus simple à lire. Pour le volume d'une
 * application familiale, la question des performances ne se pose pas.
 */

import Database from 'better-sqlite3';
import { config } from '../config/index.js';

export const db = new Database(config.databaseFile);

// WAL : les lectures ne bloquent plus les écritures. Indispensable dès que deux
// personnes utilisent l'application en même temps.
db.pragma('journal_mode = WAL');
// NORMAL suffit avec WAL et évite un fsync à chaque transaction (l'array unRAID
// apprécie).
db.pragma('synchronous = NORMAL');
// Les contraintes de clé étrangère sont désactivées par défaut dans SQLite.
db.pragma('foreign_keys = ON');
// Plutôt que d'échouer immédiatement, on patiente si la base est verrouillée.
db.pragma('busy_timeout = 5000');

const statementCache = new Map();

/**
 * Prépare une requête, ou renvoie la version déjà compilée.
 *
 * La préparation est volontairement paresseuse : elle a lieu au premier appel,
 * donc toujours après les migrations. Préparer les requêtes à l'import des
 * modules planterait au tout premier démarrage, quand les tables n'existent pas
 * encore.
 *
 * @param {string} sql
 * @returns {import('better-sqlite3').Statement}
 */
export function stmt(sql) {
  let prepared = statementCache.get(sql);
  if (!prepared) {
    prepared = db.prepare(sql);
    statementCache.set(sql, prepared);
  }
  return prepared;
}

/** Ferme proprement la base (arrêt du conteneur). */
export function closeDatabase() {
  statementCache.clear();
  db.close();
}
