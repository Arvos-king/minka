/**
 * Conversion entre les centimes de l'API et ce qu'on lit ou tape.
 *
 * Les montants voyagent en **entiers de centimes**, jamais en flottants : 0.1
 * plus 0.2 ne fait pas 0.3, et un total de fin de mois faux d'un centime est un
 * total faux. La conversion se fait donc ici, une fois, et sans arithmétique
 * décimale.
 */

const formatEuros = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

const formatEurosEntiers = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** « 12,50 € ». */
export function formaterMontant(centimes) {
  return formatEuros.format((centimes ?? 0) / 100);
}

/**
 * « 12,50 € », ou « 40 € » quand les centimes sont nuls.
 *
 * Sert aux totaux et aux plafonds, où « 400,00 € » encombre pour rien. Les
 * lignes de dépense, elles, gardent toujours les centimes : c'est un relevé,
 * on doit y retrouver le montant exact.
 */
export function formaterMontantCourt(centimes) {
  const valeur = centimes ?? 0;
  return valeur % 100 === 0 ? formatEurosEntiers.format(valeur / 100) : formaterMontant(valeur);
}

/**
 * Lit un montant tapé à la main, en centimes.
 *
 * Accepte la virgule comme le point, l'euro, les espaces — y compris
 * l'insécable que les claviers glissent avant le symbole. Renvoie `null` si
 * rien d'exploitable : à l'appelant de refuser la saisie.
 *
 * L'analyse porte sur les chiffres eux-mêmes, sans jamais passer par un
 * flottant : `Math.round(12.345 * 100)` vaut 1234, pas 1235, et personne ne
 * remarque l'erreur avant de faire la somme.
 */
export function analyserMontant(texte) {
  if (typeof texte !== 'string') return null;

  const normalise = texte
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(/€/g, '')
    .replace(',', '.');

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
