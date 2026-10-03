/**
 * Lecture d'une semaine de menus écrite en texte.
 *
 * Sert à faire passer en un geste une proposition rédigée ailleurs — une
 * conversation, un carnet — dans le planning. Le format est pensé pour rester
 * lisible tel quel, avant même d'être importé : c'est d'abord un menu qu'on lit,
 * accessoirement un texte qu'une machine analyse.
 *
 *   Lundi
 *   Midi : Salade de lentilles
 *     - Lentilles vertes : 250 g
 *     - Échalote : 1
 *   Soir : Restes
 *
 * **Un plat dont on liste les ingrédients devient une recette** ; sans
 * ingrédients, il reste un texte libre — à moins qu'une recette du même nom
 * existe déjà, auquel cas elle est réutilisée. C'est ce qui permet d'écrire
 * « Soir : Gratin de courgettes » sans recopier sa liste à chaque fois.
 *
 * Les noms des jours et des moments sont ceux de la langue de l'instance
 * (`REGLES`) ; le reste du format ne change pas d'une langue à l'autre.
 */

import { LANGUE, textes } from '../../lib/langue.js';
import { TEXTES } from './textes.js';

const REGLES = {
  fr: {
    /** Du lundi au dimanche : le nom que citent les avertissements, puis les formes reconnues. */
    jours: [
      ['lundi', 'lun'],
      ['mardi', 'mar'],
      ['mercredi', 'mer'],
      ['jeudi', 'jeu'],
      ['vendredi', 'ven'],
      ['samedi', 'sam'],
      ['dimanche', 'dim'],
    ].map((formes) => ({ nom: formes[0], formes })),

    /** Les moments, par leur clé d'API, avec le nom que citent les avertissements. */
    creneaux: [
      { cle: 'midi', nom: 'midi', formes: ['midi', 'dejeuner', 'déjeuner'] },
      { cle: 'soir', nom: 'soir', formes: ['soir', 'diner', 'dîner', 'souper'] },
    ],
  },

  en: {
    jours: [
      { nom: 'Monday', formes: ['monday', 'mon'] },
      { nom: 'Tuesday', formes: ['tuesday', 'tue', 'tues'] },
      { nom: 'Wednesday', formes: ['wednesday', 'wed'] },
      { nom: 'Thursday', formes: ['thursday', 'thu', 'thur', 'thurs'] },
      { nom: 'Friday', formes: ['friday', 'fri'] },
      { nom: 'Saturday', formes: ['saturday', 'sat'] },
      { nom: 'Sunday', formes: ['sunday', 'sun'] },
    ],

    // « Tea » est le repas du soir dans une bonne partie du Royaume-Uni.
    creneaux: [
      { cle: 'midi', nom: 'lunch', formes: ['lunch', 'midday', 'noon'] },
      { cle: 'soir', nom: 'dinner', formes: ['dinner', 'supper', 'evening', 'tea'] },
    ],
  },
};

/** Sans accents ni casse : « Déjeuner » et « dejeuner » désignent la même chose. */
const aplatir = (texte) =>
  texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Retire la décoration Markdown qu'une réponse copiée traîne souvent. */
function nettoyer(ligne) {
  return ligne
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[>|]\s*/, '')
    .trimEnd();
}

/** @returns {number|null} rang du jour dans la semaine, 0 = lundi. */
function rangDuJour(ligne, regles) {
  // Comparaison sur le premier mot plutôt qu'une expression régulière : cela
  // tolère « Lundi », « lun. », « LUNDI : » et « lundi 31 août » sans avoir à
  // échapper quoi que ce soit.
  const premierMot = aplatir(ligne)
    .replace(/^[-*•]\s*/, '')
    .split(/[\s.:,]+/)[0];

  const rang = regles.jours.findIndex(({ formes }) => formes.includes(premierMot));
  return rang === -1 ? null : rang;
}

