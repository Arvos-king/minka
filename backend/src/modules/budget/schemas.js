import { z } from 'zod';

import { isoDate } from '../../lib/schemas.js';

const label = z
  .string()
  .trim()
  .min(1, 'Le libellé est requis.')
  .max(120, 'Le libellé est trop long.');

/**
 * Montant en centimes, toujours entier.
 *
 * Le client convertit « 12,50 » en 1250 avant d'envoyer : la virgule n'arrive
 * jamais jusqu'ici, et aucun flottant ne s'approche d'une somme d'argent.
 * Le plafond d'un million d'euros n'est pas une limite de bon sens mais un
 * garde-fou contre une saisie aberrante — un zéro de trop se repère mal.
 */
const amountCents = z
  .number()
  .int('Le montant doit être un nombre entier de centimes.')
  .min(1, 'Le montant doit être supérieur à zéro.')
  .max(100_000_000, 'Ce montant est hors de proportion.');

/** NULL = catégorie suivie sans objectif de dépense. */
const monthlyBudgetCents = z
  .number()
  .int()
  .min(0)
  .max(100_000_000, 'Ce plafond est hors de proportion.')
  .nullable();

/** NULL = le foyer, sans plus de précision. */
const personId = z.number().int().positive().nullable();
const categoryId = z.number().int().positive().nullable();

export const createExpenseSchema = z.object({
  label,
  amountCents,
  spentOn: isoDate,
  categoryId: categoryId.default(null),
  personId: personId.default(null),
});

export const updateExpenseSchema = z
  .object({
    label: label.optional(),
    amountCents: amountCents.optional(),
    spentOn: isoDate.optional(),
    categoryId: categoryId.optional(),
    personId: personId.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune modification fournie.',
  });

export const createCategorySchema = z.object({
  label,
  monthlyBudgetCents: monthlyBudgetCents.default(null),
});

export const updateCategorySchema = z
  .object({
    label: label.optional(),
    monthlyBudgetCents: monthlyBudgetCents.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune modification fournie.',
  });

export const periodQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
});

export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
