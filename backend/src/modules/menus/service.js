/**
 * Accès au planning des repas.
 *
 * Les recettes vivent dans leur propre module depuis l'extraction : ce
 * service-ci ne connaît d'elles qu'un identifiant qu'il ne cherche jamais à
 * résoudre, et l'intitulé recopié le jour de la pose.
 */

import { db, stmt } from '../../db/index.js';

/**
 * Une case du planning.
 *
 * `recipeId` non nul dit que la case désigne une recette ; `title` dit ce qu'on
 * y lit. Aucune jointure : le module recettes peut être absent, la case reste
 * lisible.
 */
const toPublicEntry = (row) => ({
  id: row.id,
  onDate: row.on_date,
  slot: row.slot,
  recipeId: row.recipe_id,
  title: row.title,
});

export function listPlan({ from, to }) {
  return stmt(`
    SELECT * FROM meal_plan
    WHERE on_date BETWEEN :from AND :to
    ORDER BY on_date, slot = 'soir'
  `)
    .all({ from, to })
    .map(toPublicEntry);
}

export function getEntry(onDate, slot) {
  const row = stmt('SELECT * FROM meal_plan WHERE on_date = ? AND slot = ?').get(onDate, slot);
  return row ? toPublicEntry(row) : null;
}

/**
 * Pose un repas dans une case, en remplaçant ce qui s'y trouvait.
 *
 * `ON CONFLICT` plutôt qu'un « supprime puis insère » : la case ne se retrouve
 * jamais vide, même une fraction de seconde, et l'unicité fait le travail.
 */
export function setEntry({ onDate, slot, recipeId, title }) {
  stmt(`
    INSERT INTO meal_plan (on_date, slot, recipe_id, title)
    VALUES (:onDate, :slot, :recipeId, :title)
    ON CONFLICT (on_date, slot) DO UPDATE SET
      recipe_id = excluded.recipe_id,
      title     = excluded.title
  `).run({ onDate, slot, recipeId: recipeId ?? null, title });

  return getEntry(onDate, slot);
}

export function clearEntry(onDate, slot) {
  return stmt('DELETE FROM meal_plan WHERE on_date = ? AND slot = ?').run(onDate, slot).changes;
}

/**
 * Pose une semaine entière d'un coup.
 *
 * Une seule transaction : sept allers-retours pour sept jours laisseraient un
 * planning à moitié rempli si la connexion lâchait au milieu.
 *
 * Les recettes ont déjà été retrouvées ou créées par le module recettes, dans
 * sa propre transaction, avant cet appel. L'ordre compte : si cette étape-là
 * échoue, le planning n'a pas encore bougé.
 */
export function importerSemaine(entries) {
  const appliquer = db.transaction(() => {
    for (const entry of entries) setEntry(entry);
    return entries.length;
  });

  return { posees: appliquer() };
}
