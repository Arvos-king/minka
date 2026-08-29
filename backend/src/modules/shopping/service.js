/**
 * Accès aux articles de la liste de courses.
 */

import { db, stmt } from '../../db/index.js';
import { choisirRayon, cleDeNom, RAYON_PAR_DEFAUT } from './rayons.js';

/**
 * Traduit une ligne SQLite en objet destiné au client : camelCase, et
 * `completed` en vrai booléen plutôt qu'en 0/1.
 */
function toPublicItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    completed: row.completed === 1,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    // NULL n'existe que le temps du rattrapage de démarrage, qui s'exécute
    // avant que le serveur n'écoute. Le repli est là pour que le client n'ait
    // jamais à connaître ce cas.
    rayon: row.rayon ?? RAYON_PAR_DEFAUT,
  };
}

/**
 * Le rayon d'un nom d'article : la correction du foyer d'abord, le dictionnaire
 * ensuite.
 *
 * La règle elle-même vit dans `rayons.js`, où elle se teste sans base ; il ne
 * reste ici que la lecture de la ligne apprise.
 */
function rayonPour(name) {
  const cle = cleDeNom(name);
  const appris =
    cle === ''
      ? null
      : stmt('SELECT rayon FROM shopping_rayons_appris WHERE nom_normalise = ?').get(cle);

  return choisirRayon(name, appris?.rayon);
}

/**
 * @param {'pending'|'completed'|'all'} status
 *
 * Deux tris volontairement différents : les articles à acheter suivent l'ordre
 * d'ajout (on retrouve la liste telle qu'on l'a construite, et les derniers
 * ajouts apparaissent près du champ de saisie), tandis que les articles déjà
 * pris remontent du plus récemment coché — c'est celui qu'on cherche quand on
 * s'est trompé de case.
 */
export function listItems(status) {
  if (status === 'pending') {
    return stmt('SELECT * FROM shopping_items WHERE completed = 0 ORDER BY created_at, id')
      .all()
      .map(toPublicItem);
  }
  if (status === 'completed') {
    return stmt('SELECT * FROM shopping_items WHERE completed = 1 ORDER BY completed_at DESC, id DESC')
      .all()
      .map(toPublicItem);
  }
  return stmt(`
    SELECT * FROM shopping_items
    ORDER BY completed,
             CASE WHEN completed = 0 THEN created_at END ASC,
             CASE WHEN completed = 1 THEN completed_at END DESC,
             id
  `)
    .all()
    .map(toPublicItem);
}

export function getItem(id) {
  return toPublicItem(stmt('SELECT * FROM shopping_items WHERE id = ?').get(id));
}

/**
 * Le rayon est posé ici, à l'insertion, et nulle part ailleurs : c'est ce qui
 * fait arriver rangés les articles poussés par le frigo et par les menus, qui
 * n'envoient qu'un nom.
 */
export function createItem({ name, quantity, userId }) {
  const result = stmt(
    'INSERT INTO shopping_items (name, quantity, created_by, rayon) VALUES (?, ?, ?, ?)',
  ).run(name, quantity, userId, rayonPour(name));
  return getItem(result.lastInsertRowid);
}

/**
 * Met à jour les champs fournis, et rien d'autre.
 *
 * `completed_at` suit automatiquement `completed` : c'est ce qui permet de
 * classer les articles cochés du plus récent au plus ancien, et de le remettre
 * à zéro quand on décoche par erreur.
 */
export function updateItem(id, fields) {
  const assignments = [];
  const values = [];

  if (fields.name !== undefined) {
    assignments.push('name = ?');
    values.push(fields.name);
  }
  if (fields.quantity !== undefined) {
    assignments.push('quantity = ?');
    values.push(fields.quantity);
  }
  if (fields.completed !== undefined) {
    assignments.push('completed = ?', `completed_at = ${fields.completed ? "datetime('now')" : 'NULL'}`);
    values.push(fields.completed ? 1 : 0);
  }
  if (fields.rayon !== undefined) {
    assignments.push('rayon = ?');
    values.push(fields.rayon);
  }

  values.push(id);
  stmt(`UPDATE shopping_items SET ${assignments.join(', ')} WHERE id = ?`).run(...values);

  return getItem(id);
}

export function deleteItem(id) {
  return stmt('DELETE FROM shopping_items WHERE id = ?').run(id).changes;
}

/** Purge des articles déjà pris. @returns {number} le nombre d'articles supprimés. */
export function deleteCompleted() {
  return stmt('DELETE FROM shopping_items WHERE completed = 1').run().changes;
}

/** Compteurs affichés en tête de liste, obtenus en une seule requête. */
export function countItems() {
  const row = db
    .prepare(
      `SELECT
         SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed
       FROM shopping_items`,
    )
    .get();
  return { pending: row.pending ?? 0, completed: row.completed ?? 0 };
}

/**
 * Range les articles arrivés avant les rayons.
 *
 * Une migration `.sql` ne sait pas appeler `classer()` : la colonne naît donc
 * vide, et c'est ce démarrage-ci qui la remplit. Idempotent par construction —
 * la clause `rayon IS NULL` est la garde, il n'y a rien à retenir ailleurs :
 * aux redémarrages suivants la requête ne ramène rien et la fonction s'arrête.
 *
 * Le classement passe par `rayonPour`, comme un ajout : si le foyer a déjà
 * corrigé ce nom, le rattrapage respecte sa correction plutôt que le
 * dictionnaire.
 */
export function classerArticlesSansRayon() {
  const aRanger = stmt('SELECT id, name FROM shopping_items WHERE rayon IS NULL').all();
  if (aRanger.length === 0) return;

  const ranger = stmt('UPDATE shopping_items SET rayon = ? WHERE id = ?');
  db.transaction(() => {
    for (const { id, name } of aRanger) ranger.run(rayonPour(name), id);
  })();

  console.log(`[shopping] ${aRanger.length} article(s) rangés au rayon.`);
}
