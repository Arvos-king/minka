-- Les recettes quittent ce module.
--
-- Elles ont désormais le leur, `recipes`, et le socle interdit à deux modules
-- de se connaître côté serveur : la clé étrangère de `meal_plan` vers
-- `recipes` doit donc disparaître. SQLite ne sait pas retirer une contrainte,
-- il faut recréer la table.
--
-- Ce que devient une case du planning :
--
--   `recipe_id` reste, mais en simple POINTEUR SOUPLE — un entier que personne
--   ne garantit plus. Le module recettes peut être retiré de l'installation, ou
--   une recette supprimée : le repas prévu, lui, survit.
--
--   `title` remplace et absorbe `free_text`. C'est L'INTITULÉ RECOPIÉ au moment
--   de la pose, et c'est lui qui rend l'extraction viable : le planning
--   s'affiche entier sans jamais interroger le module recettes. Une case avec
--   `recipe_id` est une recette, une case sans est un « restes » — l'ancien
--   CHECK d'exclusivité n'a plus d'objet.
--
--   L'interface, qui charge de toute façon le répertoire pour son sélecteur,
--   préfère le titre courant quand elle l'obtient : renommer une recette
--   continue de se voir dans le planning.
--
-- Ordre des migrations : les modules sont chargés par ordre alphabétique de
-- dossier, `menus` avant `recipes`. Ce fichier s'exécute donc AVANT
-- `recipes:001` — sans conséquence, puisque les deux tables jointes ci-dessous
-- ont été créées par `menus:001`, sur une base neuve comme sur celle en
-- service.

CREATE TABLE meal_plan_nouveau (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  on_date   TEXT    NOT NULL,               -- AAAA-MM-JJ
  slot      TEXT    NOT NULL CHECK (slot IN ('midi', 'soir')),
  recipe_id INTEGER,                        -- pointeur souple, sans clé étrangère
  title     TEXT    NOT NULL,               -- ce qu'on lit dans la case

  -- Un seul repas par case : on remplace, on n'empile pas.
  UNIQUE (on_date, slot)
);

-- Les identifiants sont conservés : rien ne les désigne de l'extérieur
-- aujourd'hui, mais les renuméroter au passage n'apporterait rien et rendrait
-- toute sauvegarde antérieure plus difficile à recouper.
--
-- Le troisième terme du COALESCE est inatteignable : l'ancien CHECK garantissait
-- exactement l'un des deux, et la clé étrangère que `recipes` répondait présent.
-- Il est là pour qu'une ligne devenue incohérente autrement ne bloque pas le
-- démarrage de l'API sur un cas qui ne peut pas se produire.
INSERT INTO meal_plan_nouveau (id, on_date, slot, recipe_id, title)
SELECT p.id, p.on_date, p.slot, p.recipe_id, COALESCE(r.title, p.free_text, 'Repas')
FROM meal_plan p
LEFT JOIN recipes r ON r.id = p.recipe_id;

-- `meal_plan` n'est référencée par personne : la supprimer ne déclenche aucune
-- action en cascade ailleurs, et les clés étrangères peuvent rester actives.
DROP TABLE meal_plan;

ALTER TABLE meal_plan_nouveau RENAME TO meal_plan;

-- L'écran principal demande toujours « la semaine du … au … ».
CREATE INDEX idx_meal_plan_date ON meal_plan (on_date);
