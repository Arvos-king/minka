import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import { clearEntry, importerSemaine, listPlan, setEntry } from './service.js';
import { importSchema, planParamsSchema, planQuerySchema, setEntrySchema } from './schemas.js';

export const router = Router();

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
    const { recipeId, title } = req.valid.body;

    res.json({ entry: setEntry({ onDate: date, slot, recipeId, title }) });
  },
);

router.delete('/plan/:date/:slot', validate({ params: planParamsSchema }), (req, res) => {
  const { date, slot } = req.valid.params;
  // Vider une case déjà vide n'est pas une erreur : le geste a le résultat
  // attendu, et l'autre a pu la vider entre-temps.
  res.json({ ok: true, cleared: clearEntry(date, slot) });
});

/**
 * Pose une semaine entière depuis une proposition rédigée ailleurs.
 *
 * Les cases arrivent déjà résolues : c'est l'interface qui a soumis les plats
 * au module recettes avant d'appeler ici. Ce module-ci ne crée aucune recette,
 * il ne fait plus que remplir son planning.
 */
router.post('/import', validate({ body: importSchema }), (req, res) => {
  res.json({ bilan: importerSemaine(req.valid.body.entries) });
});
