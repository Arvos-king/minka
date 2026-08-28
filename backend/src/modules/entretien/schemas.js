import { z } from 'zod';

import { isoDate } from '../../lib/schemas.js';

const label = z
  .string()
  .trim()
  .min(1, 'Le libellé est requis.')
  .max(160, 'Le libellé est trop long.');

/**
 * Pas de « quotidien » ici : un geste qu'on refait chaque jour n'est pas de
 * l'entretien, c'est du ménage courant — il a sa place dans les tâches.
 */
const recurrence = z.enum(['weekly', 'monthly', 'quarterly', 'biannual', 'yearly'], {
  message: 'Rythme inconnu.',
});

/** NULL = intervention qui ne se range dans aucune pièce, comme les vitres. */
const zoneId = z.number().int().positive().nullable();
const assigneeId = z.number().int().positive().nullable();
const note = z.string().trim().max(500, 'La note est trop longue.').nullable();

export const createTaskSchema = z.object({
  label,
  recurrence,
  dueOn: isoDate,
  zoneId: zoneId.default(null),
  assigneeId: assigneeId.default(null),
  note: note.default(null),
});

export const updateTaskSchema = z
  .object({
    label: label.optional(),
    recurrence: recurrence.optional(),
    dueOn: isoDate.optional(),
    zoneId: zoneId.optional(),
    assigneeId: assigneeId.optional(),
    note: note.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune modification fournie.',
  });

/** Le jour du geste : aujourd'hui par défaut, hier si on le déclare après coup. */
export const doneSchema = z.object({
  doneOn: isoDate.optional(),
});

export const snoozeSchema = z.object({
  days: z
    .number()
    .int()
    .min(1, 'Il faut repousser d’au moins un jour.')
    .max(365, 'Au-delà d’un an, mieux vaut changer le rythme.'),
});

export const zoneBodySchema = z.object({ label });

export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
