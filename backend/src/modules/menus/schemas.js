import { z } from 'zod';

import { isoDate } from '../../lib/schemas.js';

export const slot = z.enum(['midi', 'soir'], {
  message: 'Le moment doit être « midi » ou « soir ».',
});

export const planParamsSchema = z.object({
  date: isoDate,
  slot,
});

/**
 * Intitulé d'une case : le nom recopié d'une recette, ou un texte libre.
 *
 * La même longueur que le titre d'une recette, forcément — c'est souvent l'un
 * ou l'autre.
 */
const title = z
  .string()
  .trim()
  .min(1, 'Indique ce qui est prévu.')
  .max(120, 'Ce texte est trop long.');

/**
 * Contenu d'une case.
 *
 * `title` est toujours requis, `recipeId` facultatif. La case porte son
 * intitulé, que la recette existe encore ou non, et que le module recettes soit
 * installé ou non : c'est ce qui permet au planning de s'afficher sans jamais
 * l'interroger.
 *
 * L'existence de la recette n'est **pas** vérifiée ici, et ne peut pas l'être :
 * ses tables appartiennent à un autre module. `recipe_id` est un pointeur
 * souple, assumé comme tel — un identifiant devenu caduc ne casse rien, il fait
 * juste retomber la case sur son intitulé.
 */
export const setEntrySchema = z.object({
  recipeId: z.number().int().positive().nullable().default(null),
  title,
});

export const planQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
});

/**
 * Une semaine posée d'un coup.
 *
 * Les recettes ont déjà été retrouvées ou créées avant l'appel, auprès du
 * module recettes : il ne reste ici que des cases à remplir.
 */
export const importSchema = z.object({
  entries: z
    .array(
      z.object({
        onDate: isoDate,
        slot,
        recipeId: z.number().int().positive().nullable().default(null),
        title,
      }),
    )
    .min(1, 'Aucun repas à importer.')
    .max(14, 'Une semaine compte au plus quatorze repas.'),
});
