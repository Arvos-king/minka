/**
 * Accès au répertoire de recettes.
 */

import { db, stmt } from '../../db/index.js';
import { libelleCourse } from './courses.js';
import { aligner } from './etiquettes.js';
import { champsACompleter, choisirRecette, sortDuPlat } from './resolution.js';

function toPublicRecipe(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    servings: row.servings,
    notes: row.notes,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

const toPublicIngredient = (row) => ({
  id: row.id,
  name: row.name,
  quantity: row.quantity,
});

/**
 * L'identifiant d'une étape n'est pas décoratif : c'est lui que le mode cuisine
 * retient pour savoir laquelle est cochée. Il change à chaque enregistrement,
 * la liste étant réécrite en entier — et c'est voulu, une marche à suivre
 * modifiée devant repartir de zéro.
 */
const toPublicStep = (row) => ({
  id: row.id,
  text: row.text,
});

/**
 * Le répertoire, prêt à être fouillé.
 *
 * Chaque recette y porte le **nom** de ses ingrédients et ses étiquettes — pas
 * leurs quantités, pas ses étapes. C'est ce qu'il faut pour choisir, et surtout
 * pour chercher : « qu'est-ce que je fais avec des courgettes ? » est la
 * question qu'on pose à un répertoire, et elle n'a de réponse que si les noms
 * sont là. Le tri et le filtre se font ensuite dans le navigateur, sans
 * aller-retour à chaque lettre tapée, et hors ligne comme en ligne.
 *
 * Les étapes n'y sont que comptées : `stepCount` dit si une recette est
 * achevée ou n'est qu'une ébauche, ce que le connecteur Claude doit savoir pour
 * proposer de la compléter plutôt que de la désigner par son seul titre.
 *
 * Quatre requêtes plutôt qu'une jointure : celle-ci multiplierait les lignes
 * par le nombre d'ingrédients avant qu'on ne les regroupe. À cette échelle la
 * différence est nulle, la lisibilité non.
 */
export function listRecipes() {
  const recettes = stmt('SELECT * FROM recipes ORDER BY title COLLATE NOCASE')
    .all()
    .map((row) => ({ ...toPublicRecipe(row), ingredients: [], tags: [], stepCount: 0 }));

  const parId = new Map(recettes.map((recette) => [recette.id, recette]));

  for (const ligne of stmt(
    'SELECT recipe_id, name FROM recipe_ingredients ORDER BY sort_order, id',
  ).all()) {
    parId.get(ligne.recipe_id)?.ingredients.push(ligne.name);
  }

  for (const ligne of stmt(
    'SELECT recipe_id, tag FROM recipe_tags ORDER BY tag COLLATE NOCASE',
  ).all()) {
    parId.get(ligne.recipe_id)?.tags.push(ligne.tag);
  }

  for (const ligne of stmt(
    'SELECT recipe_id, COUNT(*) AS etapes FROM recipe_steps GROUP BY recipe_id',
  ).all()) {
    const recette = parId.get(ligne.recipe_id);
    if (recette) recette.stepCount = ligne.etapes;
  }

  return recettes;
}

export function listIngredients(recipeId) {
  return stmt('SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order, id')
    .all(recipeId)
    .map(toPublicIngredient);
}

export function listSteps(recipeId) {
  return stmt('SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY sort_order, id')
    .all(recipeId)
    .map(toPublicStep);
}

export function listTags(recipeId) {
  return stmt('SELECT tag FROM recipe_tags WHERE recipe_id = ? ORDER BY tag COLLATE NOCASE')
    .all(recipeId)
    .map((row) => row.tag);
}

/** Une recette entière. */
export function getRecipe(id) {
  const recipe = toPublicRecipe(stmt('SELECT * FROM recipes WHERE id = ?').get(id));
  if (!recipe) return null;
  return {
    ...recipe,
    ingredients: listIngredients(id),
    steps: listSteps(id),
    tags: listTags(id),
  };
}

/** Réécrit la liste d'ingrédients d'une recette. Toujours dans une transaction. */
function remplacerIngredients(recipeId, ingredients) {
  stmt('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(recipeId);

  const inserer = stmt(
    'INSERT INTO recipe_ingredients (recipe_id, name, quantity, sort_order) VALUES (?, ?, ?, ?)',
  );
  ingredients.forEach((ingredient, rang) => {
    inserer.run(recipeId, ingredient.name, ingredient.quantity ?? null, rang);
  });
}

/** Idem pour les étapes. Le rang est leur seul ordre : il fait tout le sens. */
function remplacerEtapes(recipeId, steps) {
  stmt('DELETE FROM recipe_steps WHERE recipe_id = ?').run(recipeId);

  const inserer = stmt('INSERT INTO recipe_steps (recipe_id, text, sort_order) VALUES (?, ?, ?)');
  steps.forEach((step, rang) => inserer.run(recipeId, step.text, rang));
}

/**
 * Idem pour les étiquettes, à ceci près qu'elles sont d'abord **alignées sur
 * celles déjà en usage** : « vegetarien » tapé ce soir rejoint « Végétarien »
 * écrit le mois dernier, au lieu d'ouvrir un second filtre pour la même idée.
 *
 * Elles n'ont pas de rang : leur ordre est alphabétique à la lecture. Une
 * étiquette ne raconte rien, contrairement à une étape.
 */
function remplacerEtiquettes(recipeId, tags) {
  stmt('DELETE FROM recipe_tags WHERE recipe_id = ?').run(recipeId);
  if (tags.length === 0) return;

  const connues = stmt('SELECT DISTINCT tag FROM recipe_tags ORDER BY tag COLLATE NOCASE')
    .all()
    .map((row) => row.tag);

  const inserer = stmt('INSERT INTO recipe_tags (recipe_id, tag) VALUES (?, ?)');
  for (const tag of aligner(tags, connues)) inserer.run(recipeId, tag);
}

export function createRecipe({ title, servings, notes, ingredients, steps, tags }, userId) {
  // Recette, ingrédients et étapes d'un seul bloc : une recette à moitié
  // enregistrée serait pire que pas de recette du tout.
  const creer = db.transaction(() => {
    const { lastInsertRowid } = stmt(
      'INSERT INTO recipes (title, servings, notes, created_by) VALUES (?, ?, ?, ?)',
    ).run(title, servings ?? null, notes ?? null, userId);

    remplacerIngredients(lastInsertRowid, ingredients ?? []);
    remplacerEtapes(lastInsertRowid, steps ?? []);
    remplacerEtiquettes(lastInsertRowid, tags ?? []);
    return lastInsertRowid;
  });

  return getRecipe(creer());
}

const COLONNES = {
  title: 'title',
  servings: 'servings',
  notes: 'notes',
};

export function updateRecipe(id, fields) {
  const modifier = db.transaction(() => {
    const assignments = [];
    const values = [];

    for (const [champ, colonne] of Object.entries(COLONNES)) {
      // `undefined` = ne touche pas au champ ; `null` = vide-le.
      if (fields[champ] !== undefined) {
        assignments.push(`${colonne} = ?`);
        values.push(fields[champ]);
      }
    }

    if (assignments.length > 0) {
      values.push(id);
      stmt(`UPDATE recipes SET ${assignments.join(', ')} WHERE id = ?`).run(...values);
    }

    // Les listes fournies remplacent les anciennes en entier : un ingrédient
    // retiré du formulaire doit disparaître, ce qu'une fusion champ à champ ne
    // ferait pas.
    if (fields.ingredients !== undefined) remplacerIngredients(id, fields.ingredients);
    if (fields.steps !== undefined) remplacerEtapes(id, fields.steps);
    if (fields.tags !== undefined) remplacerEtiquettes(id, fields.tags);
  });

  modifier();
  return getRecipe(id);
}

/**
 * Supprime une recette.
 *
 * Ce module ignore qui la désignait : les repas déjà prévus la gardent comme
 * intitulé et perdent seulement leur fiche. C'est un changement voulu par
 * rapport à la cascade d'autrefois — ranger son répertoire ne devrait pas
 * trouer la semaine en cours.
 */
export function deleteRecipe(id) {
  return stmt('DELETE FROM recipes WHERE id = ?').run(id).changes;
}

// --- Ingrédients de plusieurs recettes ---------------------------------------

/**
 * Ingrédients de plusieurs recettes, regroupés par nom, prêts pour les courses.
 *
 * Le regroupement se fait ici plutôt que dans le navigateur : sans lui, celui
 * qui appelle devrait charger chaque recette une par une. Et le libellé part
 * tout fait — voir `courses.js` pour la raison.
 *
 * Deux quantités du même ingrédient ne sont pas additionnées, elles sont
 * juxtaposées (« 200 g + un filet »). C'est la conséquence assumée du choix de
 * les stocker en texte, et c'est de toute façon ce qu'on veut lire dans un
 * rayon : la somme de « 2 gousses » et « un peu » n'existe pas.
 *
 * L'ordre des identifiants reçus est conservé à l'intérieur d'un groupe : les
 * quantités se lisent alors dans l'ordre où l'appelant a rangé ses recettes —
 * celui de la semaine, pour le planning.
 */
export function listGroupedIngredients(ids) {
  const rang = new Map();
  for (const id of ids) if (!rang.has(id)) rang.set(id, rang.size);

  const uniques = [...rang.keys()];
  if (uniques.length === 0) return [];

  // Autant de « ? » que d'identifiants : le SQL change donc avec leur nombre,
  // et le cache de `stmt` retient une variante par taille de liste. C'est borné
  // par le plafond du schéma, et cela reste préférable à une requête par
  // recette.
  const lignes = stmt(`
    SELECT i.name, i.quantity, r.id AS recipe_id, r.title AS recipe_title
    FROM recipes r
    JOIN recipe_ingredients i ON i.recipe_id = r.id
    WHERE r.id IN (${uniques.map(() => '?').join(', ')})
    ORDER BY i.sort_order, i.id
  `).all(...uniques);

  lignes.sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }) ||
      rang.get(a.recipe_id) - rang.get(b.recipe_id),
  );

  const parNom = new Map();

  for (const ligne of lignes) {
    const cle = ligne.name.toLocaleLowerCase('fr');
    if (!parNom.has(cle)) {
      parNom.set(cle, { name: ligne.name, quantities: [], recipes: [] });
    }
    const groupe = parNom.get(cle);
    if (ligne.quantity) groupe.quantities.push(ligne.quantity);
    // Une recette demandée deux fois ne se cite qu'une fois.
    if (!groupe.recipes.includes(ligne.recipe_title)) groupe.recipes.push(ligne.recipe_title);
  }

  return [...parNom.values()].map((groupe) => ({ ...groupe, label: libelleCourse(groupe) }));
}

