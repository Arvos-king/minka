-- Les étapes d'une recette.
--
-- Une table, et non un champ de texte à retours à la ligne comme la
-- « préparation » d'avant : une étape se coche pendant qu'on cuisine, elle a
-- donc besoin d'exister séparément et d'être désignable. Découper le texte à
-- l'affichage donnerait des repères qui bougeraient au moindre caractère saisi.
--
-- La saisie, elle, reste du texte à retours à la ligne — une ligne, une étape.
-- Insérer une étape oubliée au milieu revient alors à taper une ligne, là où
-- une liste de champs aurait demandé un mécanisme de réordonnancement pour un
-- geste qui n'arrive qu'à la rédaction. Le découpage se fait à
-- l'enregistrement, et le résultat numéroté se lit aussitôt sur la fiche : la
-- règle « une ligne, une étape » n'a pas à être crue sur parole.
--
-- Conséquence assumée : enregistrer une recette réécrit toutes ses étapes, donc
-- leurs identifiants. Une progression de cuisine en cours repart de zéro si
-- l'on modifie la recette pendant qu'on la suit — ce qui est le comportement
-- voulu, la marche à suivre ayant changé.

CREATE TABLE recipe_steps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  text       TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_recipe_steps_recipe ON recipe_steps (recipe_id, sort_order);

-- Les préparations déjà saisies ne sont **pas** converties ici.
--
-- Deviner ce qu'est une étape dans un texte libre, sur une base en service,
-- c'est le genre de pari qu'on regrette : un paragraphe de trois phrases
-- deviendrait trois étapes, une consigne coupée en deux lignes en donnerait
-- deux. Le formulaire propose le découpage d'un tap, et laisse relire avant
-- d'enregistrer. `notes` reste, et devient ce qu'il aurait toujours dû être :
-- des remarques — « se congèle très bien », « recette de ma mère ».
