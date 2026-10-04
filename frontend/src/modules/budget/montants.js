/**
 * Conversion entre les centimes de l'API et ce qu'on lit ou tape.
 *
 * Les montants voyagent en **entiers de centimes**, jamais en flottants : 0.1
 * plus 0.2 ne fait pas 0.3, et un total de fin de mois faux d'un centime est un
 * total faux. La conversion se fait donc ici, une fois, et sans arithmétique
 * décimale.
 *
 * La monnaie est celle de l'instance (MINKA_CURRENCY, l'euro par défaut), et
 * l'écriture celle de sa langue : « 12,50 € » en français, « £12.50 » en
 * anglais. Les montants restent des centièmes d'unité, ce que vaut toute
 * monnaie à deux décimales — `vite.config.js` refuse les autres.
 */

import { DEVISE, LANGUE, localeDe } from '../../lib/langue.js';

const formateurs = new Map();

/** Formateur monétaire de la langue, construit une fois : le relevé du mois en appelle un par ligne. */
function formateur(langue, entiers) {
  const cle = `${langue}|${entiers}`;
  let format = formateurs.get(cle);
  if (!format) {
    format = new Intl.NumberFormat(localeDe(langue), {
      style: 'currency',
      currency: DEVISE,
      ...(entiers ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2 }),
    });
    formateurs.set(cle, format);
  }
  return format;
}

/** « 12,50 € ». */
export function formaterMontant(centimes, langue = LANGUE) {
  return formateur(langue, false).format((centimes ?? 0) / 100);
}

/**
 * « 12,50 € », ou « 40 € » quand les centimes sont nuls.
 *
 * Sert aux totaux et aux plafonds, où « 400,00 € » encombre pour rien. Les
 * lignes de dépense, elles, gardent toujours les centimes : c'est un relevé,
 * on doit y retrouver le montant exact.
 */
export function formaterMontantCourt(centimes, langue = LANGUE) {
  const valeur = centimes ?? 0;
  return valeur % 100 === 0
    ? formateur(langue, true).format(valeur / 100)
    : formaterMontant(valeur, langue);
}

/** « , » en français, « . » en anglais. */
export function separateurDecimal(langue = LANGUE) {
  return (
    new Intl.NumberFormat(localeDe(langue)).formatToParts(1.5).find((p) => p.type === 'decimal')?.value ??
    '.'
  );
}

/**
 * Le montant tel qu'on le retouche dans un champ : « 12,50 », « 1234,56 » —
 * sans symbole ni séparateur de milliers, que la saisie n'a pas à retaper.
 */
export function montantEditable(centimes, langue = LANGUE) {
  const decimal = separateurDecimal(langue).replace('.', '\\.');
  return formaterMontant(centimes, langue).replace(new RegExp(`[^\\d${decimal}]`, 'g'), '');
}

/**
 * En anglais, la virgule sépare les milliers (« 1,234.56 »). Elle reste
 * décimale au bout d'un nombre sans point (« 12,50 ») : c'est celle que
 * propose le pavé numérique d'un téléphone réglé sur une région européenne.
 */
function normaliserAnglais(texte) {
  if (/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(texte)) return texte.replaceAll(',', '');
  if (/^\d*,\d{1,2}$/.test(texte)) return texte.replace(',', '.');
  return texte;
}

/**
 * Lit un montant tapé à la main, en centimes.
 *
 * Accepte la virgule comme le point, le symbole ou le code de la monnaie, les
 * espaces — y compris l'insécable que les claviers glissent avant le symbole.
 * En anglais, la virgule des milliers aussi. Renvoie `null` si rien
 * d'exploitable : à l'appelant de refuser la saisie.
 *
 * L'analyse porte sur les chiffres eux-mêmes, sans jamais passer par un
 * flottant : `Math.round(12.345 * 100)` vaut 1234, pas 1235, et personne ne
 * remarque l'erreur avant de faire la somme.
 */
export function analyserMontant(texte, langue = LANGUE) {
  if (typeof texte !== 'string') return null;

  const sansDecor = texte
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(/\p{Sc}/gu, '')
    // Le code qui accompagne parfois le symbole : « US$12.50 », « 12 CHF ».
    .replace(/^\p{L}+|\p{L}+$/gu, '');

  const normalise = langue === 'en' ? normaliserAnglais(sansDecor) : sansDecor.replace(',', '.');

  const trouve = /^(\d*)(?:\.(\d{1,2}))?$/.exec(normalise);
  if (!trouve) return null;

  const [, entier = '', decimales] = trouve;
  // Ni chiffre avant le séparateur, ni après : il n'y a pas de montant.
  if (entier === '' && !decimales) return null;

  const centimes = Number(entier || '0') * 100 + Number((decimales ?? '').padEnd(2, '0') || '0');
  return Number.isSafeInteger(centimes) ? centimes : null;
}

/**
 * Part d'un plafond déjà consommée, bornée à 1.
 *
 * Bornée parce que la barre ne peut pas déborder de son cadre : le dépassement
 * s'annonce par la couleur et par le chiffre, pas en sortant de l'écran.
 */
export function partConsommee(depenseCentimes, plafondCentimes) {
  if (!plafondCentimes || plafondCentimes <= 0) return null;
  return Math.min(1, Math.max(0, depenseCentimes / plafondCentimes));
}
