/**
 * Accès au contenu du frigo.
 */

import { stmt } from '../../db/index.js';

function toPublicItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    expiresOn: row.expires_on,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

/**
 * Produits triés par échéance la plus proche.
 *
 * `expires_on IS NULL` en première clé de tri renvoie 0 pour les produits
 * datés et 1 pour les autres : les dates remontent donc en tête, et les
 * produits sans date ferment la marche au lieu de s'y mélanger.
 */
export function listItems() {
  return stmt(`
    SELECT * FROM fridge_items
    ORDER BY expires_on IS NULL, expires_on, name COLLATE NOCASE
  `)
    .all()
    .map(toPublicItem);
}

export function getItem(id) {
  return toPublicItem(stmt('SELECT * FROM fridge_items WHERE id = ?').get(id));
}

export function createItem({ name, quantity, expiresOn, userId }) {
  const result = stmt(
    'INSERT INTO fridge_items (name, quantity, expires_on, created_by) VALUES (?, ?, ?, ?)',
  ).run(name, quantity, expiresOn, userId);
  return getItem(result.lastInsertRowid);
}

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
  // `undefined` signifie « ne touche pas à ce champ », `null` signifie
  // « retire la date » : les deux cas sont bien distincts ici.
  if (fields.expiresOn !== undefined) {
    assignments.push('expires_on = ?');
    values.push(fields.expiresOn);
  }

  values.push(id);
  stmt(`UPDATE fridge_items SET ${assignments.join(', ')} WHERE id = ?`).run(...values);

  return getItem(id);
}

export function deleteItem(id) {
  return stmt('DELETE FROM fridge_items WHERE id = ?').run(id).changes;
}
