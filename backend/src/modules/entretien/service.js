/**
 * Accès au planning d'entretien.
 */

import { db, stmt } from '../../db/index.js';
import { avancerDe } from '../../lib/recurrence.js';
import { planningInitial, ZONES } from './planning.js';

const aujourdhuiUtc = () => new Date().toISOString().slice(0, 10);

const toPublicZone = (row) => row && { id: row.id, label: row.label, sortOrder: row.sort_order };

const toPublicTask = (row) =>
  row && {
    id: row.id,
    zoneId: row.zone_id,
    zoneLabel: row.zone_label ?? null,
    label: row.label,
    recurrence: row.recurrence,
    dueOn: row.due_on,
    lastDoneOn: row.last_done_on,
    assigneeId: row.assignee_id,
    note: row.note,
  };

// --- Pièces ------------------------------------------------------------------

export function listZones() {
  return stmt('SELECT * FROM maintenance_zones ORDER BY sort_order, label COLLATE NOCASE')
    .all()
    .map(toPublicZone);
}

export function getZone(id) {
  return toPublicZone(stmt('SELECT * FROM maintenance_zones WHERE id = ?').get(id));
}

/** @returns {object|null} `null` si le nom est déjà pris. */
export function createZone(label) {
  if (stmt('SELECT 1 FROM maintenance_zones WHERE label = ? COLLATE NOCASE').get(label)) return null;

  const { lastInsertRowid } = stmt(`
    INSERT INTO maintenance_zones (label, sort_order)
    VALUES (?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM maintenance_zones))
  `).run(label);
  return getZone(lastInsertRowid);
}

export function updateZone(id, label) {
  const occupe = stmt(
    'SELECT 1 FROM maintenance_zones WHERE label = ? COLLATE NOCASE AND id <> ?',
  ).get(label, id);
  if (occupe) return null;

  stmt('UPDATE maintenance_zones SET label = ? WHERE id = ?').run(label, id);
  return getZone(id);
}

/** Les interventions survivent à leur pièce, sans rattachement. */
export function deleteZone(id) {
  return stmt('DELETE FROM maintenance_zones WHERE id = ?').run(id).changes;
}

// --- Interventions -----------------------------------------------------------

const SELECTION = `
  SELECT t.*, z.label AS zone_label
  FROM maintenance_tasks t
  LEFT JOIN maintenance_zones z ON z.id = t.zone_id
`;

/** Tout le planning, du plus urgent au plus lointain. */
export function listTasks() {
  return stmt(`${SELECTION} ORDER BY t.due_on, z.sort_order, t.label COLLATE NOCASE`)
    .all()
    .map(toPublicTask);
}

export function getTask(id) {
  return toPublicTask(stmt(`${SELECTION} WHERE t.id = ?`).get(id));
}

export function createTask(task) {
  const { lastInsertRowid } = stmt(`
    INSERT INTO maintenance_tasks (zone_id, label, recurrence, due_on, assignee_id, note)
    VALUES (:zoneId, :label, :recurrence, :dueOn, :assigneeId, :note)
  `).run(task);
  return getTask(lastInsertRowid);
}

const COLONNES = {
  zoneId: 'zone_id',
  label: 'label',
  recurrence: 'recurrence',
  dueOn: 'due_on',
  assigneeId: 'assignee_id',
  note: 'note',
};

export function updateTask(id, fields) {
  const assignments = [];
  const values = [];

  for (const [champ, colonne] of Object.entries(COLONNES)) {
    // `undefined` = ne touche pas au champ ; `null` = vide-le.
    if (fields[champ] !== undefined) {
      assignments.push(`${colonne} = ?`);
      values.push(fields[champ]);
    }
  }
  if (assignments.length === 0) return getTask(id);

  values.push(id);
  stmt(`UPDATE maintenance_tasks SET ${assignments.join(', ')} WHERE id = ?`).run(...values);
  return getTask(id);
}

/**
 * Marque une intervention faite, et la replanifie.
 *
 * **Le compte repart du jour du geste, pas de l'échéance manquée.** C'est ce
 * qui distingue l'entretien d'une tâche : détartrer la machine avec trois
 * semaines de retard doit décaler d'autant la fois suivante, sinon on
 * redétartrerait une semaine après. Une tâche, elle, vise une date — le mardi
 * des poubelles reste le mardi.
 *
 * @param {string} [leJour] jour du geste ; par défaut aujourd'hui, mais on peut
 *   déclarer avoir fait la chose hier.
 */
export function markDone(id, leJour = aujourdhuiUtc()) {
  const tache = getTask(id);
  if (!tache) return null;

  stmt(`
    UPDATE maintenance_tasks SET last_done_on = ?, due_on = ? WHERE id = ?
  `).run(leJour, avancerDe(leJour, tache.recurrence, 1), id);

  return getTask(id);
}

/** Repousse une échéance sans prétendre que le geste a été fait. */
export function snooze(id, jours) {
  const tache = getTask(id);
  if (!tache) return null;

  const repousse = new Date(Date.parse(`${tache.dueOn}T00:00:00Z`) + jours * 86_400_000)
    .toISOString()
    .slice(0, 10);

  stmt('UPDATE maintenance_tasks SET due_on = ? WHERE id = ?').run(repousse, id);
  return getTask(id);
}

export function deleteTask(id) {
  return stmt('DELETE FROM maintenance_tasks WHERE id = ?').run(id).changes;
}

// --- Mise en route -----------------------------------------------------------

/**
 * Pose le planning de départ, une seule fois.
 *
 * La garde porte sur les deux tables : une maison dont on aurait supprimé
 * toutes les interventions ne doit pas les voir revenir au redémarrage suivant.
 * Même principe que la création des comptes, qui ne se rejoue jamais.
 */
export function seedPlanning() {
  const dejaLa =
    stmt('SELECT COUNT(*) AS n FROM maintenance_zones').get().n > 0 ||
    stmt('SELECT COUNT(*) AS n FROM maintenance_tasks').get().n > 0;
  if (dejaLa) return;

  const depart = Date.parse(`${aujourdhuiUtc()}T00:00:00Z`);
  const dans = (jours) => new Date(depart + jours * 86_400_000).toISOString().slice(0, 10);

  const poser = db.transaction(() => {
    const parNom = new Map();
    for (const [rang, label] of ZONES.entries()) {
      const { lastInsertRowid } = stmt(
        'INSERT INTO maintenance_zones (label, sort_order) VALUES (?, ?)',
      ).run(label, rang + 1);
      parNom.set(label, lastInsertRowid);
    }

    const inserer = stmt(`
      INSERT INTO maintenance_tasks (zone_id, label, recurrence, due_on)
      VALUES (?, ?, ?, ?)
    `);
    for (const { zone, label, recurrence, dueOn } of planningInitial(dans)) {
      inserer.run(zone === null ? null : parNom.get(zone), label, recurrence, dueOn);
    }
  });

  poser();
  console.log(`[entretien] planning de départ posé : ${ZONES.length} pièces.`);
}
