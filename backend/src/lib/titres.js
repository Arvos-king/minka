/**
 * Quand deux titres désignent-ils le même plat ?
 *
 * Appartient au socle parce que deux modules s'en servent : les recettes, qui
 * retrouvent une recette par son titre plutôt que d'en créer une seconde, et
 * le connecteur Claude, qui reconnaît dans une case déjà remplie le plat qu'il
 * s'apprête à y poser. Le même chemin que `recurrence.js` : dès qu'une brique
 * sert à deux modules, elle monte ici plutôt que d'être recopiée — et deux
 * copies qui divergeraient feraient refuser par l'un ce que l'autre a accepté.
 */

/**
 * La clé sous laquelle deux titres désignent le même plat.
 *
 * Sans casse ni accents, comme une étiquette ; mais aussi sans ponctuation, et
 * **sans le pluriel** de chaque mot : « Gratin de courgette » doit retrouver
 * « Gratin de courgettes », sans quoi le répertoire se dédouble au gré d'une
 * proposition écrite un peu autrement, et la recette relue la semaine dernière
 * reste à l'écart.
 *
 * Le pluriel n'est retiré que des mots de plus de trois lettres : « aux »,
 * « des », « riz » restent ce qu'ils sont. La règle est grossière — « noix »
 * devient « noi » — mais elle l'est des deux côtés, et c'est tout ce qu'on lui
 * demande : comparer, pas écrire.
 */
export function cleTitre(titre) {
  return (titre ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Ligatures que NFD ne décompose pas : « bœuf » s'écrit souvent « boeuf ».
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((mot) => (mot.length > 3 ? mot.replace(/[sx]$/, '') : mot))
    .join(' ');
}

/** Vrai si les deux titres désignent le même plat. */
export const memePlat = (a, b) => cleTitre(a) !== '' && cleTitre(a) === cleTitre(b);
