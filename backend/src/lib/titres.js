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

import { LANGUE } from './langue.js';

/**
 * Le singulier approximatif de chaque langue — de quoi comparer, pas écrire.
 *
 * En français, le pluriel n'est retiré que des mots de plus de trois lettres :
 * « aux », « des », « riz » restent ce qu'ils sont.
 *
 * L'anglais demande davantage : « tomatoes », « berries », « peaches » ne
 * retrouvent pas leur singulier en ôtant un « s ». Plutôt que de deviner le
 * singulier, on réduit les deux formes à une même racine — sans « s », sans
 * « e » final, « y » changé en « i » : « berry » et « berries » donnent tous
 * deux « berri », « cookie » et « cookies » « cooki ». « glass », « hummus »
 * gardent leur « s ».
 */
const SINGULIERS = {
  fr: (mot) => (mot.length > 3 ? mot.replace(/[sx]$/, '') : mot),
  en: (mot) => {
    if (mot.length <= 3) return mot;
    let racine = /(ss|us|is)$/.test(mot) ? mot : mot.replace(/s$/, '');
    if (racine.length > 3) racine = racine.replace(/e$/, '').replace(/y$/, 'i');
    return racine;
  },
};

/**
 * La clé sous laquelle deux titres désignent le même plat.
 *
 * Sans casse ni accents, comme une étiquette ; mais aussi sans ponctuation, et
 * **sans le pluriel** de chaque mot : « Gratin de courgette » doit retrouver
 * « Gratin de courgettes », sans quoi le répertoire se dédouble au gré d'une
 * proposition écrite un peu autrement, et la recette relue la semaine dernière
 * reste à l'écart.
 *
 * Le pluriel tombe selon la langue de l'instance (voir `SINGULIERS`). La règle
 * est grossière — « noix » devient « noi » — mais elle l'est des deux côtés,
 * et c'est tout ce qu'on lui demande : comparer, pas écrire.
 */
export function cleTitre(titre, langue = LANGUE) {
  const singulier = SINGULIERS[langue] ?? SINGULIERS.fr;
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
    .map(singulier)
    .join(' ');
}

/** Vrai si les deux titres désignent le même plat. */
export const memePlat = (a, b, langue = LANGUE) =>
  cleTitre(a, langue) !== '' && cleTitre(a, langue) === cleTitre(b, langue);
