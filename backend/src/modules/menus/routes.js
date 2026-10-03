import { Router } from 'express';

import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import {
  clearEntry,
  deplacerRepas,
  fixerCases,
  importerSemaine,
  listPlan,
  setEntry,
  textesLibresFrequents,
} from './service.js';
import {
  deplacerSchema,
  fixerCasesSchema,
  importSchema,
  planParamsSchema,
  planQuerySchema,
  setEntrySchema,
} from './schemas.js';
import { T } from './textes.js';

export const router = Router();

/**
 * 409 : le planning n'est plus celui sur lequel le geste a été pensé. Rien n'a
 * été écrit ; l'interface recharge et laisse recommencer.
 */
const planModifie = (message) => new AppError(409, 'PLAN_CONFLICT', message);

router.get('/plan', validate({ query: planQuerySchema }), (req, res) => {
  res.json({ entries: listPlan(req.valid.query) });
});

/** Les textes libres les plus fréquents du foyer, proposés en raccourcis. */
router.get('/raccourcis', (req, res) => {
  res.json({ raccourcis: textesLibresFrequents() });
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
 * Déplace un repas, en poussant ce qu'il déloge.
 *
 * Glisser par la poignée, poser par « Déplacer… », « Décaler d'un jour » :
 * trois gestes, une seule route. La réponse rend chaque case touchée avec son
 * état d'avant, de quoi annuler, et d'après, de quoi afficher.
 */
router.post('/plan/deplacer', validate({ body: deplacerSchema }), (req, res) => {
  const { de, vers } = req.valid.body;

  const cases = deplacerRepas(de, vers);
  if (!cases) throw planModifie(T.repasDeplace);

  res.json({ cases });
});

/**
 * Fixe plusieurs cases d'un bloc, sous condition de ce qu'elles portent.
 *
 * `PATCH` : seules les cases citées changent, le reste du planning est
 * intact. C'est ce qu'emploie « Annuler », qui rétablit l'état d'avant d'une
 * réorganisation en attendant celui d'après.
 */
router.patch('/plan', validate({ body: fixerCasesSchema }), (req, res) => {
  const cases = fixerCases(req.valid.body.cases);
  if (!cases) throw planModifie(T.planningChange);

  res.json({ cases });
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