// --- Retrouver ou créer des recettes par leur intitulé ------------------------

/**
 * Retrouve une recette par son titre, à l'orthographe près — voir `cleTitre`.
 *
 * Le répertoire entier est relu à chaque plat : une recette créée deux lignes
 * plus haut, dans la même transaction, doit être retrouvée. À quelques
 * centaines de titres, c'est sans conséquence.
 */
function trouverParTitre(title) {
  const trouvee = choisirRecette(title, stmt('SELECT id, title FROM recipes').all());
  return trouvee ? getRecipe(trouvee.id) : null;
}

/**
 * Des intitulés en entrée, des identifiants en sortie.
 *
 * C'est ce qui permet d'importer une semaine de menus — écrite en texte, ou
 * posée par le connecteur Claude — sans que le module qui la pose ait à
 * toucher aux tables des recettes. Le sort de chaque plat est décidé par
 * `sortDuPlat` (voir `resolution.js`) :
 *
 *   — une recette inconnue qui arrive avec ses ingrédients ou ses étapes est
 *     **créée**, entière : parts, étiquettes et remarque comprises ;
 *   — une ébauche — une recette sans étapes — est **complétée** par ce qui
 *     arrive, sans perdre ce que le foyer y avait écrit ;
 *   — une recette qui a sa préparation est **conservée** telle quelle : la
 *     recette du foyer fait foi, et l'appelant en est averti ;
 *   — un titre seul **réutilise** la recette qu'il désigne, ce qui permet
 *     d'écrire « Gratin de courgettes » sans recopier sa liste chaque semaine ;
 *   — un titre seul que rien ne désigne reste **inconnu**, `recipeId` nul. Le
 *     planning en fait un texte libre, comme « restes » ou « chez mes parents ».
 *
 * Le tout dans une transaction : un répertoire à moitié écrit laisserait des
 * recettes derrière lui sans le planning qui devait les utiliser.
 *
 * Le titre renvoyé est celui **du répertoire**, pas celui qu'on a tapé :
 * « gratin de courgette » retrouve « Gratin de courgettes », et c'est cette
 * orthographe-là que l'appelant recopiera.
 */
