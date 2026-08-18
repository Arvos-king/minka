/**
 * Accès aux tâches, et logique de replanification.
 */

import { stmt } from '../../db/index.js';
import { prochaineEcheance } from './recurrence.js';

function toPublicTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    dueOn: row.due_on,
    recurrence: row.recurrence,
    assigneeId: row.assignee_id,
    note: row.note,
    completedAt: row.completed_at,
  };
}

// --- Lecture -----------------------------------------------------------------

/**
 * Tâches triées : d'abord ce qui reste à faire, par échéance la plus proche,
 * les tâches sans date fermant la marche ; puis ce qui est terminé, du plus
 * récemment coché au plus ancien.
 */
export function listTasks(status) {
  if (status === 'pending') {
    return stmt(
      'SELECT * FROM tasks WHERE done = 0 ORDER BY due_on IS NULL, due_on, created_at, id',
    )
      .all()
      .map(toPublicTask);
  }
  if (status === 'done') {
    return stmt('SELECT * FROM tasks WHERE done = 1 ORDER BY completed_at DESC, id DESC')
      .all()
      .map(toPublicTask);
  }
  return stmt(`
    SELECT * FROM tasks
    ORDER BY done,
             CASE WHEN done = 0 THEN due_on IS NULL END,
             CASE WHEN done = 0 THEN due_on END,
             CASE WHEN done = 1 THEN completed_at END DESC,
             id
  `)
    .all()
    .map(toPublicTask);
}

export function getTask(id) {
  return toPublicTask(stmt('SELECT * FROM tasks WHERE id = ?').get(id));
}

export function countTasks() {
  const row = stmt(`
    SELECT
      SUM(CASE WHEN done = 0 THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) AS done
    FROM tasks
  `).get();
  return { pending: row.pending ?? 0, done: row.done ?? 0 };
}

// --- Écriture ----------------------------------------------------------------

export function createTask(task, userId) {
  const result = stmt(`
    INSERT INTO tasks (title, due_on, recurrence, assignee_id, note, created_by)
    VALUES (:title, :dueOn, :recurrence, :assigneeId, :note, :createdBy)
  `).run({ ...task, createdBy: userId });

  return getTask(result.lastInsertRowid);
}

const COLONNES = {
  title: 'title',
  dueOn: 'due_on',
  recurrence: 'recurrence',
  assigneeId: 'assignee_id',
  note: 'note',
};

/**
 * @returns {{ task: object, rescheduled: boolean }}
 *   `rescheduled` signale une tâche récurrente qui, cochée, est repartie pour
 *   un tour au lieu d'être terminée. L'interface s'en sert pour l'annoncer,
 *   sans quoi la tâche semblerait n'avoir pas réagi.
 */
export function updateTask(id, fields) {
  const actuelle = getTask(id);
  const assignments = [];
  const values = [];

  for (const [champ, colonne] of Object.entries(COLONNES)) {
    // `undefined` = ne touche pas au champ ; `null` = vide-le.
    if (fields[champ] !== undefined) {
      assignments.push(`${colonne} = ?`);
      values.push(fields[champ]);
    }
  }

  let rescheduled = false;

  if (fields.done !== undefined) {
    const recurrence = fields.recurrence !== undefined ? fields.recurrence : actuelle.recurrence;
    const dueOn = fields.dueOn !== undefined ? fields.dueOn : actuelle.dueOn;

    if (fields.done && recurrence && dueOn) {
      // Une tâche qui revient ne se termine pas : elle se replanifie.
      assignments.push('done = 0', 'due_on = ?', "completed_at = datetime('now')");
      values.push(prochaineEcheance(dueOn, recurrence));
      rescheduled = true;
    } else if (fields.done) {
      assignments.push('done = 1', "completed_at = datetime('now')");
    } else {
      assignments.push('done = 0', 'completed_at = NULL');
    }
  }

  values.push(id);
  stmt(`UPDATE tasks SET ${assignments.join(', ')} WHERE id = ?`).run(...values);

  return { task: getTask(id), rescheduled };
}

export function deleteTask(id) {
  return stmt('DELETE FROM tasks WHERE id = ?').run(id).changes;
}

export function deleteCompleted() {
  return stmt('DELETE FROM tasks WHERE done = 1').run().changes;
}
