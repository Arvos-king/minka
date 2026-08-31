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
 * Rien n'est enregistré sans avoir été montré : l'analyse se fait à la frappe
 * et l'aperçu dit ce qui sera créé, comme pour l'import d'une semaine de menus.
 */

import { decouperEtapes } from './etapes.js';
import { normaliser } from './recherche.js';

/** Retire la décoration Markdown qu'une réponse copiée traîne souvent. */
const nettoyer = (ligne) =>
  ligne
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[>|]\s*/, '')
    .trimEnd();

const SECTIONS = [
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
];

/** @returns {'ingredients'|'etapes'|null} */
function sectionAnnoncee(ligne) {
  const nue = normaliser(ligne).replace(/\s*:\s*$/, '');
  return SECTIONS.find(([, formes]) => formes.includes(nue))?.[0] ?? null;
}

/**
 * « Pour 4 », « Pour 4 personnes », « 6 parts », « Portions : 2 ».
 *
 * @returns {number|null}
 */
function lireParts(ligne) {
  const nue = normaliser(ligne);
  const trouve =
    nue.match(/^pour\s+(\d{1,2})\b/) ??
    nue.match(/^(\d{1,2})\s+(?:personnes?|parts?|portions?)\b/) ??
    nue.match(/^(?:portions?|parts?|nombre de parts)\s*:\s*(\d{1,2})\b/);

  if (!trouve) return null;
  const parts = Number(trouve[1]);
  return parts >= 1 && parts <= 50 ? parts : null;
}

/** « Étiquettes : végétarien, four » — annoncées, jamais devinées. */
function lireEtiquettes(ligne) {
  const trouve = nettoyer(ligne).match(
    /^\s*(?:étiquettes?|etiquettes?|tags?|mots[-\s]cl[ée]s?)\s*:\s*(.+)$/i,
  );
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

/*
 * Les quantités écrites devant le nom — « 600 g de courgettes ».
 *
 * C'est la forme de tous les livres et de tous les sites. Le format propre à
 * Minka, « Courgettes : 600 g », reste accepté et passe avant : il ne laisse
 * rien à deviner.
 */
const NOMBRE = String.raw`\d+(?:[.,]\d+)?(?:\s*/\s*\d+)?`;
const NOMBRES_ECRITS = String.raw`une?|deux|trois|quatre|cinq|six|demi|quelques`;
const UNITES = [
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
];

const QUANTITE_DEVANT = new RegExp(
  `^(?<quantite>(?:${NOMBRE}|${NOMBRES_ECRITS})(?:\\s*(?:${UNITES.join('|')}))?)` +
    `\\s+(?:de\\s+|du\\s+|des\\s+|d['’]\\s*)?(?<nom>.+)$`,
  'i',
);

/** Une majuscule initiale, comme si le nom avait été saisi à la main. */
const capitaliser = (nom) => (nom === '' ? nom : nom[0].toLocaleUpperCase('fr') + nom.slice(1));

/**
 * « Courgettes : 600 g », « 600 g de courgettes », « Sel ».
 *
 * @returns {{name: string, quantity: string|null}|null}
 */
export function lireIngredient(ligne) {
  const nue = nettoyer(ligne).replace(PUCE, '').replace(NUMERO, '').trim();
  if (nue === '') return null;

  const separateur = nue.search(/[:–—]/);
  if (separateur !== -1) {
    const name = nue.slice(0, separateur).trim();
    const quantity = nue.slice(separateur + 1).trim();
    return name === '' ? null : { name, quantity: quantity === '' ? null : quantity };
  }

  const devant = nue.match(QUANTITE_DEVANT);
  if (devant) {
    const name = capitaliser(devant.groups.nom.trim());
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
export function analyserRecette(texte) {
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

    const annonce = sectionAnnoncee(ligne);
    if (annonce) {
      section = annonce;
      continue;
    }

    const etiquettes = lireEtiquettes(ligne);
    if (etiquettes) {
      tags = etiquettes;
      continue;
    }

    /*
     * Le titre et le nombre de parts ne se lisent qu'en tête, avant toute
     * section : « 2 gousses d'ail » au milieu des ingrédients n'annonce pas
     * une recette pour deux.
     */
    if (section === null) {
      const parts = lireParts(ligne);
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
      const lu = lireIngredient(ligne);
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
      const lu = lireIngredient(ligne);
      if (lu) ingredients.push(lu);
    } else if (NUMERO.test(ligne)) {
      lignesEtapes.push(ligne);
    } else if (lignesEtapes.length > 0) {
      // Une étape peut tenir sur deux lignes, ou perdre sa numérotation en
      // route : elle rejoint alors celles qui la précèdent.
      lignesEtapes.push(ligne);
    } else {
      avertissements.push(`Ligne ignorée : « ${ligne.trim()} ».`);
    }
  }

  const vide = (texte ?? '').trim() === '';

  if (title === '' && !vide) {
    avertissements.push('Aucun titre trouvé : la première ligne doit être le nom de la recette.');
  }
  if (ingredients.length === 0 && !vide) {
    avertissements.push(
      'Aucun ingrédient reconnu. Un par ligne, précédé d’un tiret, sous « Ingrédients ».',
    );
  }

  return {
    recette: { title, servings, tags, ingredients, steps: decouperEtapes(lignesEtapes.join('\n')) },
    avertissements,
  };
}