export function resoudre(plats, userId) {
  const bilan = { creees: [], completees: [], conservees: [], reutilisees: [], inconnues: [] };
  const resolus = [];

  /*
   * Un même plat peut revenir deux fois dans une semaine. La seconde fois, la
   * recette existe — on vient de la créer ou de la compléter — et la
   * règle la dirait « conservée », ce qui ferait croire que la proposition a
   * été écartée. Elle est simplement réutilisée, sans nouvelle ligne au bilan.
   */
  const dejaTraitees = new Set();

  const appliquer = db.transaction(() => {
    for (const plat of plats) {
      const existante = trouverParTitre(plat.title);

      if (existante && dejaTraitees.has(existante.id)) {
        resolus.push({ title: existante.title, recipeId: existante.id });
        continue;
      }

      const sort = sortDuPlat({
        existante,
        aPreparation: (existante?.steps.length ?? 0) > 0,
        plat,
      });

      if (sort === 'creer') {
        const creee = createRecipe(plat, userId);
        bilan.creees.push(creee.title);
        dejaTraitees.add(creee.id);
        resolus.push({ title: creee.title, recipeId: creee.id });
      } else if (sort === 'libre') {
        bilan.inconnues.push(plat.title);
        resolus.push({ title: plat.title, recipeId: null });
      } else {
        if (sort === 'completer') updateRecipe(existante.id, champsACompleter(existante, plat));

        const rubrique = { completer: 'completees', conserver: 'conservees', reutiliser: 'reutilisees' };
        bilan[rubrique[sort]].push(existante.title);
        dejaTraitees.add(existante.id);
        resolus.push({ title: existante.title, recipeId: existante.id });
      }
    }
  });

  appliquer();
  return { plats: resolus, bilan };
}
