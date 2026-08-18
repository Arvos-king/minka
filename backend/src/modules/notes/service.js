/**
 * Accès aux notes partagées.
 */

import { stmt } from '../../db/index.js';

/**
 * SQLite écrit ses dates « 2026-08-18 14:00:00 », en UTC et sans le dire.
 * `new Date()` interprète cette forme différemment selon le navigateur : on
 * rend donc un instant sans ambiguïté, que le client peut comparer à l'heure
 * du téléphone.
 */
const enInstant = (valeur) => (valeur ? `${valeur.replace(' ', 'T')}Z` : null);

function toPublicNote(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned === 1,
    version: row.version,
    createdAt: enInstant(row.created_at),
    updatedAt: enInstant(row.updated_at),
    updatedBy: row.updated_by,
    updatedByName: row.updated_by_name ?? null,
  };
}

/** Le nom de l'auteur vient d'une jointure : la liste l'affiche sans requête de plus. */
const SELECTION = `
  SELECT n.*, u.display_name AS updated_by_name
  FROM notes n
  LEFT JOIN users u ON u.id = n.updated_by
`;

/**
 * Les épinglées d'abord, puis les plus récemment modifiées.
 *
 * `updated_at` plutôt que `created_at` : une note qu'on vient de compléter est
 * celle qu'on cherche, quelle que soit son ancienneté.
 */
export function listNotes() {
  return stmt(`${SELECTION} ORDER BY n.pinned DESC, n.updated_at DESC, n.id DESC`)
    .all()
    .map(toPublicNote);
}

export function getNote(id) {
  return toPublicNote(stmt(`${SELECTION} WHERE n.id = ?`).get(id));
}

export function createNote({ title, body, pinned }, userId) {
  const result = stmt(`
    INSERT INTO notes (title, body, pinned, created_by, updated_by)
    VALUES (:title, :body, :pinned, :userId, :userId)
  `).run({ title: title ?? null, body: body ?? '', pinned: pinned ? 1 : 0, userId });

  return getNote(result.lastInsertRowid);
}

const COLONNES = {
  title: 'title',
  body: 'body',
};

/**
 * Modifie une note, si personne ne l'a touchée entre-temps.
 *
 * @param {object} options
 * @param {number} options.userId  qui écrit.
 * @param {number} [options.versionAttendue]
 *   Version que l'appelant croit modifier. Fournie et dépassée, rien n'est
 *   écrit et la fonction renvoie `null` : c'est à l'interface de proposer un
 *   choix. Omise, l'écriture passe — ce qui sert à l'épinglage, geste qui ne
 *   touche pas au texte et n'a donc rien à écraser.
 *
 * @returns {object|null} la note à jour, ou `null` si rien n'a été modifié —
 *   note disparue ou version dépassée, deux cas que l'appelant distingue.
 */
export function updateNote(id, fields, { userId, versionAttendue }) {
  const assignments = [];
  const values = [];

  for (const [champ, colonne] of Object.entries(COLONNES)) {
    // `undefined` = ne touche pas au champ ; `null` = vide-le.
    if (fields[champ] !== undefined) {
      assignments.push(`${colonne} = ?`);
      values.push(fields[champ]);
    }
  }
  if (fields.pinned !== undefined) {
    assignments.push('pinned = ?');
    values.push(fields.pinned ? 1 : 0);
  }

  /*
   * La version ne garde que le texte, et l'horodatage ne date que lui.
   *
   * Épingler n'est pas modifier : compter ce geste ferait échouer la
   * sauvegarde automatique de celui qui écrit au même moment — un conflit
   * annoncé alors que personne n'a touché à une lettre — et afficherait
   * « modifiée à l'instant » sur une note qu'on vient seulement de ranger.
   */
  const toucheAuTexte = fields.title !== undefined || fields.body !== undefined;
  if (toucheAuTexte) {
    assignments.push('version = version + 1', "updated_at = datetime('now')", 'updated_by = ?');
    values.push(userId);
  }

  values.push(id);

  /*
   * La vérification de version est dans la clause WHERE, et non lue puis
   * comparée en JavaScript : entre une lecture et une écriture séparées, l'autre
   * a le temps de s'intercaler. Ici, c'est SQLite qui tranche, en une opération.
   */
  const conditionVersion = versionAttendue === undefined ? '' : ' AND version = ?';
  if (versionAttendue !== undefined) values.push(versionAttendue);

  const modifiees = stmt(
    `UPDATE notes SET ${assignments.join(', ')} WHERE id = ?${conditionVersion}`,
  ).run(...values).changes;

  return modifiees === 0 ? null : getNote(id);
}

export function deleteNote(id) {
  return stmt('DELETE FROM notes WHERE id = ?').run(id).changes;
}
