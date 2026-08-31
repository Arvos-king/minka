/**
 * Les étapes se saisissent en texte — **une ligne, une étape** —, et se
 * stockent en lignes de table.
 *
 * Ce n'est pas une inconséquence. Cocher une étape pendant qu'on cuisine
 * demande qu'elle existe séparément et qu'on puisse la désigner ; l'écrire, au
 * contraire, demande de pouvoir en glisser une au milieu sans réordonner quoi
 * que ce soit. Un champ par étape aurait imposé un mécanisme de déplacement
 * pour un geste qui n'a lieu qu'à la rédaction.
 *
 * La règle reste vérifiable d'un coup d'œil : la fiche montre le résultat
 * numéroté aussitôt enregistré.
 */

/**
 * La numérotation qu'on colle avec le texte — « 1. », « 2) », « - », « • ».
 *
 * Elle est retirée parce que l'affichage numérote lui-même : la garder
 * donnerait « 1. 1. Faire revenir les oignons ». Un chiffre seul en tête de
 * ligne n'est pas touché, lui — « 2 œufs à ajouter » est une étape légitime.
 */
const NUMEROTATION = /^\s*(?:\d{1,2}[.)]|[-*•])\s+/;

/** @returns {Array<{text: string}>} prêt pour l'API. */
export function decouperEtapes(texte) {
  return (texte ?? '')
    .split('\n')
    // `trim` fait aussi le ménage des retours chariot d'un texte collé depuis
    // Windows, où une ligne se termine par « \r\n ».
    .map((ligne) => ligne.replace(NUMEROTATION, '').trim())
    .filter((ligne) => ligne !== '')
    .map((text) => ({ text }));
}

/** Le chemin inverse : remplir le champ depuis une recette enregistrée. */
export function recoudreEtapes(steps) {
  return (steps ?? []).map((step) => step.text).join('\n');
}
