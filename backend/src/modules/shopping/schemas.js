import { z } from 'zod';

/** Quantité : un entier raisonnable, ajusté par les boutons − / + de l'interface. */
const quantity = z
  .number()
  .int('La quantité doit être un nombre entier.')
  .min(1, 'La quantité doit être au moins de 1.')
  .max(99, 'La quantité ne peut pas dépasser 99.');

const name = z
  .string()
  .trim()
  .min(1, "Le nom de l'article est requis.")
  .max(120, 'Le nom est trop long.');

export const listQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'all']).default('all'),
});

export const createItemSchema = z.object({
  name,
  quantity: quantity.default(1),
});

export const updateItemSchema = z
  .object({
    name: name.optional(),
    quantity: quantity.optional(),
    completed: z.boolean().optional(),
  })
  // Un PATCH vide est probablement un bug côté client : mieux vaut le dire que
  // de répondre « c'est fait » sans avoir rien fait.
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune modification fournie.',
  });

export const itemParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
