import { Router } from 'express';

import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { RAYONS } from './rayons.js';
import {
  apprendreRayon,
  countItems,
  createItem,
  deleteCompleted,
  deleteItem,
  getItem,
  listItems,
  updateItem,
} from './service.js';
import { createItemSchema, itemParamsSchema, listQuerySchema, updateItemSchema } from './schemas.js';
import { T } from './textes.js';

export const router = Router();

const itemNotFound = () => new AppError(404, 'ITEM_NOT_FOUND', T.introuvable);

/*
 * Les rayons voyagent avec les articles qu'ils ordonnent, plutôt que par une
 * route à eux : c'est un aller-retour de moins sur l'écran le plus utilisé, une
 * entrée de moins dans le cache hors ligne, et surtout aucun désaccord possible
 * entre les clés que portent les articles et la liste qui les met en ordre —
 * un client hors ligne servirait sinon des articles rangés dans un rayon que sa
 * liste en cache, plus ancienne, ne connaîtrait pas.
 */
router.get('/items', validate({ query: listQuerySchema }), (req, res) => {
  res.json({ items: listItems(req.valid.query.status), counts: countItems(), rayons: RAYONS });
});

router.post('/items', validate({ body: createItemSchema }), (req, res) => {
  const { name, quantity } = req.valid.body;
  const item = createItem({ name, quantity, userId: req.user.id });
  res.status(201).json({ item, counts: countItems() });
});

/*
 * Cette route doit impérativement être déclarée avant `/items/:id` : Express
 * essaie les routes dans l'ordre, et « completed » serait sinon capturé comme
 * un identifiant.
 */
router.delete('/items/completed', (req, res) => {
  const deleted = deleteCompleted();
  res.json({ deleted, counts: countItems() });
});

router.patch(
  '/items/:id',
  validate({ params: itemParamsSchema, body: updateItemSchema }),
  (req, res) => {
    const { id } = req.valid.params;
    if (!getItem(id)) throw itemNotFound();

    const item = updateItem(id, req.valid.body);

    // Corriger un rayon, c'est une décision sur un produit et pas sur une
    // ligne : on la retient, et on l'applique aux articles du même produit déjà
    // en liste. Un renommage ou un cochage ne rangent rien et n'apprennent
    // rien — voir `apprendreRayon`.
    const autresRanges =
      req.valid.body.rayon === undefined ? undefined : apprendreRayon(item, req.valid.body.rayon);

    res.json({ item, counts: countItems(), ...(autresRanges ? { autresRanges } : {}) });
  },
);

router.delete('/items/:id', validate({ params: itemParamsSchema }), (req, res) => {
  if (deleteItem(req.valid.params.id) === 0) throw itemNotFound();

  res.json({ ok: true, counts: countItems() });
});
