-- Dépenses du foyer, par mois et par catégorie.
--
-- Trois partis pris expliquent la forme de ces tables.
--
-- 1. Les montants sont des ENTIERS de centimes. SQLite n'a pas de type décimal,
--    et les flottants finissent toujours par se voir : 0.1 + 0.2 ne fait pas
--    0.3, et un total de fin de mois faux d'un centime est un total faux.
--
-- 2. Les catégories sont une table, pas une liste figée dans le code. Ajouter
--    « vétérinaire » ne doit pas demander une migration.
--
-- 3. Aucun calcul de dettes — « qui doit combien à qui ». Pour un foyer aux
--    finances communes c'est du bruit ; `person_id` dit seulement qui a payé,
--    ce qui suffit à s'y retrouver dans un relevé.

CREATE TABLE expense_categories (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  label                TEXT    NOT NULL,
  -- Plafond mensuel indicatif. NULL = catégorie suivie sans objectif : on veut
  -- souvent savoir ce qu'on dépense en restaurants sans se fixer de limite.
  monthly_budget_cents INTEGER,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Deux catégories de même nom rendraient les totaux illisibles. NOCASE parce
-- que « Courses » et « courses » sont la même chose pour qui les saisit.
CREATE UNIQUE INDEX idx_expense_categories_label ON expense_categories (label COLLATE NOCASE);

CREATE TABLE expenses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  label        TEXT    NOT NULL,
  amount_cents INTEGER NOT NULL,
  spent_on     TEXT    NOT NULL,            -- AAAA-MM-JJ
  -- Une dépense survit à sa catégorie : la retirer ne doit pas effacer
  -- l'historique, seulement le laisser sans étiquette.
  category_id  INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
  -- Qui a payé. NULL = le foyer, sans plus de précision.
  person_id    INTEGER REFERENCES people(id) ON DELETE SET NULL,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- L'écran principal demande toujours « le mois de … », trié du plus récent.
CREATE INDEX idx_expenses_spent_on ON expenses (spent_on DESC);
CREATE INDEX idx_expenses_category ON expenses (category_id);
