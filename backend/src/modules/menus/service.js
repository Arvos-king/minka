/**
 * Accès aux recettes et au planning des repas.
 */

import { db, stmt } from '../../db/index.js';

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
 * Une case du planning. `recipeTitle` vient de la jointure : l'interface
 * affiche le nom du repas sans avoir à charger chaque recette.
 */
const toPublicEntry = (row) => ({
  id: row.id,
  onDate: row.on_date,
  slot: row.slot,
  recipeId: row.recipe_id,
  recipeTitle: row.recipe_title,
  freeText: row.free_text,
});

// --- Recettes ----------------------------------------------------------------

/** Le répertoire, pour le sélecteur. Sans les ingrédients : inutiles ici. */
export function listRecipes() {
  return stmt('SELECT * FROM recipes ORDER BY title COLLATE NOCASE')
    .all()
    .map(toPublicRecipe);
}

export function listIngredients(recipeId) {
  return stmt(
    'SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order, id',
  )
    .all(recipeId)
    .map(toPublicIngredient);
}

/** Une recette et ses ingrédients. */
export function getRecipe(id) {
  const recipe = toPublicRecipe(stmt('SELECT * FROM recipes WHERE id = ?').get(id));
  if (!recipe) return null;
  return { ...recipe, ingredients: listIngredients(id) };
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

export function createRecipe({ title, servings, notes, ingredients }, userId) {
  // Recette et ingrédients d'un seul bloc : une recette à moitié enregistrée
  // serait pire que pas de recette du tout.
  const creer = db.transaction(() => {
    const { lastInsertRowid } = stmt(
      'INSERT INTO recipes (title, servings, notes, created_by) VALUES (?, ?, ?, ?)',
    ).run(title, servings ?? null, notes ?? null, userId);

    remplacerIngredients(lastInsertRowid, ingredients ?? []);
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

    // La liste fournie remplace l'ancienne en entier : un ingrédient retiré du
    // formulaire doit disparaître, ce qu'une fusion champ à champ ne ferait pas.
    if (fields.ingredients !== undefined) remplacerIngredients(id, fields.ingredients);
  });

  modifier();
  return getRecipe(id);
}

/**
 * Nombre de repas prévus avec cette recette. L'interface l'annonce avant de
 * supprimer : les cases correspondantes partiront avec elle.
 */
export function countPlanned(recipeId) {
  return stmt('SELECT COUNT(*) AS total FROM meal_plan WHERE recipe_id = ?').get(recipeId).total;
}

export function deleteRecipe(id) {
  return stmt('DELETE FROM recipes WHERE id = ?').run(id).changes;
}

// --- Planning ----------------------------------------------------------------

export function listPlan({ from, to }) {
  return stmt(`
    SELECT p.*, r.title AS recipe_title
    FROM meal_plan p
    LEFT JOIN recipes r ON r.id = p.recipe_id
    WHERE p.on_date BETWEEN :from AND :to
    ORDER BY p.on_date, p.slot = 'soir'
  `)
    .all({ from, to })
    .map(toPublicEntry);
}

export function getEntry(onDate, slot) {
  const row = stmt(`
    SELECT p.*, r.title AS recipe_title
    FROM meal_plan p
    LEFT JOIN recipes r ON r.id = p.recipe_id
    WHERE p.on_date = ? AND p.slot = ?
  `).get(onDate, slot);

  return row ? toPublicEntry(row) : null;
}

/**
 * Pose un repas dans une case, en remplaçant ce qui s'y trouvait.
 *
 * `ON CONFLICT` plutôt qu'un « supprime puis insère » : la case ne se retrouve
 * jamais vide, même une fraction de seconde, et l'unicité fait le travail.
 */
export function setEntry({ onDate, slot, recipeId, freeText }) {
  stmt(`
    INSERT INTO meal_plan (on_date, slot, recipe_id, free_text)
    VALUES (:onDate, :slot, :recipeId, :freeText)
    ON CONFLICT (on_date, slot) DO UPDATE SET
      recipe_id = excluded.recipe_id,
      free_text = excluded.free_text
  `).run({ onDate, slot, recipeId: recipeId ?? null, freeText: freeText ?? null });

  return getEntry(onDate, slot);
}

export function clearEntry(onDate, slot) {
  return stmt('DELETE FROM meal_plan WHERE on_date = ? AND slot = ?').run(onDate, slot).changes;
}

/**
 * Ingrédients de tous les repas prévus sur la période, regroupés par nom.
 *
 * Le regroupement se fait ici plutôt que dans le navigateur : sans lui,
 * l'interface devrait charger chaque recette de la semaine une par une.
 *
 * Deux quantités du même ingrédient ne sont pas additionnées — elles sont
 * juxtaposées (« 200 g + un filet »). C'est la conséquence assumée du choix de
 * les stocker en texte, et c'est de toute façon ce qu'on veut lire dans un
 * rayon : la somme de « 2 gousses » et « un peu » n'existe pas.
 */
export function listShoppingIngredients({ from, to }) {
  const lignes = stmt(`
    SELECT i.name, i.quantity, r.title AS recipe_title
    FROM meal_plan p
    JOIN recipes r            ON r.id = p.recipe_id
    JOIN recipe_ingredients i ON i.recipe_id = r.id
    WHERE p.on_date BETWEEN :from AND :to
    ORDER BY i.name COLLATE NOCASE, p.on_date
  `).all({ from, to });

  const parNom = new Map();

  for (const ligne of lignes) {
    const cle = ligne.name.toLocaleLowerCase('fr');
    if (!parNom.has(cle)) {
      parNom.set(cle, { name: ligne.name, quantities: [], recipes: [] });
    }
    const groupe = parNom.get(cle);
    if (ligne.quantity) groupe.quantities.push(ligne.quantity);
    // Une recette prévue deux fois dans la semaine ne se cite qu'une fois.
    if (!groupe.recipes.includes(ligne.recipe_title)) groupe.recipes.push(ligne.recipe_title);
  }

  return [...parNom.values()];
}

// --- Import d'une semaine ----------------------------------------------------

/** Retrouve une recette par son titre, insensiblement à la casse. */
function trouverRecetteParTitre(title) {
  return toPublicRecipe(
    stmt('SELECT * FROM recipes WHERE title = ? COLLATE NOCASE').get(title),
  );
}

/**
 * Pose une semaine entière d'un coup, depuis une proposition rédigée ailleurs.
 *
 * La règle qui décide du sort de chaque plat :
 *
 *   — des ingrédients listés → une recette, créée ou mise à jour. C'est ce qui
 *     alimente ensuite la liste de courses, sans quoi l'import ne servirait
 *     qu'à écrire sept intitulés ;
 *   — pas d'ingrédients, mais une recette du même nom existe → on la
 *     réutilise, ce qui permet d'écrire « Gratin de courgettes » sans recopier
 *     sa liste chaque semaine ;
 *   — pas d'ingrédients, aucune recette connue → un texte libre, comme
 *     « restes » ou « chez mes parents ».
 *
 * Le tout dans une transaction : une semaine à moitié posée serait pire qu'une
 * semaine vide, puisqu'on ne saurait pas ce qui manque.
 */
export function importerSemaine(entries, userId) {
  const bilan = { posees: 0, recettesCreees: [], recettesMisesAJour: [], texteLibre: [] };

  const appliquer = db.transaction(() => {
    for (const { onDate, slot, title, ingredients } of entries) {
      const existante = trouverRecetteParTitre(title);
      let recipeId = existante?.id ?? null;
      let freeText = null;

      if (ingredients.length > 0) {
        if (existante) {
          remplacerIngredients(existante.id, ingredients);
          bilan.recettesMisesAJour.push(existante.title);
        } else {
          recipeId = createRecipe({ title, ingredients }, userId).id;
          bilan.recettesCreees.push(title);
        }
      } else if (!existante) {
        freeText = title;
        bilan.texteLibre.push(title);
      }

      setEntry({ onDate, slot, recipeId: freeText === null ? recipeId : null, freeText });
      bilan.posees += 1;
    }
  });

  appliquer();
  return bilan;
}
