import { Router } from 'express';

import { personExists } from '../../lib/people.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import {
  createTaskSchema,
  listQuerySchema,
  taskParamsSchema,
  updateTaskSchema,
} from './schemas.js';
import {
  countTasks,
  createTask,
  deleteCompleted,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from './service.js';

export const router = Router();

const taskNotFound = () => new AppError(404, 'TASK_NOT_FOUND', "Cette tâche n'existe plus.");

function verifierPersonne(assigneeId) {
  if (assigneeId !== undefined && assigneeId !== null && !personExists(assigneeId)) {
    throw new AppError(400, 'UNKNOWN_PERSON', "Ce membre du foyer n'existe pas.");
  }
}

router.get('/items', validate({ query: listQuerySchema }), (req, res) => {
  res.json({ tasks: listTasks(req.valid.query.status), counts: countTasks() });
});

router.post('/items', validate({ body: createTaskSchema }), (req, res) => {
  verifierPersonne(req.valid.body.assigneeId);
  res.status(201).json({ task: createTask(req.valid.body, req.user.id), counts: countTasks() });
});

/*
 * Déclarée avant `/items/:id` : Express essaie les routes dans l'ordre, et
 * « completed » serait sinon capturé comme un identifiant.
 */
router.delete('/items/completed', (req, res) => {
  res.json({ deleted: deleteCompleted(), counts: countTasks() });
});

router.patch(
  '/items/:id',
  validate({ params: taskParamsSchema, body: updateTaskSchema }),
  (req, res) => {
    const { id } = req.valid.params;
    const existante = getTask(id);
    if (!existante) throw taskNotFound();

    verifierPersonne(req.valid.body.assigneeId);

    // Même règle qu'à la création : une tâche qui se répète a besoin d'une
    // échéance, sinon elle ne reviendrait jamais. On vérifie l'état résultant.
    const resultante = { ...existante, ...req.valid.body };
    if (resultante.recurrence && !resultante.dueOn) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Données invalides.', [
        { champ: 'dueOn', message: 'Une tâche qui se répète a besoin d’une échéance.' },
      ]);
    }

    const { task, rescheduled } = updateTask(id, req.valid.body);
    res.json({ task, rescheduled, counts: countTasks() });
  },
);

router.delete('/items/:id', validate({ params: taskParamsSchema }), (req, res) => {
  if (deleteTask(req.valid.params.id) === 0) throw taskNotFound();

  res.json({ ok: true, counts: countTasks() });
});
