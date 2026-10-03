/**
 * Lecture d'une recette écrite en texte.
 *
 * Sert à faire entrer d'un geste ce qui a été rédigé ailleurs — une
 * conversation, un site, un carnet recopié. Le format n'est pas inventé pour
 * l'occasion : c'est celui sous lequel les recettes s'écrivent déjà partout, un
 * titre, une liste d'ingrédients, une suite d'étapes.
 *
 *   Gratin de courgettes
 *   Pour 4 personnes
 *   Étiquettes : végétarien, four
 *
 *   Ingrédients
 *   - 600 g de courgettes
 *   - 2 gousses d'ail
 *   - Sel
 *
 *   Préparation
 *   1. Préchauffer le four à 180 °C
 *   2. Émincer les courgettes
 *
 * Les en-têtes de section sont facultatifs : sans eux, une ligne à puce est un
 * ingrédient et une ligne numérotée une étape. C'est ce qui permet de coller
 * une recette trouvée telle quelle, sans la remettre en forme d'abord.
 *
 * Ce qui tient à la langue — en-têtes, façons d'annoncer les parts, unités,
 * nombres en lettres — est rangé dans `REGLES`, une entrée par langue. La
 * mécanique, elle, est la même pour toutes.
 *
 * Rien n'est enregistré sans avoir été montré : l'analyse se fait à la frappe
 * et l'aperçu dit ce qui sera créé, comme pour l'import d'une semaine de menus.
 */

import { LANGUE, textes } from '../../lib/langue.js';
import { decouperEtapes } from './etapes.js';
import { normaliser } from './recherche.js';
import { TEXTES } from './textes.js';

/** Retire la décoration Markdown qu'une réponse copiée traîne souvent. */
const nettoyer = (ligne) =>
  ligne
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[>|]\s*/, '')
    .trimEnd();

/*
 * Les quantités écrites devant le nom — « 600 g de courgettes ».
 *
 * C'est la forme de tous les livres et de tous les sites. Le format propre à
 * Minka, « Courgettes : 600 g », reste accepté et passe avant : il ne laisse
 * rien à deviner.
 */
const NOMBRE = String.raw`\d+(?:[.,]\d+)?(?:\s*/\s*\d+)?`;

/**
 * La quantité de tête, son unité et le mot qui la relie au nom.
 *
 * @param {string} nombres  les nombres reconnus, chiffres ou lettres
 * @param {string[]} unites
 * @param {string} liaison  ce qui sépare la quantité du nom (« de », « of »)
 * @param {string} [unitaires]  ce qui ne vaut quantité que suivi d'une unité
 *   — « a pinch », mais pas le « a » de « a little milk »
 */
function quantiteDevant(nombres, unites, liaison, unitaires) {
  const unite = `(?:${unites.join('|')})`;
  const avecUnite = unitaires ? `|(?:${unitaires})\\s*${unite}` : '';
  return new RegExp(
    `^(?<quantite>(?:${nombres})(?:\\s*${unite})?${avecUnite})` +
      `\\s+(?:${liaison})?(?<nom>.+)$`,
    'i',
  );
}

