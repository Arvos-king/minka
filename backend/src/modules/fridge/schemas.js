import { z } from 'zod';

import { isoDate } from '../../lib/schemas.js';

const name = z
  .string()
  .trim()
  .min(1, 'Le nom du produit est requis.')
  .max(120, 'Le nom est trop long.');

const quantity = z
  .number()
  .int('La quantité doit être un nombre entier.')
  .min(1, 'La quantité doit être au moins de 1.')
  .max(99, 'La quantité ne peut pas dépasser 99.');

/**
 * Date de péremption. `null` est une valeur acceptée et signifiante : elle
 * retire la date d'un produit qui en avait une.
 */
const expiresOn = isoDate.nullable();

export const createItemSchema = z.object({
  name,
  quantity: quantity.default(1),
  expiresOn: expiresOn.default(null),
});

export const updateItemSchema = z
  .object({
    name: name.optional(),
    quantity: quantity.optional(),
    expiresOn: expiresOn.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune modification fournie.',
  });

export const itemParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
