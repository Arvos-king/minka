import { z } from 'zod';

import { T as SOCLE } from '../../textes.js';
import { T } from './textes.js';

const title = z
  .string()
  .trim()
  .min(1, T.schemas.intituleRequis)
  .max(120, T.schemas.intituleTropLong);

/** NULL = non précisé. Une recette n'a pas à déclarer pour combien elle est. */
const servings = z
  .number()
  .int(T.schemas.partsEntier)
  .min(1, T.schemas.partsMin)
  .max(50, T.schemas.partsMax)
  .nullable();

const notes = z.string().trim().max(4000, T.schemas.remarquesTropLongues).nullable();

/**
 * Une étape de la préparation.
 *
 * Un objet et non une simple chaîne, pour rester symétrique de ce que renvoie
 * l'API — où l'étape porte l'identifiant qui sert à la cocher.
 */
const step = z.object({
  text: z
    .string()
    .trim()
    .min(1, T.schemas.etapeVide)
    .max(500, T.schemas.etapeTropLongue),
});

const steps = z.array(step).max(60, T.schemas.tropDEtapes).default([]);

/**
 * Une étiquette : « végétarien », « rapide », « les enfants aiment ».
 *
 * Courte par construction — au-delà, ce n'est plus une étiquette mais une
 * remarque, et le champ prévu pour cela existe.
 */
const tag = z
  .string()
  .trim()
  .min(1, T.schemas.etiquetteVide)
  .max(30, T.schemas.etiquetteTropLongue);

const tags = z.array(tag).max(12, T.schemas.tropDEtiquettes).default([]);

/**
 * Un ingrédient : un nom, et une quantité en texte libre.
 *
 * `quantity` n'est volontairement pas un nombre — voir le commentaire de la
 * migration. « Un filet » doit passer.
 */
const ingredient = z.object({
  name: z.string().trim().min(1, T.schemas.ingredientRequis).max(120, T.schemas.nomTropLong),
  quantity: z.string().trim().max(60, T.schemas.quantiteTropLongue).nullable().default(null),
});

const ingredients = z
  .array(ingredient)
  .max(60, T.schemas.tropDIngredients)
  .default([]);

export const createRecipeSchema = z.object({
  title,
  servings: servings.default(null),
  notes: notes.default(null),
  ingredients,
  steps,
  tags,
});

export const updateRecipeSchema = z
  .object({
    title: title.optional(),
    servings: servings.optional(),
    notes: notes.optional(),
    // Fournies, ces listes remplacent les anciennes en entier. Absentes, elles
    // ne sont pas touchées : renommer une recette n'efface pas ses ingrédients.
    ingredients: z.array(ingredient).max(60).optional(),
    steps: z.array(step).max(60).optional(),
    tags: z.array(tag).max(12).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: SOCLE.erreurs.aucuneModification,
  });

export const recipeParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * `?ids=1,2,5` — les recettes dont on veut les ingrédients regroupés.
 *
 * Une liste dans l'URL plutôt qu'un corps de requête : c'est une lecture, et
 * elle doit rester cachable par le service worker comme les autres GET.
 *
 * Absent ou vide vaut « aucune recette », pas une erreur : une semaine sans
 * recette est un cas normal, et le module qui demande n'a pas à filtrer ce cas
 * avant d'appeler.
 */
/** Des entiers positifs séparés par des virgules, les espaces tolérés. */
const LISTE_IDS = /^[1-9]\d*(\s*,\s*[1-9]\d*)*$/;

export const ingredientsQuerySchema = z.object({
  ids: z
    .string()
    .trim()
    .default('')
    // Le format est vérifié sur la chaîne brute, avant toute conversion : sinon
    // « abc » ressort en NaN et c'est zod qui rédige le message, en anglais.
    .refine((valeur) => valeur === '' || LISTE_IDS.test(valeur), {
      message: T.schemas.identifiants,
    })
    .transform((valeur) =>
      valeur === '' ? [] : valeur.split(',').map((part) => Number(part.trim())),
    )
    .pipe(z.array(z.number().int().positive()).max(120, T.schemas.tropDeRecettes)),
});

/**
 * Des plats désignés par leur intitulé, à retrouver, à créer ou à compléter.
 *
 * C'est ce qui permet à un autre module — le planning des menus, le connecteur
 * Claude — de poser une semaine sans jamais toucher aux tables des recettes :
 * il envoie des intitulés, il reçoit des identifiants.
 *
 * Un plat peut arriver avec tout ce qu'une recette porte : parts, remarque,
 * ingrédients, étapes, étiquettes. Ce que le répertoire en garde dépend de ce
 * qu'il sait déjà — voir `resolution.js`.
 *
 * Le plafond est un garde-fou, pas une règle métier : le nombre de repas d'une
 * semaine regarde celui qui appelle, pas le répertoire.
 */
export const resolveSchema = z.object({
  plats: z
    .array(
      z.object({
        title,
        servings: servings.default(null),
        notes: notes.default(null),
        ingredients,
        steps,
        tags,
      }),
    )
    .min(1, T.schemas.aucunPlat)
    .max(50, T.schemas.tropDePlats),
});
