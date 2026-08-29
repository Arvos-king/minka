-- Rayons de la liste de courses.
--
-- Les rayons eux-mêmes ne sont pas en base : ce sont treize constantes de
-- `rayons.js`, dans l'ordre du parcours en magasin. Une table les rendrait
-- modifiables, donc renommables et réordonnables, donc à administrer — beaucoup
-- d'écrans pour une liste qui ne bouge pas d'une année sur l'autre et qui doit
-- surtout rester la même pour tout le monde. C'est le pari inverse de
-- `expense_categories`, et pour une raison précise : ajouter « vétérinaire » à
-- un budget est propre à chaque foyer, alors que les rayons d'un supermarché ne
-- le sont pas.
--
-- Ce qui est mis en base, ce sont les deux seules choses qui appartiennent au
-- foyer : le rayon de chaque article, et les corrections qu'on a apprises.
--
-- La colonne stocke une **clé** (`fruits-legumes`), jamais un libellé :
-- renommer « Épicerie salée » en « Épicerie » doit rester un changement de
-- texte, pas une migration de données. Aucune contrainte CHECK sur ses valeurs
-- pour la même raison — SQLite ne sait pas modifier un CHECK, et ajouter un
-- rayon deviendrait une reconstruction de table au lieu d'une ligne de
-- JavaScript. La garde est posée là où elle est gratuite : le schéma zod de
-- l'API, construit depuis `rayons.js`.
--
-- `rayon` est volontairement NULLable, et NULL veut dire « jamais classé ».
-- C'est ce qui permet au rattrapage de démarrage de savoir exactement ce qu'il
-- lui reste à faire, et de ne jamais repasser sur un article déjà rangé — y
-- compris rangé à la main. Une valeur par défaut aurait effacé cette
-- distinction, et un redémarrage aurait pu défaire une correction.
--
-- Pas d'index sur `rayon` : le regroupement se fait à l'affichage, aucune
-- requête ne filtre ni ne trie sur cette colonne, et un index n'y coûterait que
-- des écritures.

ALTER TABLE shopping_items ADD COLUMN rayon TEXT;

-- Mémoire des corrections, partagée par tout le foyer : ranger « Lait de coco »
-- une fois suffit pour les fois suivantes, quelle que soit la personne qui
-- l'ajoute.
--
-- La clé est le nom **normalisé** par `rayons.js` — minuscules, sans accents,
-- sans quantité ni unité — si bien que « Lait de coco », « lait de coco
-- (400 ml) » et « 2 laits de coco » n'ont qu'une seule entrée. Cette
-- normalisation est faite en JavaScript et non par une collation SQLite, parce
-- que NOCASE ne replie que l'alphabet ASCII : « Épicerie » et « épicerie » y
-- resteraient deux choses différentes, et c'est précisément le genre de nom
-- qu'on saisit ici.
CREATE TABLE shopping_rayons_appris (
  nom_normalise TEXT PRIMARY KEY,
  rayon         TEXT NOT NULL,
  -- Sert à relire l'histoire le jour où un classement surprend.
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
