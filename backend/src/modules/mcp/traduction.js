/**
 * Ce que Claude lit de Minka, et dans quels mots.
 *
 * Les routes de Minka parlent la langue de l'interface — `onDate`, `slot`,
 * `stepCount` —, faite pour un écran qui sait déjà ce qu'il affiche. Claude, lui,
 * arrive sans rien savoir : on lui rend des objets en français, débarrassés de
 * ce qui ne l'aide pas à choisir (dates de création, auteurs), et complétés de
 * ce qu'il devrait sinon déduire — le nom du jour, les cases vides, qu'une
 * recette est achevée ou n'est qu'une ébauche.
 *
 * Fonctions pures, sans réseau ni base : c'est ce qui les rend testables.
 */

import { memePlat } from '../../lib/titres.js';

const MS_PAR_JOUR = 86_400_000;

const NOMS_DES_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** Au-delà, la réponse noierait Claude sans l'aider : deux mois et demi suffisent. */
export const JOURS_MAX = 70;

const enUTC = (date) => new Date(`${date}T00:00:00Z`);

export const nomDuJour = (date) => NOMS_DES_JOURS[enUTC(date).getUTCDay()];

/** Décale une date AAAA-MM-JJ de N jours, sans passer par le fuseau local. */
export const decaler = (date, jours) =>
  new Date(enUTC(date).getTime() + jours * MS_PAR_JOUR).toISOString().slice(0, 10);

/** Le lundi de la semaine d'une date. */
export const lundiDe = (date) => decaler(date, -((enUTC(date).getUTCDay() + 6) % 7));

/** Nombre de jours de `du` à `au`, bornes comprises. */
export const joursCouverts = (du, au) => (enUTC(au) - enUTC(du)) / MS_PAR_JOUR + 1;

/**
 * La date du jour dans le fuseau du conteneur — `TZ`, Europe/Paris par
 * défaut —, et non en UTC : à une heure du matin, c'est déjà demain à Paris.
 * Même calcul que la sauvegarde nocturne.
 */
export function aujourdhuiLocal(maintenant = new Date()) {
  const decalage = maintenant.getTimezoneOffset() * 60_000;
  return new Date(maintenant.getTime() - decalage).toISOString().slice(0, 10);
}

/**
 * La période qu'on lit quand Claude ne précise rien : les quatre semaines
 * passées, pour ne pas reproposer ce qu'on vient de manger, la semaine en
 * cours, et la suivante — celle qu'on prépare d'ordinaire en fin de semaine.
 * Un seul appel suffit ainsi à tout le contexte.
 */
export function periodeParDefaut(aujourdhui) {
  const lundi = lundiDe(aujourdhui);
  return { du: decaler(lundi, -28), au: decaler(lundi, 13) };
}

/** Une case du planning, telle que Claude la lit. */
const caseLisible = (entree) => (entree ? { plat: entree.title, recetteId: entree.recipeId } : null);

/**
 * Le planning jour par jour, **cases vides comprises** : c'est en voyant
 * `null` que Claude sait où il reste à proposer, et qu'un samedi soir déjà
 * pris par « Chez mes parents » ne l'est pas par hasard.
 *
 * @param {object} p
 * @param {string} p.du
 * @param {string} p.au
 * @param {Array} p.entrees   les cases rendues par `GET /menus/plan`
 * @param {string} p.aujourdhui
 */
export function planningLisible({ du, au, entrees, aujourdhui }) {
  const parCase = new Map(entrees.map((entree) => [`${entree.onDate}|${entree.slot}`, entree]));

  const jours = [];
  for (let date = du; date <= au; date = decaler(date, 1)) {
    jours.push({
      date,
      jour: nomDuJour(date),
      midi: caseLisible(parCase.get(`${date}|midi`)),
      soir: caseLisible(parCase.get(`${date}|soir`)),
    });
  }

  return { aujourdhui, du, au, jours };
}

