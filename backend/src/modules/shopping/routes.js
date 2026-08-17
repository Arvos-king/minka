import { Router } from 'express';

import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import {
  countItems,
  createItem,
  deleteCompleted,
  deleteItem,
  getItem,
  listItems,
  updateItem,
} from './service.js';
import { createItemSchema, itemParamsSchema, listQuerySchema, updateItemSchema } from './schemas.js';

export const router = Router();

const itemNotFound = () => new AppError(404, 'ITEM_NOT_FOUND', "Cet article n'existe plus.");

router.get('/items', validate({ query: listQuerySchema }), (req, res) => {
  res.json({ items: listItems(req.valid.query.status), counts: countItems() });
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

    res.json({ item: updateItem(id, req.valid.body), counts: countItems() });
  },
);

router.delete('/items/:id', validate({ params: itemParamsSchema }), (req, res) => {
  if (deleteItem(req.valid.params.id) === 0) throw itemNotFound();

  res.json({ ok: true, counts: countItems() });
});
