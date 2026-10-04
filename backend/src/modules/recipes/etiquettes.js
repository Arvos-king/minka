/**
 * Cohérence des étiquettes, sans nomenclature ni écran de gestion.
 *
 * Il n'y a pas de table d'étiquettes : une étiquette est son texte. Le seul
 * risque est donc l'orthographe — « Végétarien », « végétarien » et
 * « vegetarien » feraient trois filtres pour une seule idée, et le répertoire
 * se couperait en morceaux sans que rien ne le signale.
 *
 * La règle : une étiquette **équivalente** à une déjà connue reprend son
 * orthographe. Exactement ce que fait le répertoire avec un titre de recette
 * retrouvé — on tape « gratin de courgettes », on obtient « Gratin de
 * courgettes ».
 */

import { LANGUE } from '../../lib/langue.js';

/**
 * Sans casse, sans accents, sans espaces superflus.
 *
 * Les accents tombent parce qu'on tape vite sur un téléphone, et qu'une
 * étiquette écrite « vegetarien » un soir ne doit pas séparer la recette de ses
 * pareilles.
 */
export function normaliserEtiquette(tag) {
  return tag
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * L'orthographe retenue pour une étiquette encore inconnue.
 *
 * Elle est gardée telle qu'écrite — « Végétarien » ou « végétarien », c'est au
 * foyer de choisir — à une exception : une étiquette **tout en majuscules**
 * est rendue à sa minuscule. C'est la touche majuscule restée enfoncée, ou le
 * clavier d'un téléphone ; sans cela elle hurlerait ensuite dans tous les
 * filtres, la première orthographe faisant foi pour toutes les suivantes.
 *
 * Le compte de lettres écarte les étiquettes sans casse — « 30 min » n'est pas
 * un cri.
 */
function adoucir(tag) {
  const propre = tag.trim().replace(/\s+/g, ' ');
  const lettres = propre.replace(/[^\p{L}]/gu, '');

  return lettres.length > 1 && propre === propre.toLocaleUpperCase(LANGUE)
    ? propre.toLocaleLowerCase(LANGUE)
    : propre;
}

/**
 * Aligne des étiquettes sur celles déjà en usage, et retire les doublons.
 *
 * @param {string[]} tags     ce qui a été saisi
 * @param {string[]} connues  les étiquettes déjà portées par une recette
 * @returns {string[]} dans l'ordre de saisie, orthographes connues d'abord.
 */
export function aligner(tags, connues) {
  const reference = new Map();
  // La première rencontrée fait foi : les étiquettes connues arrivent triées,
  // le résultat ne dépend donc pas de l'ordre d'insertion en base.
  for (const connue of connues) {
    const cle = normaliserEtiquette(connue);
    if (!reference.has(cle)) reference.set(cle, connue);
  }

  const retenues = new Map();
  for (const tag of tags) {
    const cle = normaliserEtiquette(tag);
    if (cle === '' || retenues.has(cle)) continue;
    retenues.set(cle, reference.get(cle) ?? adoucir(tag));
  }

  return [...retenues.values()];
}
