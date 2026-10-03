import { Router } from 'express';

import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { createItemSchema, itemParamsSchema, updateItemSchema } from './schemas.js';
import { createItem, deleteItem, getItem, listItems, updateItem } from './service.js';
import { T } from './textes.js';

export const router = Router();

const itemNotFound = () => new AppError(404, 'ITEM_NOT_FOUND', T.introuvable);

router.get('/items', (req, res) => {
  res.json({ items: listItems() });
});

router.post('/items', validate({ body: createItemSchema }), (req, res) => {
  const { name, quantity, expiresOn } = req.valid.body;
  res.status(201).json({ item: createItem({ name, quantity, expiresOn, userId: req.user.id }) });
});

router.patch(
  '/items/:id',
  validate({ params: itemParamsSchema, body: updateItemSchema }),
  (req, res) => {
    const { id } = req.valid.params;
    if (!getItem(id)) throw itemNotFound();

    res.json({ item: updateItem(id, req.valid.body) });
  },
);

router.delete('/items/:id', validate({ params: itemParamsSchema }), (req, res) => {
  if (deleteItem(req.valid.params.id) === 0) throw itemNotFound();

  res.json({ ok: true });
});
