import { Router } from 'express';

import { personExists } from '../../lib/people.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { T as SOCLE } from '../../textes.js';
import {
  countExpensesInCategory,
  createCategory,
  createExpense,
  deleteCategory,
  deleteExpense,
  getCategory,
  getExpense,
  listCategories,
  listExpenses,
  totalsFor,
  updateCategory,
  updateExpense,
} from './service.js';
import {
  createCategorySchema,
  createExpenseSchema,
  idParamsSchema,
  periodQuerySchema,
  updateCategorySchema,
  updateExpenseSchema,
} from './schemas.js';
import { T } from './textes.js';

export const router = Router();

const expenseNotFound = () => new AppError(404, 'EXPENSE_NOT_FOUND', T.depenseIntrouvable);
const categoryNotFound = () => new AppError(404, 'CATEGORY_NOT_FOUND', T.categorieIntrouvable);
const labelTaken = () => new AppError(409, 'CATEGORY_LABEL_TAKEN', T.categorieDejaPrise);

/** Les références sortantes sont vérifiées ici, pas laissées à SQLite : le
 *  message d'une contrainte violée n'aiderait personne. */
function verifierReferences({ categoryId, personId }) {
  if (categoryId != null && !getCategory(categoryId)) throw categoryNotFound();
  if (personId != null && !personExists(personId)) {
    throw new AppError(400, 'PERSON_NOT_FOUND', SOCLE.erreurs.personneDisparue);
  }
}

// --- Catégories --------------------------------------------------------------

router.get('/categories', (req, res) => {
  res.json({ categories: listCategories() });
});

router.post('/categories', validate({ body: createCategorySchema }), (req, res) => {
  const category = createCategory(req.valid.body);
  if (!category) throw labelTaken();

  res.status(201).json({ category });
});

router.patch(
  '/categories/:id',
  validate({ params: idParamsSchema, body: updateCategorySchema }),
  (req, res) => {
    const { id } = req.valid.params;
    if (!getCategory(id)) throw categoryNotFound();

    const category = updateCategory(id, req.valid.body);
    if (!category) throw labelTaken();

    res.json({ category });
  },
);

router.delete('/categories/:id', validate({ params: idParamsSchema }), (req, res) => {
  const { id } = req.valid.params;

  // Compté avant : les dépenses survivent mais perdent leur étiquette, et
  // l'interface l'a annoncé.
  const untagged = countExpensesInCategory(id);
  if (deleteCategory(id) === 0) throw categoryNotFound();

  res.json({ ok: true, untagged });
});

// --- Dépenses ----------------------------------------------------------------

router.get('/expenses', validate({ query: periodQuerySchema }), (req, res) => {
  res.json({
    expenses: listExpenses(req.valid.query),
    totals: totalsFor(req.valid.query),
  });
});

router.post('/expenses', validate({ body: createExpenseSchema }), (req, res) => {
  verifierReferences(req.valid.body);

  res.status(201).json({ expense: createExpense(req.valid.body, req.user.id) });
});

router.patch(
  '/expenses/:id',
  validate({ params: idParamsSchema, body: updateExpenseSchema }),
  (req, res) => {
    const { id } = req.valid.params;
    if (!getExpense(id)) throw expenseNotFound();
    verifierReferences(req.valid.body);

    res.json({ expense: updateExpense(id, req.valid.body) });
  },
);

router.delete('/expenses/:id', validate({ params: idParamsSchema }), (req, res) => {
  if (deleteExpense(req.valid.params.id) === 0) throw expenseNotFound();

  res.json({ ok: true });
});
