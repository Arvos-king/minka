-- Menus de la semaine.
--
-- Trois tables, et deux partis pris qui expliquent leur forme.
--
-- 1. Les quantités d'ingrédients sont du TEXTE, pas un nombre et une unité.
--    « Un filet d'huile » est une quantité parfaitement claire dans une cuisine
--    de famille. Normaliser les unités demanderait une table de conversions et
--    une saisie plus lourde, pour un bénéfice nul : personne ne fait la somme
--    de deux cuillères à soupe.
--
-- 2. Une case du planning porte SOIT une recette, SOIT un texte libre. La
--    moitié des dîners d'une semaine ne sont pas des recettes — « restes »,
--    « resto », « chez mes parents ». Obliger à créer une fiche pour cela
--    condamnerait le module à ne jamais être rempli.

CREATE TABLE recipes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  servings   INTEGER,                       -- NULL = non précisé
  notes      TEXT,                          -- préparation, en texte libre
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Les ingrédients appartiennent à leur recette et disparaissent avec elle.
--
-- `name` est du texte libre, sans table de produits : la liste de courses n'en
-- a pas non plus, et introduire une nomenclature partagée obligerait les deux
-- modules à se connaître — ce que l'architecture interdit.
CREATE TABLE recipe_ingredients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  quantity   TEXT,                          -- « 200 g », « 2 c. à soupe », NULL
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients (recipe_id, sort_order);

-- Le planning : une case = un jour et un moment.
--
-- ON DELETE CASCADE plutôt que SET NULL : une case qui ne désigne plus rien
-- n'a pas de sens, et le CHECK ci-dessous l'interdirait de toute façon.
-- Supprimer une recette la retire donc des repas prévus — l'interface annonce
-- combien avant de confirmer.
CREATE TABLE meal_plan (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  on_date   TEXT    NOT NULL,               -- AAAA-MM-JJ
  slot      TEXT    NOT NULL CHECK (slot IN ('midi', 'soir')),
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  free_text TEXT,

  -- Exactement l'un des deux : jamais les deux, jamais aucun.
  CHECK ((recipe_id IS NULL) != (free_text IS NULL)),

  -- Un seul repas par case : on remplace, on n'empile pas.
  UNIQUE (on_date, slot)
);

-- L'écran principal demande toujours « la semaine du … au … ».
CREATE INDEX idx_meal_plan_date ON meal_plan (on_date);
