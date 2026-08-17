import { z } from 'zod';

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
 * Date de péremption, au format AAAA-MM-JJ.
 *
 * `null` est une valeur acceptée et signifiante : elle retire la date d'un
 * produit qui en avait une. Le contrôle ne s'arrête pas au format, il vérifie
 * aussi que le jour existe — sans quoi un 31 février serait accepté puis
 * réinterprété silencieusement par JavaScript comme le 3 mars.
 */
const expiresOn = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La date doit être au format AAAA-MM-JJ.')
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00Z`);
      // Le test de validité vient d'abord, et pas seulement par prudence : zod
      // exécute ce contrôle même lorsque le format a déjà échoué plus haut, et
      // `toISOString()` sur une date invalide lève une exception — qui
      // ressortirait en erreur 500 au lieu d'un message de validation.
      if (Number.isNaN(date.getTime())) return false;
      return date.toISOString().slice(0, 10) === value;
    },
    { message: "Cette date n'existe pas." },
  )
  .nullable();

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