/** @returns {{creneau: object, reste: string}|null} */
function creneauEtReste(ligne, regles) {
  const nue = ligne.replace(/^\s*[-*•]\s*/, '');
  const separateur = nue.search(/[:–—]/);
  if (separateur === -1) return null;

  const gauche = aplatir(nue.slice(0, separateur));
  const trouve = regles.creneaux.find(({ formes }) => formes.some((f) => aplatir(f) === gauche));
  if (!trouve) return null;

  return { creneau: trouve, reste: nue.slice(separateur + 1).trim() };
}

/** « Courgettes : 600 g » → `{ name, quantity }` ; « Sel » → quantité nulle. */
function ingredient(ligne) {
  const nue = ligne.replace(/^\s*[-*•]\s*/, '').trim();
  if (nue === '') return null;

  const separateur = nue.search(/[:–—]/);
  if (separateur === -1) return { name: nue, quantity: null };

  const name = nue.slice(0, separateur).trim();
  const quantity = nue.slice(separateur + 1).trim();
  return name === '' ? null : { name, quantity: quantity === '' ? null : quantity };
}

/** Une ligne indentée, ou commençant par une puce, appartient au plat au-dessus. */
const estDetail = (ligneBrute) => /^(\s{2,}|\t|\s*[-*•])/.test(ligneBrute);

/**
 * Analyse un menu de semaine.
 *
 * @param {string} texte
 * @param {string} debutSemaine  le lundi, en AAAA-MM-JJ.
 * @returns {{repas: Array, avertissements: Array<string>}}
 *   `repas` : `{ onDate, slot, title, ingredients }`, prêt pour l'API.
 *   `avertissements` : ce qui n'a pas été compris, pour le dire avant d'appliquer
 *   plutôt que de laisser deviner ce qui manque.
 */
export function analyserMenus(texte, debutSemaine, langue = LANGUE) {
  const regles = REGLES[langue] ?? REGLES.fr;
  const t = textes(TEXTES, langue).importation;

  const repas = [];
  const avertissements = [];
  const vus = new Set();

  let rangJour = null;
  let courant = null;

  const cloturer = () => {
    if (!courant) return;
    repas.push(courant);
    courant = null;
  };

  for (const ligneBrute of (texte ?? '').split('\n')) {
    const ligne = nettoyer(ligneBrute);
    if (ligne.trim() === '') continue;

    // Un détail ne peut qu'appartenir au plat en cours.
    if (courant && estDetail(ligneBrute) && !creneauEtReste(ligne, regles)) {
      const lu = ingredient(ligne);
      if (lu) courant.ingredients.push(lu);
      continue;
    }

    const rang = rangDuJour(ligne, regles);
    if (rang !== null) {
      cloturer();
      rangJour = rang;
      continue;
    }

    const lu = creneauEtReste(ligne, regles);
    if (lu) {
      cloturer();

      if (rangJour === null) {
        avertissements.push(t.aucunJour(ligne.trim()));
        continue;
      }

      const jour = regles.jours[rangJour].nom;
      if (lu.reste === '') {
        avertissements.push(t.aucunPlat(jour, lu.creneau.nom));
        continue;
      }

      const cle = `${rangJour}-${lu.creneau.cle}`;
      if (vus.has(cle)) {
        avertissements.push(t.deuxFois(jour, lu.creneau.nom));
        const doublon = repas.findIndex((r) => r.cle === cle);
        if (doublon !== -1) repas.splice(doublon, 1);
      }
      vus.add(cle);

      courant = {
        cle,
        onDate: decalerDepuis(debutSemaine, rangJour),
        slot: lu.creneau.cle,
        title: lu.reste,
        ingredients: [],
      };
      continue;
    }

    avertissements.push(t.ligneIgnoree(ligne.trim()));
  }

  cloturer();

  if (repas.length === 0 && (texte ?? '').trim() !== '') {
    avertissements.push(t.aucunRepas);
  }

  return { repas: repas.map(({ cle, ...repasNet }) => repasNet), avertissements };
}

/** Décale un lundi de N jours, sans passer par le fuseau local. */
function decalerDepuis(debut, jours) {
  return new Date(Date.parse(`${debut}T00:00:00Z`) + jours * 86_400_000)
    .toISOString()
    .slice(0, 10);
}