/**
 * Le répertoire, de quoi choisir — sans les quantités ni les étapes, qui
 * alourdiraient la réponse de plusieurs pages pour rien.
 *
 * `aPreparation` est ce qui décide de la conduite de Claude : une recette
 * achevée se désigne par son seul titre, une ébauche mérite d'être complétée.
 */
export const repertoireLisible = (recettes) =>
  recettes.map((recette) => ({
    id: recette.id,
    titre: recette.title,
    parts: recette.servings,
    etiquettes: recette.tags,
    ingredients: recette.ingredients,
    aPreparation: (recette.stepCount ?? 0) > 0,
  }));

/** Une recette entière. */
export const recetteLisible = (recette) => ({
  id: recette.id,
  titre: recette.title,
  parts: recette.servings,
  etiquettes: recette.tags,
  remarques: recette.notes,
  ingredients: recette.ingredients.map((ingredient) => ({
    nom: ingredient.name,
    quantite: ingredient.quantity,
  })),
  etapes: recette.steps.map((etape) => etape.text),
});

/**
 * Le frigo, les dates les plus proches en tête — l'ordre de la route, qui est
 * déjà celui dans lequel il faut finir les produits.
 */
export const frigoLisible = (produits) =>
  produits.map((produit) => ({
    nom: produit.name,
    quantite: produit.quantity,
    avant: produit.expiresOn,
  }));

// --- Écrire ---------------------------------------------------------------------

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** « lundi 5 octobre soir » : une case comme on la dit, pour les messages. */
export function libelleCase(date, creneau) {
  const jour = enUTC(date);
  return `${nomDuJour(date)} ${jour.getUTCDate()} ${MOIS[jour.getUTCMonth()]} ${creneau}`;
}

/**
 * La numérotation qu'on colle avec une étape — « 1. », « 2) », « - ».
 *
 * Même règle que la saisie dans l'interface (`recipes/etapes.js`) : la fiche
 * numérote elle-même, et la garder donnerait « 1. 1. Préchauffer le four ».
 */
const NUMEROTATION = /^\s*(?:\d{1,2}[.)]|[-*•])\s+/;

export const sansNumerotation = (texte) => texte.replace(NUMEROTATION, '').trim();

/**
 * Une recette telle que Claude l'écrit, traduite pour `/recipes/resolve` et
 * `/recipes/items`. Ce qui n'est pas fourni est laissé vide : c'est le module
 * recettes qui décide de ce qu'il en garde.
 */
export function recettePourMinka(titre, recette = {}) {
  return {
    title: titre,
    servings: recette.parts ?? null,
    notes: recette.remarques ?? null,
    tags: recette.etiquettes ?? [],
    ingredients: (recette.ingredients ?? []).map((ingredient) => ({
      name: ingredient.nom,
      quantity: ingredient.quantite ?? null,
    })),
    steps: (recette.etapes ?? [])
      .map(sansNumerotation)
      .filter((texte) => texte !== '')
      .map((text) => ({ text })),
  };
}

/**
 * Seuls les champs fournis, pour `PATCH /recipes/items/:id` : un champ absent
 * n'est pas touché, une liste fournie remplace l'ancienne en entier.
 */
export function modificationPourMinka(champs) {
  const complete = recettePourMinka(champs.titre, champs);
  const modification = {};

  if (champs.titre !== undefined) modification.title = complete.title;
  if (champs.parts !== undefined) modification.servings = complete.servings;
  if (champs.remarques !== undefined) modification.notes = complete.notes;
  if (champs.etiquettes !== undefined) modification.tags = complete.tags;
  if (champs.ingredients !== undefined) modification.ingredients = complete.ingredients;
  if (champs.etapes !== undefined) modification.steps = complete.steps;

  return modification;
}

const cle = (date, creneau) => `${date}|${creneau}`;

/** Les cases demandées deux fois dans la même pose : laquelle l'emporterait ? */
export function casesEnDouble(repas) {
  const vues = new Set();
  const doubles = new Set();
  for (const { date, creneau } of repas) {
    const c = cle(date, creneau);
    if (vues.has(c)) doubles.add(libelleCase(date, creneau));
    vues.add(c);
  }
  return [...doubles];
}

