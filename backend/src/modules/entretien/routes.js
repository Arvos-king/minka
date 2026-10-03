import { Router } from 'express';

import { personExists } from '../../lib/people.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { T as SOCLE } from '../../textes.js';
import {
  createTask,
  createZone,
  deleteTask,
  deleteZone,
  getTask,
  getZone,
  listTasks,
  listZones,
  markDone,
  snooze,
  updateTask,
  updateZone,
} from './service.js';
import {
  createTaskSchema,
  doneSchema,
  idParamsSchema,
  snoozeSchema,
  updateTaskSchema,
  zoneBodySchema,
} from './schemas.js';
import { T } from './textes.js';

export const router = Router();

const taskNotFound = () => new AppError(404, 'MAINTENANCE_TASK_NOT_FOUND', T.introuvable);
const zoneNotFound = () => new AppError(404, 'ZONE_NOT_FOUND', T.pieceIntrouvable);
const zoneTaken = () => new AppError(409, 'ZONE_LABEL_TAKEN', T.pieceDejaPrise);

function verifierReferences({ zoneId, assigneeId }) {
  if (zoneId != null && !getZone(zoneId)) throw zoneNotFound();
  if (assigneeId != null && !personExists(assigneeId)) {
    throw new AppError(400, 'PERSON_NOT_FOUND', SOCLE.erreurs.personneDisparue);
  }
}

// --- Pièces ------------------------------------------------------------------

router.get('/zones', (req, res) => {
  res.json({ zones: listZones() });
});

router.post('/zones', validate({ body: zoneBodySchema }), (req, res) => {
  const zone = createZone(req.valid.body.label);
  if (!zone) throw zoneTaken();

  res.status(201).json({ zone });
});

router.patch(
  '/zones/:id',
  validate({ params: idParamsSchema, body: zoneBodySchema }),
  (req, res) => {
    const { id } = req.valid.params;
    if (!getZone(id)) throw zoneNotFound();

    const zone = updateZone(id, req.valid.body.label);
    if (!zone) throw zoneTaken();

    res.json({ zone });
  },
);

router.delete('/zones/:id', validate({ params: idParamsSchema }), (req, res) => {
  if (deleteZone(req.valid.params.id) === 0) throw zoneNotFound();

  // Les interventions restent : elles perdent seulement leur pièce.
  res.json({ ok: true });
});

// --- Interventions -----------------------------------------------------------

router.get('/tasks', (req, res) => {
  res.json({ tasks: listTasks(), zones: listZones() });
});

router.post('/tasks', validate({ body: createTaskSchema }), (req, res) => {
  verifierReferences(req.valid.body);

  res.status(201).json({ task: createTask(req.valid.body) });
});

router.patch(
  '/tasks/:id',
  validate({ params: idParamsSchema, body: updateTaskSchema }),
  (req, res) => {
    const { id } = req.valid.params;
    if (!getTask(id)) throw taskNotFound();
    verifierReferences(req.valid.body);

    res.json({ task: updateTask(id, req.valid.body) });
  },
);

/**
 * « C'est fait ». Le prochain passage se compte depuis ce jour-là, et non
 * depuis l'échéance manquée — voir `markDone`.
 */
router.post(
  '/tasks/:id/done',
  validate({ params: idParamsSchema, body: doneSchema }),
  (req, res) => {
    const task = markDone(req.valid.params.id, req.valid.body.doneOn);
    if (!task) throw taskNotFound();

    res.json({ task });
  },
);

/** « Pas maintenant » : l'échéance recule, mais le geste n'est pas déclaré fait. */
router.post(
  '/tasks/:id/snooze',
  validate({ params: idParamsSchema, body: snoozeSchema }),
  (req, res) => {
    const task = snooze(req.valid.params.id, req.valid.body.days);
    if (!task) throw taskNotFound();

    res.json({ task });
  },
);

router.delete('/tasks/:id', validate({ params: idParamsSchema }), (req, res) => {
  if (deleteTask(req.valid.params.id) === 0) throw taskNotFound();

  res.json({ ok: true });
});
