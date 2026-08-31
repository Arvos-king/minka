-- Le répertoire de recettes.
--
-- Ces deux tables ne naissent pas ici : elles ont été créées par la première
-- migration du module menus, du temps où les recettes n'étaient qu'une annexe
-- du planning. C'est tout le sens du `IF NOT EXISTS` — sur une base en service,
-- ce fichier ne fait rien ; sur une base neuve, ou sur une installation où le
-- dossier `menus` n'a pas été déposé, le module se suffit à lui-même. Réécrire
-- l'histoire en retirant ces tables de `menus:001` ferait diverger les deux
-- cas : la base en service les garderait, une base neuve ne les aurait jamais.
--
-- Le parti pris hérité, et maintenu : les quantités sont du TEXTE, pas un
-- nombre et une unité. « Un filet d'huile » est une quantité parfaitement
-- claire dans une cuisine de famille. Normaliser demanderait une table de
-- conversions et une saisie plus lourde, pour un bénéfice nul — personne ne
-- fait la somme de deux cuillères à soupe.

CREATE TABLE IF NOT EXISTS recipes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  servings   INTEGER,                       -- NULL = non précisé
  notes      TEXT,                          -- remarques, en texte libre
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Les ingrédients appartiennent à leur recette et disparaissent avec elle.
--
-- `name` est du texte libre, sans table de produits : la liste de courses n'en
-- a pas non plus, et introduire une nomenclature partagée obligerait les deux
-- modules à se connaître — ce que l'architecture interdit.
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  quantity   TEXT,                          -- « 200 g », « 2 c. à soupe », NULL
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe
  ON recipe_ingredients (recipe_id, sort_order);
