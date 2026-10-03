import { z } from 'zod';

import { isoDate } from '../../lib/schemas.js';
import { T as SOCLE } from '../../textes.js';
import { T } from './textes.js';

const name = z
  .string()
  .trim()
  .min(1, T.schemas.nomRequis)
  .max(120, T.schemas.nomTropLong);

const quantity = z
  .number()
  .int(T.schemas.quantiteEntiere)
  .min(1, T.schemas.quantiteMin)
  .max(99, T.schemas.quantiteMax);

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
    message: SOCLE.erreurs.aucuneModification,
  });

export const itemParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
