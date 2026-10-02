/**
 * Accès au planning des repas.
 *
 * Les recettes vivent dans leur propre module depuis l'extraction : ce
 * service-ci ne connaît d'elles qu'un identifiant qu'il ne cherche jamais à
 * résoudre, et l'intitulé recopié le jour de la pose.
 */

import { db, stmt } from '../../db/index.js';
import { contenuDe, memeContenu, planifierDeplacement } from './reorganisation.js';

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

/**
 * Réécrit des cases, et rend pour chacune son état d'avant et d'après.
 *
 * Case par case, par contenu, plutôt qu'en déplaçant des lignes : sous
 * `UNIQUE (on_date, slot)`, une ligne avancée d'un jour heurterait sa voisine
 * avant que celle-ci ait bougé. Chaque case n'apparaissant qu'une fois, l'ordre
 * des écritures est indifférent.
 *
 * `avant` est un contenu (ce que l'appelant pourra rétablir), `apres` la case
 * telle qu'elle se lit désormais, identifiant compris.
 */
function reecrire(changements) {
  return changements.map(({ onDate, slot, avant, apres }) => {
    if (apres) return { onDate, slot, avant, apres: setEntry({ onDate, slot, ...apres }) };

    clearEntry(onDate, slot);
    return { onDate, slot, avant, apres: null };
  });
}

/**
 * Déplace un repas, en poussant ce qu'il déloge — la règle est dans
 * `reorganisation.js`.
 *
 * Tout se lit et s'écrit dans la même transaction : la poussée part de l'état
 * réel du planning, pas de celui qu'affichait le téléphone, sur lequel l'autre
 * a pu poser un repas depuis. Et c'est le serveur seul qui voit au-delà du
 * dimanche, là où une poussée peut finir.
 *
 * @returns les cases touchées, ou `null` si la case de départ est vide — le
 *   repas a changé de place entre-temps, et rien n'a été écrit.
 */
export function deplacerRepas(de, vers) {
  const appliquer = db.transaction(() => {
    const source = getEntry(de.date, de.slot);
    if (!source) return null;

    const suite = stmt('SELECT * FROM meal_plan WHERE slot = :slot AND on_date >= :date')
      .all({ slot: vers.slot, date: vers.date })
      .map(toPublicEntry);

    return reecrire(planifierDeplacement({ de, contenu: contenuDe(source), vers, suite }));
  });

  return appliquer();
}

/**
 * Fixe plusieurs cases d'un bloc. C'est ce qui annule une réorganisation : on
 * rétablit l'état d'avant de chaque case touchée.
 *
 * `attendu`, quand il est fourni, est ce que l'appelant pense trouver dans la
 * case. Tous sont vérifiés avant la moindre écriture, et un seul désaccord
 * suffit à ne rien écrire : l'autre a touché au planning entre-temps, et
 * rétablir par-dessus effacerait son geste sans que personne le sache.
 *
 * @returns les cases touchées, ou `null` en cas de désaccord.
 */
export function fixerCases(cases) {
  const appliquer = db.transaction(() => {
    const avants = cases.map(({ onDate, slot }) => contenuDe(getEntry(onDate, slot)));

    const desaccord = cases.some(
      ({ attendu }, rang) => attendu !== undefined && !memeContenu(avants[rang], attendu),
    );
    if (desaccord) return null;

    return reecrire(
      cases.map(({ onDate, slot, repas }, rang) => ({ onDate, slot, avant: avants[rang], apres: repas })),
    );
  });

  return appliquer();
}
