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
