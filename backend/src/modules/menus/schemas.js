import { z } from 'zod';

import { isoDate } from '../../lib/schemas.js';

const title = z
  .string()
  .trim()
  .min(1, "L'intitulé de la recette est requis.")
  .max(120, "L'intitulé est trop long.");

/** NULL = non précisé. Une recette n'a pas à déclarer pour combien elle est. */
const servings = z
  .number()
  .int('Le nombre de parts doit être un entier.')
  .min(1, 'Il faut au moins une part.')
  .max(50, 'Ce nombre de parts est déraisonnable.')
  .nullable();

const notes = z.string().trim().max(4000, 'La préparation est trop longue.').nullable();

/**
 * Un ingrédient : un nom, et une quantité en texte libre.
 *
 * `quantity` n'est volontairement pas un nombre — voir le commentaire de la
 * migration. « Un filet » doit passer.
 */
const ingredient = z.object({
  name: z.string().trim().min(1, "Le nom de l'ingrédient est requis.").max(120, 'Ce nom est trop long.'),
  quantity: z.string().trim().max(60, 'Cette quantité est trop longue.').nullable().default(null),
});

const ingredients = z
  .array(ingredient)
  .max(60, 'Cette recette a trop d’ingrédients.')
  .default([]);

export const createRecipeSchema = z.object({
  title,
  servings: servings.default(null),
  notes: notes.default(null),
  ingredients,
});

export const updateRecipeSchema = z
  .object({
    title: title.optional(),
    servings: servings.optional(),
    notes: notes.optional(),
    // Fournie, la liste remplace l'ancienne en entier. Absente, elle n'est pas
    // touchée : renommer une recette n'efface pas ses ingrédients.
    ingredients: z.array(ingredient).max(60).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune modification fournie.',
  });

export const recipeParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// --- Planning ----------------------------------------------------------------

export const slot = z.enum(['midi', 'soir'], {
  message: 'Le moment doit être « midi » ou « soir ».',
});

export const planParamsSchema = z.object({
  date: isoDate,
  slot,
});

/**
 * Contenu d'une case : une recette, ou un texte libre, jamais les deux.
 *
 * La règle porte sur la relation entre les deux champs, elle ne peut donc pas
 * s'exprimer sur l'un ou l'autre pris isolément — même raisonnement que pour la
 * cohérence d'un événement du calendrier.
 */
export const setEntrySchema = z
  .object({
    recipeId: z.number().int().positive().nullable().default(null),
    freeText: z.string().trim().min(1).max(120, 'Ce texte est trop long.').nullable().default(null),
  })
  .refine((value) => (value.recipeId === null) !== (value.freeText === null), {
    message: 'Indique une recette ou un texte, mais pas les deux.',
  });

export const planQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
});
