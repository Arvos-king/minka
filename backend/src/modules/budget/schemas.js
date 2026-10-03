import { z } from 'zod';

import { isoDate } from '../../lib/schemas.js';
import { T as SOCLE } from '../../textes.js';
import { T } from './textes.js';

const label = z
  .string()
  .trim()
  .min(1, T.schemas.libelleRequis)
  .max(120, T.schemas.libelleTropLong);

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
  .int(T.schemas.montantEntier)
  .min(1, T.schemas.montantPositif)
  .max(100_000_000, T.schemas.montantDemesure);

/** NULL = catégorie suivie sans objectif de dépense. */
const monthlyBudgetCents = z
  .number()
  .int()
  .min(0)
  .max(100_000_000, T.schemas.plafondDemesure)
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
    message: SOCLE.erreurs.aucuneModification,
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
    message: SOCLE.erreurs.aucuneModification,
  });

export const periodQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
});

export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
