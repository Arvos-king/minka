import { z } from 'zod';

import { T as SOCLE } from '../../textes.js';
import { CLES_RAYONS } from './rayons.js';
import { T } from './textes.js';

/** Quantité : un entier raisonnable, ajusté par les boutons − / + de l'interface. */
const quantity = z
  .number()
  .int(T.schemas.quantiteEntiere)
  .min(1, T.schemas.quantiteMin)
  .max(99, T.schemas.quantiteMax);

const name = z
  .string()
  .trim()
  .min(1, T.schemas.nomRequis)
  .max(120, T.schemas.nomTropLong);

export const listQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'all']).default('all'),
});

/**
 * La création n'accepte pas de rayon : c'est le serveur qui classe, toujours.
 * C'est ce qui fait arriver rangés les articles poussés par le frigo et par les
 * menus, et cela évite un second chemin, silencieux, pour poser un rayon.
 */
export const createItemSchema = z.object({
  name,
  quantity: quantity.default(1),
});

export const updateItemSchema = z
  .object({
    name: name.optional(),
    quantity: quantity.optional(),
    completed: z.boolean().optional(),
    // L'énumération est construite depuis `rayons.js`, jamais écrite à la
    // main : elle ne peut donc pas dériver du dictionnaire, et un rayon retiré
    // du code devient immédiatement refusé par l'API.
    rayon: z.enum(CLES_RAYONS, { error: T.schemas.rayonInconnu }).optional(),
  })
  // Un PATCH vide est probablement un bug côté client : mieux vaut le dire que
  // de répondre « c'est fait » sans avoir rien fait.
  .refine((value) => Object.keys(value).length > 0, {
    message: SOCLE.erreurs.aucuneModification,
  });

export const itemParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