const REGLES = {
  fr: {
    sections: [
      [
        'ingredients',
        ['ingredients', 'ingredient', 'les ingredients', 'il vous faut', 'pour la recette'],
      ],
      [
        'etapes',
        [
          'preparation',
          'la preparation',
          'etapes',
          'etape',
          'instructions',
          'realisation',
          'marche a suivre',
          'recette',
        ],
      ],
    ],

    /** « Pour 4 », « Pour 4 personnes », « 6 parts », « Portions : 2 ». */
    parts: [
      /^pour\s+(\d{1,2})\b/,
      /^(\d{1,2})\s+(?:personnes?|parts?|portions?)\b/,
      /^(?:portions?|parts?|nombre de parts)\s*:\s*(\d{1,2})\b/,
    ],

    /** « Étiquettes : végétarien, four » — annoncées, jamais devinées. */
    etiquettes: /^\s*(?:étiquettes?|etiquettes?|tags?|mots[-\s]cl[ée]s?)\s*:\s*(.+)$/i,

    quantiteDevant: quantiteDevant(
      `${NOMBRE}|une?|deux|trois|quatre|cinq|six|demi|quelques`,
      [
        'kg',
        'g',
        'mg',
        'l',
        'cl',
        'ml',
        'dl',
        String.raw`cuill[eè]res?\s+[àa]\s+soupe`,
        String.raw`cuill[eè]res?\s+[àa]\s+caf[ée]`,
        String.raw`c\.?\s*[àa]\.?\s*s\.?`,
        String.raw`c\.?\s*[àa]\.?\s*c\.?`,
        'cs',
        'cc',
        'pinc[ée]es?',
        'gousses?',
        'tranches?',
        'sachets?',
        'bo[îi]tes?',
        'pots?',
        'bottes?',
        'brins?',
        'feuilles?',
        'verres?',
        'tasses?',
        'filets?',
        'traits?',
        'poign[ée]es?',
        'bouquets?',
        'branches?',
        't[êe]tes?',
        'morceaux?',
        'rondelles?',
        'portions?',
        'tiges?',
      ],
      String.raw`de\s+|du\s+|des\s+|d['’]\s*`,
    ),

    /** Pas de « Étape 1 » à part : la numérotation tient sur la ligne. */
    marqueurEtape: null,
  },

  en: {
    sections: [
      [
        'ingredients',
        [
          'ingredients',
          'ingredient',
          'you will need',
          "you'll need",
          'you’ll need',
          'what you need',
          'for the recipe',
        ],
      ],
      [
        'etapes',
        [
          'method',
          'directions',
          'instructions',
          'steps',
          'step',
          'preparation',
          'how to make it',
          'how to make',
          'recipe',
        ],
      ],
    ],

    /** « Serves 4 », « Makes 12 », « For 4 people », « 4 servings », « Yield: 6 ». */
    parts: [
      /^(?:serves|makes|for)\s+(\d{1,2})\b/,
      /^(\d{1,2})\s+(?:servings?|portions?|people|persons?)\b/,
      /^(?:servings?|portions?|serves|yield|makes)\s*:\s*(\d{1,2})\b/,
    ],

    etiquettes: /^\s*(?:tags?|labels?|keywords?)\s*:\s*(.+)$/i,

    /*
     * Les recettes anglaises écrivent volontiers « ½ » et « 1½ », et donnent
     * des fourchettes, « 2-3 tbsp ». La taille d'un légume passe dans la
     * quantité — « 2 large onions » donne « Onions », « 2 large » — pour que
     * la liste de courses réunisse les oignons de deux recettes.
     */
    quantiteDevant: quantiteDevant(
      String.raw`(?:\d+\s*)?[½⅓⅔¼¾⅛]|\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?(?:\s*/\s*\d+)?` +
        String.raw`|one|two|three|four|five|six|half(?:\s+an?)?|a\s+few|a\s+couple(?:\s+of)?`,
      [
        'kg',
        'g',
        'mg',
        'l',
        'ml',
        'cl',
        'dl',
        'oz',
        'lbs?',
        String.raw`fl\.?\s*oz`,
        'grams?',
        'kilos?',
        'kilograms?',
        'litres?',
        'liters?',
        'millilitres?',
        'milliliters?',
        'ounces?',
        'pounds?',
        'pints?',
        'cups?',
        'tsps?',
        'tbsps?',
        'tbs',
        'teaspoons?',
        'tablespoons?',
        'pinch(?:es)?',
        'dash(?:es)?',
        'drops?',
        'cloves?',
        'slices?',
        'sachets?',
        'tins?',
        'cans?',
        'jars?',
        'packs?',
        'packets?',
        'pots?',
        'tubs?',
        'bunch(?:es)?',
        'sprigs?',
        'leaf',
        'leaves',
        'handfuls?',
        'knobs?',
        'heads?',
        'sticks?',
        'stalks?',
        'pieces?',
        'rashers?',
        'fillets?',
        'cubes?',
        'glass(?:es)?',
        'large',
        'medium',
        'small',
      ],
      String.raw`of\s+`,
      'an?',
    ),

    /** « Step 1 », sur sa ligne ou en tête d'étape, comme l'écrivent les sites. */
    marqueurEtape: /^\s*step\s+\d{1,2}\b\s*[:.)\-–]?\s*/i,
  },
};

const reglesDe = (langue) => REGLES[langue] ?? REGLES.fr;

/** @returns {'ingredients'|'etapes'|null} */
function sectionAnnoncee(ligne, regles) {
  const nue = normaliser(ligne).replace(/\s*:\s*$/, '');
  return regles.sections.find(([, formes]) => formes.includes(nue))?.[0] ?? null;
}

/** @returns {number|null} */
function lireParts(ligne, regles) {
  const nue = normaliser(ligne);
  let trouve = null;
  for (const motif of regles.parts) {
    trouve = nue.match(motif);
    if (trouve) break;
  }

  if (!trouve) return null;
  const parts = Number(trouve[1]);
  return parts >= 1 && parts <= 50 ? parts : null;
}

function lireEtiquettes(ligne, regles) {
  const trouve = nettoyer(ligne).match(regles.etiquettes);
  if (!trouve) return null;

  return trouve[1]
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '');
}

/*
 * L'espace après la puce est facultatif — « -Sel » se colle aussi, et une ligne
 * réduite au seul tiret ne laisse alors rien derrière elle.
 *
 * Il ne l'est pas après un numéro, et c'est délibéré : sans lui, « 2.5 kg de
 * farine » se lirait comme une deuxième étape nommée « 5 kg de farine ».
 */