/** La période qui couvre tous les repas à poser, pour relire le planning d'un coup. */
export function periodeDesRepas(repas) {
  const dates = repas.map((r) => r.date).sort();
  return { du: dates[0], au: dates.at(-1) };
}

/**
 * Les cases déjà occupées par **autre chose** que ce qu'on veut y poser.
 *
 * Une case qui porte déjà le même plat n'est pas un conflit : c'est une pose
 * qu'on rejoue — après une coupure, ou parce que Claude redemande la semaine
 * entière pour en changer un seul soir — et la refuser obligerait à tout
 * remplacer pour rien. « Le même plat » à l'orthographe près : la case porte
 * le titre du répertoire, « Soupe de potiron », là où Claude avait écrit
 * « Soupe de potirons ».
 */
export function casesEnConflit(repas, entrees) {
  const parCase = new Map(entrees.map((entree) => [cle(entree.onDate, entree.slot), entree]));

  return repas
    .map(({ date, creneau, plat }) => ({ date, creneau, plat, actuel: parCase.get(cle(date, creneau)) }))
    .filter(({ plat, actuel }) => actuel && !memePlat(actuel.title, plat))
    .map(({ date, creneau, actuel }) => ({ case: libelleCase(date, creneau), occupeePar: actuel.title }));
}

/**
 * Les cases à écrire, pour `PATCH /menus/plan`.
 *
 * Chacune porte ce qu'on y a lu (`attendu`) : si l'autre a touché une case
 * entre la lecture et l'écriture, le module menus refuse tout, plutôt que
 * d'effacer son geste sans que personne le sache. C'est la garde qui protège
 * déjà « Annuler » dans l'interface.
 *
 * @param {Array} repas      ce que Claude pose, dans l'ordre
 * @param {Array} resolus    `{ title, recipeId }`, dans le même ordre
 * @param {Array} entrees    le planning lu juste avant
 */
export function casesPourPlanning(repas, resolus, entrees) {
  const parCase = new Map(entrees.map((entree) => [cle(entree.onDate, entree.slot), entree]));

  return repas.map(({ date, creneau }, rang) => {
    const actuel = parCase.get(cle(date, creneau));
    return {
      onDate: date,
      slot: creneau,
      repas: { recipeId: resolus[rang].recipeId, title: resolus[rang].title },
      attendu: actuel ? { recipeId: actuel.recipeId ?? null, title: actuel.title } : null,
    };
  });
}

/**
 * Ce que Claude doit retenir d'une pose, et dire à la personne.
 *
 * Le point délicat est la recette **conservée** : Claude a proposé sa
 * version, Minka a gardé celle du foyer. Il faut qu'il le sache — et qu'il le
 * dise —, sans quoi il croirait ses ingrédients partis dans la liste de
 * courses.
 */
export function bilanDePose({ repas, resolus, recettes }) {
  const avertissements = [];

  if (!recettes) {
    avertissements.push(
      'Le module recettes ne répond pas : tout a été posé en texte libre, sans recette ni ingrédients.',
    );
  } else if (recettes.conservees.length > 0) {
    avertissements.push(
      `Recettes du foyer gardées telles quelles : ${recettes.conservees.join(', ')}. ` +
        'Elles ont déjà leur préparation, qui fait foi : la version proposée n’a pas été ' +
        'enregistrée, et ses ingrédients ne sont pas ceux qui partiront dans les courses. ' +
        'Lis-les avec lire_recette avant d’en parler.',
    );
  }

  return {
    poses: repas.length,
    cases: repas.map(({ date, creneau }, rang) => ({
      case: libelleCase(date, creneau),
      plat: resolus[rang].title,
      recetteId: resolus[rang].recipeId,
    })),
    ...(recettes
      ? {
          recettes: {
            creees: recettes.creees,
            completees: recettes.completees,
            conservees: recettes.conservees,
            reutilisees: recettes.reutilisees,
          },
          textesLibres: recettes.inconnues,
        }
      : {}),
    ...(avertissements.length > 0 ? { avertissements } : {}),
  };
}
