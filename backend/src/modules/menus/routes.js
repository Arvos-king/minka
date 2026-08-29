import { Router } from 'express';

import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import {
  clearEntry,
  countPlanned,
  createRecipe,
  deleteRecipe,
  getRecipe,
  listPlan,
  listRecipes,
  importerSemaine,
  listShoppingIngredients,
  setEntry,
  updateRecipe,
} from './service.js';
import {
  createRecipeSchema,
  importSchema,
  planParamsSchema,
  planQuerySchema,
  recipeParamsSchema,
  setEntrySchema,
  updateRecipeSchema,
} from './schemas.js';

export const router = Router();

const recipeNotFound = () => new AppError(404, 'RECIPE_NOT_FOUND', "Cette recette n'existe plus.");

// --- Recettes ----------------------------------------------------------------

router.get('/recipes', (req, res) => {
  res.json({ recipes: listRecipes() });
});

router.post('/recipes', validate({ body: createRecipeSchema }), (req, res) => {
  res.status(201).json({ recipe: createRecipe(req.valid.body, req.user.id) });
});

router.get('/recipes/:id', validate({ params: recipeParamsSchema }), (req, res) => {
  const recipe = getRecipe(req.valid.params.id);
  if (!recipe) throw recipeNotFound();

  res.json({ recipe });
});

router.patch(
  '/recipes/:id',
  validate({ params: recipeParamsSchema, body: updateRecipeSchema }),
  (req, res) => {
    const { id } = req.valid.params;
    if (!getRecipe(id)) throw recipeNotFound();

    res.json({ recipe: updateRecipe(id, req.valid.body) });
  },
);

router.delete('/recipes/:id', validate({ params: recipeParamsSchema }), (req, res) => {
  const { id } = req.valid.params;

  // Compté avant la suppression : les cases du planning partent avec la
  // recette, et l'interface l'a annoncé.
  const unplanned = countPlanned(id);
  if (deleteRecipe(id) === 0) throw recipeNotFound();

  res.json({ ok: true, unplanned });
});

// --- Planning ----------------------------------------------------------------

router.get('/plan', validate({ query: planQuerySchema }), (req, res) => {
  res.json({ entries: listPlan(req.valid.query) });
});

/**
 * `PUT` et non `POST` : une case est une ressource adressable, dont on fixe le
 * contenu. Poser deux fois le même repas au même endroit donne le même
 * résultat, ce qu'un `POST` ne promettrait pas.
 */
router.put(
  '/plan/:date/:slot',
  validate({ params: planParamsSchema, body: setEntrySchema }),
  (req, res) => {
    const { date, slot } = req.valid.params;
    const { recipeId, freeText } = req.valid.body;

    if (recipeId !== null && !getRecipe(recipeId)) throw recipeNotFound();

    res.json({ entry: setEntry({ onDate: date, slot, recipeId, freeText }) });
  },
);

router.delete('/plan/:date/:slot', validate({ params: planParamsSchema }), (req, res) => {
  const { date, slot } = req.valid.params;
  // Vider une case déjà vide n'est pas une erreur : le geste a le résultat
  // attendu, et l'autre a pu la vider entre-temps.
  res.json({ ok: true, cleared: clearEntry(date, slot) });
});

/**
 * Ingrédients de la semaine, regroupés — de quoi alimenter la liste de courses.
 *
 * Le module ne les y envoie pas lui-même : c'est l'interface qui appelle
 * ensuite l'API publique du module courses, si celui-ci est monté. Le socle
 * interdit à deux modules de se connaître côté serveur.
 */
router.get('/ingredients', validate({ query: planQuerySchema }), (req, res) => {
  res.json({ ingredients: listShoppingIngredients(req.valid.query) });
});

/**
 * Pose une semaine entière depuis une proposition rédigée ailleurs.
 *
 * Une seule requête, une seule transaction : sept allers-retours pour sept
 * jours laisseraient un planning à moitié rempli si la connexion lâchait au
 * milieu.
 */
router.post('/import', validate({ body: importSchema }), (req, res) => {
  res.json({ bilan: importerSemaine(req.valid.body.entries, req.user.id) });
});