const PUCE = /^\s*[-*•–]\s*/;
const NUMERO = /^\s*\d{1,2}[.)]\s+/;

/** Une majuscule initiale, comme si le nom avait été saisi à la main. */
const capitaliser = (nom, langue) =>
  nom === '' ? nom : nom[0].toLocaleUpperCase(langue) + nom.slice(1);

/**
 * « Courgettes : 600 g », « 600 g de courgettes », « Sel ».
 *
 * @returns {{name: string, quantity: string|null}|null}
 */
export function lireIngredient(ligne, langue = LANGUE) {
  const nue = nettoyer(ligne).replace(PUCE, '').replace(NUMERO, '').trim();
  if (nue === '') return null;

  const separateur = nue.search(/[:–—]/);
  if (separateur !== -1) {
    const name = nue.slice(0, separateur).trim();
    const quantity = nue.slice(separateur + 1).trim();
    return name === '' ? null : { name, quantity: quantity === '' ? null : quantity };
  }

  const devant = nue.match(reglesDe(langue).quantiteDevant);
  if (devant) {
    const name = capitaliser(devant.groups.nom.trim(), langue);
    return name === '' ? null : { name, quantity: devant.groups.quantite.trim() };
  }

  return { name: nue, quantity: null };
}

/**
 * Analyse une recette écrite en texte.
 *
 * @param {string} texte
 * @returns {{recette: object, avertissements: string[]}}
 *   `avertissements` recueille ce qui n'a pas été compris, pour le dire avant
 *   d'enregistrer plutôt que de laisser découvrir ce qui manque.
 */
export function analyserRecette(texte, langue = LANGUE) {
  const regles = reglesDe(langue);
  const t = textes(TEXTES, langue).importation;
  const avertissements = [];

  let title = '';
  let servings = null;
  let tags = [];
  const ingredients = [];
  const lignesEtapes = [];

  let section = null;

  for (const ligneBrute of (texte ?? '').split('\n')) {
    const ligne = nettoyer(ligneBrute);
    if (ligne.trim() === '') continue;

    const annonce = sectionAnnoncee(ligne, regles);
    if (annonce) {
      section = annonce;
      continue;
    }

    const etiquettes = lireEtiquettes(ligne, regles);
    if (etiquettes) {
      tags = etiquettes;
      continue;
    }

    /*
     * « Step 1 » annonce une étape : seul sur sa ligne, il ouvre la
     * préparation et la phrase suivante en est le texte ; en tête, il tombe
     * comme une numérotation.
     */
    if (title !== '' && regles.marqueurEtape?.test(ligne)) {
      section = 'etapes';
      const reste = ligne.replace(regles.marqueurEtape, '').trim();
      if (reste !== '') lignesEtapes.push(reste);
      continue;
    }

    /*
     * Le titre et le nombre de parts ne se lisent qu'en tête, avant toute
     * section : « 2 gousses d'ail » au milieu des ingrédients n'annonce pas
     * une recette pour deux.
     */
    if (section === null) {
      const parts = lireParts(ligne, regles);
      if (parts !== null) {
        servings = parts;
        continue;
      }

      if (title === '' && !PUCE.test(ligne) && !NUMERO.test(ligne)) {
        title = ligne.trim();
        continue;
      }
    }

    if (section === 'ingredients') {
      const lu = lireIngredient(ligne, langue);
      if (lu) ingredients.push(lu);
      continue;
    }

    if (section === 'etapes') {
      lignesEtapes.push(ligne);
      continue;
    }

    /*
     * Hors de toute section, la forme de la ligne tranche. Un document sans
     * en-têtes reste ainsi lisible, ce qui est le cas le plus fréquent : on
     * colle ce qu'on a trouvé, on ne le remet pas en forme d'abord.
     */
    if (PUCE.test(ligne)) {
      const lu = lireIngredient(ligne, langue);
      if (lu) ingredients.push(lu);
    } else if (NUMERO.test(ligne)) {
      lignesEtapes.push(ligne);
    } else if (lignesEtapes.length > 0) {
      // Une étape peut tenir sur deux lignes, ou perdre sa numérotation en
      // route : elle rejoint alors celles qui la précèdent.
      lignesEtapes.push(ligne);
    } else {
      avertissements.push(t.ligneIgnoree(ligne.trim()));
    }
  }

  const vide = (texte ?? '').trim() === '';

  if (title === '' && !vide) avertissements.push(t.sansTitre);
  if (ingredients.length === 0 && !vide) avertissements.push(t.sansIngredient);

  return {
    recette: { title, servings, tags, ingredients, steps: decouperEtapes(lignesEtapes.join('\n')) },
    avertissements,
  };
}
