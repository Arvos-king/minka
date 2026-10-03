import { Router } from 'express';

import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  listGroupedIngredients,
  listRecipes,
  resoudre,
  updateRecipe,
} from './service.js';
import {
  createRecipeSchema,
  ingredientsQuerySchema,
  recipeParamsSchema,
  resolveSchema,
  updateRecipeSchema,
} from './schemas.js';
import { T } from './textes.js';

export const router = Router();

const recipeNotFound = () => new AppError(404, 'RECIPE_NOT_FOUND', T.introuvable);

router.get('/items', (req, res) => {
  res.json({ recipes: listRecipes() });
});

router.post('/items', validate({ body: createRecipeSchema }), (req, res) => {
  res.status(201).json({ recipe: createRecipe(req.valid.body, req.user.id) });
});

router.get('/items/:id', validate({ params: recipeParamsSchema }), (req, res) => {
  const recipe = getRecipe(req.valid.params.id);
  if (!recipe) throw recipeNotFound();

  res.json({ recipe });
});

router.patch(
  '/items/:id',
  validate({ params: recipeParamsSchema, body: updateRecipeSchema }),
  (req, res) => {
    const { id } = req.valid.params;
    if (!getRecipe(id)) throw recipeNotFound();

    res.json({ recipe: updateRecipe(id, req.valid.body) });
  },
);

/**
 * Supprime une recette du répertoire.
 *
 * Rien à annoncer sur les repas prévus, contrairement à autrefois : ce module
 * ne les connaît plus, et ils survivent à la suppression avec leur intitulé.
 */
router.delete('/items/:id', validate({ params: recipeParamsSchema }), (req, res) => {
  if (deleteRecipe(req.valid.params.id) === 0) throw recipeNotFound();

  res.json({ ok: true });
});

/**
 * Ingrédients de plusieurs recettes, regroupés — de quoi alimenter la liste de
 * courses.
 *
 * Le module ne les y envoie pas lui-même : c'est l'interface qui appelle
 * ensuite l'API publique du module courses, si celui-ci est monté. Le socle
 * interdit à deux modules de se connaître côté serveur.
 */
router.get('/ingredients', validate({ query: ingredientsQuerySchema }), (req, res) => {
  res.json({ ingredients: listGroupedIngredients(req.valid.query.ids) });
});

/**
 * Des intitulés en entrée, des identifiants de recettes en sortie.
 *
 * C'est par là que passe l'import d'une semaine de menus : le planning envoie
 * les plats qu'il a lus, reçoit de quoi les désigner, puis se pose lui-même.
 * Deux requêtes, deux transactions, et aucun des deux modules n'écrit dans les
 * tables de l'autre.
 *
 * `POST` bien qu'il s'agisse surtout d'une lecture : l'opération crée des
 * recettes, et la liste des plats — avec leurs ingrédients — ne tiendrait pas
 * dans une URL.
 */
router.post('/resolve', validate({ body: resolveSchema }), (req, res) => {
  res.json(resoudre(req.valid.body.plats, req.user.id));
});
