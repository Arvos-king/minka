/**
 * Accès aux dépenses et à leurs catégories.
 */

import { stmt } from '../../db/index.js';

const toPublicCategory = (row) =>
  row && {
    id: row.id,
    label: row.label,
    monthlyBudgetCents: row.monthly_budget_cents,
    sortOrder: row.sort_order,
  };

const toPublicExpense = (row) =>
  row && {
    id: row.id,
    label: row.label,
    amountCents: row.amount_cents,
    spentOn: row.spent_on,
    categoryId: row.category_id,
    categoryLabel: row.category_label ?? null,
    personId: row.person_id,
    createdBy: row.created_by,
  };

// --- Catégories --------------------------------------------------------------

/** Rang déclaré d'abord, puis l'alphabet — même règle que les modules eux-mêmes. */
export function listCategories() {
  return stmt('SELECT * FROM expense_categories ORDER BY sort_order, label COLLATE NOCASE')
    .all()
    .map(toPublicCategory);
}

export function getCategory(id) {
  return toPublicCategory(stmt('SELECT * FROM expense_categories WHERE id = ?').get(id));
}

/** @returns {object|null} `null` si le libellé est déjà pris. */
export function createCategory({ label, monthlyBudgetCents }) {
  const existe = stmt(
    'SELECT 1 FROM expense_categories WHERE label = ? COLLATE NOCASE',
  ).get(label);
  if (existe) return null;

  const { lastInsertRowid } = stmt(`
    INSERT INTO expense_categories (label, monthly_budget_cents, sort_order)
    VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM expense_categories))
  `).run(label, monthlyBudgetCents ?? null);

  return getCategory(lastInsertRowid);
}

export function updateCategory(id, fields) {
  if (fields.label !== undefined) {
    // Le renommage ne doit pas créer un doublon — sauf sur soi-même.
    const occupe = stmt(
      'SELECT 1 FROM expense_categories WHERE label = ? COLLATE NOCASE AND id <> ?',
    ).get(fields.label, id);
    if (occupe) return null;
  }

  const assignments = [];
  const values = [];
  for (const [champ, colonne] of Object.entries({
    label: 'label',
    monthlyBudgetCents: 'monthly_budget_cents',
  })) {
    // `undefined` = ne touche pas au champ ; `null` = vide-le.
    if (fields[champ] !== undefined) {
      assignments.push(`${colonne} = ?`);
      values.push(fields[champ]);
    }
  }
  if (assignments.length === 0) return getCategory(id);

  values.push(id);
  stmt(`UPDATE expense_categories SET ${assignments.join(', ')} WHERE id = ?`).run(...values);
  return getCategory(id);
}

/** Nombre de dépenses qui perdront leur étiquette : l'interface l'annonce. */
export function countExpensesInCategory(id) {
  return stmt('SELECT COUNT(*) AS total FROM expenses WHERE category_id = ?').get(id).total;
}

export function deleteCategory(id) {
  return stmt('DELETE FROM expense_categories WHERE id = ?').run(id).changes;
}

// --- Dépenses ----------------------------------------------------------------

const SELECTION = `
  SELECT e.*, c.label AS category_label
  FROM expenses e
  LEFT JOIN expense_categories c ON c.id = e.category_id
`;

/**
 * Dépenses de la période, de la plus récente à la plus ancienne.
 *
 * `id DESC` en dernier recours : plusieurs dépenses tombent le même jour, et
 * la dernière saisie doit apparaître en tête — c'est celle qu'on vient de
 * taper et qu'on relit.
 */
export function listExpenses({ from, to }) {
  return stmt(`${SELECTION} WHERE e.spent_on BETWEEN :from AND :to ORDER BY e.spent_on DESC, e.id DESC`)
    .all({ from, to })
    .map(toPublicExpense);
}

export function getExpense(id) {
  return toPublicExpense(stmt(`${SELECTION} WHERE e.id = ?`).get(id));
}

/**
 * Totaux du mois : l'ensemble, et le détail par catégorie.
 *
 * Calculés par SQLite plutôt que dans le navigateur — c'est une somme
 * d'entiers, et la faire ici évite que deux écrans en donnent deux versions.
 */
export function totalsFor({ from, to }) {
  const global = stmt(
    'SELECT COALESCE(SUM(amount_cents), 0) AS total FROM expenses WHERE spent_on BETWEEN :from AND :to',
  ).get({ from, to });

  const parCategorie = stmt(`
    SELECT category_id, SUM(amount_cents) AS total
    FROM expenses
    WHERE spent_on BETWEEN :from AND :to
    GROUP BY category_id
  `).all({ from, to });

  return {
    spentCents: global.total,
    byCategory: parCategorie.map((ligne) => ({
      categoryId: ligne.category_id,
      spentCents: ligne.total,
    })),
  };
}

export function createExpense(expense, userId) {
  const { lastInsertRowid } = stmt(`
    INSERT INTO expenses (label, amount_cents, spent_on, category_id, person_id, created_by)
    VALUES (:label, :amountCents, :spentOn, :categoryId, :personId, :createdBy)
  `).run({ ...expense, createdBy: userId });

  return getExpense(lastInsertRowid);
}

const COLONNES = {
  label: 'label',
  amountCents: 'amount_cents',
  spentOn: 'spent_on',
  categoryId: 'category_id',
  personId: 'person_id',
};

export function updateExpense(id, fields) {
  const assignments = [];
  const values = [];

  for (const [champ, colonne] of Object.entries(COLONNES)) {
    if (fields[champ] !== undefined) {
      assignments.push(`${colonne} = ?`);
      values.push(fields[champ]);
    }
  }

  values.push(id);
  stmt(`UPDATE expenses SET ${assignments.join(', ')} WHERE id = ?`).run(...values);
  return getExpense(id);
}

export function deleteExpense(id) {
  return stmt('DELETE FROM expenses WHERE id = ?').run(id).changes;
}
