-- Les étiquettes d'une recette : « végétarien », « rapide », « four ».
--
-- Pas de table d'étiquettes à part, pas d'écran de gestion. Une étiquette n'est
-- rien d'autre que son texte, et le vocabulaire d'un foyer se construit en
-- écrivant, pas en administrant une nomenclature d'avance. C'est le pari
-- inverse des rayons de la liste de courses, figés dans le code — et pour la
-- raison inverse : les rayons d'un supermarché sont les mêmes pour tout le
-- monde, « les enfants aiment » n'est vrai que chez soi.
--
-- La cohérence des orthographes se joue donc à l'écriture, dans le service :
-- une étiquette équivalente à une déjà connue reprend son orthographe, comme un
-- titre de recette retrouvé reprend celui du répertoire. Sans quoi
-- « Végétarien » et « végétarien » feraient deux filtres pour une seule idée.
--
-- La clé primaire porte sur le couple : une recette ne peut pas porter deux
-- fois la même étiquette. Elle n'est pas déclarée `COLLATE NOCASE`, qui ne vaut
-- que pour l'ASCII en SQLite — « Été » et « été » y passeraient encore pour
-- distincts. La normalisation en amont est la vraie règle ; ceci n'est qu'un
-- garde-fou.

CREATE TABLE recipe_tags (
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag       TEXT    NOT NULL,

  PRIMARY KEY (recipe_id, tag)
);

-- Pour l'inverse : toutes les recettes portant une étiquette.
CREATE INDEX idx_recipe_tags_tag ON recipe_tags (tag COLLATE NOCASE);
