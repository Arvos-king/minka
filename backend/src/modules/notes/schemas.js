import { z } from 'zod';

/** `null` = pas de titre : il sera déduit de la première ligne du corps. */
const title = z.string().trim().max(120, 'Le titre est trop long.').nullable();

/**
 * Le corps d'une note. Généreux mais borné : le plafond de charge utile de
 * l'API est à 100 ko, et une note qui l'approcherait serait refusée par une
 * erreur bien moins claire que celle-ci.
 */
const body = z.string().max(20_000, 'Cette note est trop longue.');

const pinned = z.boolean();

export const createNoteSchema = z.object({
  title: title.default(null),
  body: body.default(''),
  pinned: pinned.default(false),
});

export const updateNoteSchema = z
  .object({
    title: title.optional(),
    body: body.optional(),
    pinned: pinned.optional(),
    /**
     * Version que le client croit modifier.
     *
     * Facultative à dessein : l'épinglage ne touche pas au texte et n'a donc
     * rien à écraser, tandis qu'une sauvegarde de l'éditeur la fournit
     * toujours. Exiger la version partout obligerait l'interface à la connaître
     * même là où elle n'a aucun sens.
     */
    expectedVersion: z.number().int().positive().optional(),
  })
  .refine(
    (value) => Object.keys(value).some((cle) => cle !== 'expectedVersion'),
    { message: 'Aucune modification fournie.' },
  );

export const noteParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
