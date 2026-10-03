import { z } from 'zod';

import { isoDate } from '../../lib/schemas.js';
import { T as SOCLE } from '../../textes.js';
import { T } from './textes.js';

const title = z
  .string()
  .trim()
  .min(1, T.schemas.intituleRequis)
  .max(160, T.schemas.intituleTropLong);

/** Rythmes proposés. `null` = tâche à faire une seule fois. */
export const RECURRENCES = ['daily', 'weekly', 'monthly', 'quarterly', 'biannual', 'yearly'];

const recurrence = z
  .enum(RECURRENCES, { message: T.schemas.rythmeInconnu })
  .nullable();

const note = z.string().trim().max(500, T.schemas.noteTropLongue).nullable();
const assigneeId = z.number().int().positive().nullable();

export const createTaskSchema = z
  .object({
    title,
    dueOn: isoDate.nullable().default(null),
    recurrence: recurrence.default(null),
    assigneeId: assigneeId.default(null),
    note: note.default(null),
  })
  /*
   * Une tâche qui revient a besoin d'un point de départ : sans échéance, on ne
   * saurait pas à quelle date la replanifier une fois cochée. Le refuser ici
   * évite une tâche récurrente qui ne reviendrait jamais.
   */
  .refine((valeur) => !valeur.recurrence || valeur.dueOn, {
    path: ['dueOn'],
    message: T.schemas.echeanceDeDepart,
  });

export const updateTaskSchema = z
  .object({
    title: title.optional(),
    done: z.boolean().optional(),
    dueOn: isoDate.nullable().optional(),
    recurrence: recurrence.optional(),
    assigneeId: assigneeId.optional(),
    note: note.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: SOCLE.erreurs.aucuneModification,
  });

export const listQuerySchema = z.object({
  status: z.enum(['pending', 'done', 'all']).default('all'),
});

export const taskParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
