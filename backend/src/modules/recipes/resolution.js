/**
 * Le sort d'un plat désigné par son intitulé : retrouver la recette, ou la
 * créer, ou la compléter, ou n'y rien toucher.
 *
 * C'est la règle de `/recipes/resolve`, par où passent l'import d'une semaine
 * écrite en texte et le connecteur Claude. Elle est isolée ici, sans accès à la
 * base, pour être vérifiée par `node --test` — `service.js` ne fait plus que
 * l'appliquer.
 *
 * **La recette du foyer fait foi.** Une recette qui a sa préparation a été
 * écrite, ou relue, par quelqu'un de la maison : une proposition venue
 * d'ailleurs ne la réécrit pas, même si elle porte le même nom. Une recette
 * sans préparation, en revanche, n'est qu'une ébauche — souvent laissée par un
 * import d'avant, qui ne savait porter que les ingrédients — et la version
 * complète la remplace.
 *
 * Le titre se compare à l'orthographe près — voir `cleTitre`, dans le socle.
 */

import { cleTitre } from '../../lib/titres.js';

/**
 * La recette qu'un titre désigne, parmi celles du répertoire.
 *
 * Plusieurs peuvent répondre à la même clé — des doublons nés avant cette
 * règle. Celle qu'on a écrite exactement ainsi passe d'abord ; à défaut, la
 * plus ancienne, qui est le plus souvent celle qu'on a eu le temps de
 * compléter.
 *
 * @param {string} titre
 * @param {Array<{id: number, title: string}>} recettes
 * @returns {{id: number, title: string}|null}
 */
export function choisirRecette(titre, recettes) {
  const cle = cleTitre(titre);
  if (cle === '') return null;

  const candidates = recettes
    .filter((recette) => cleTitre(recette.title) === cle)
    .sort((a, b) => a.id - b.id);

  const exacte = candidates.find(
    (recette) => recette.title.toLocaleLowerCase('fr') === titre.trim().toLocaleLowerCase('fr'),
  );
  return exacte ?? candidates[0] ?? null;
}

/**
 * Ce que l'appelant apporte de concret : des ingrédients ou des étapes.
 *
 * Des étiquettes, des parts ou une remarque seules ne font pas une recette —
 * « Restes » n'en devient pas une parce qu'on l'a étiqueté.
 */
const apporteDuContenu = (plat) => plat.ingredients.length > 0 || plat.steps.length > 0;

/**
 * Le sort d'un plat.
 *
 * @param {object} p
 * @param {object|null} p.existante   la recette retrouvée par son titre
 * @param {boolean} p.aPreparation    vrai si elle a au moins une étape
 * @param {object} p.plat             ce que l'appelant propose
 * @returns {'creer'|'completer'|'conserver'|'reutiliser'|'libre'}
 *   — `creer` : aucune recette de ce nom, et de quoi en faire une ;
 *   — `completer` : une ébauche, que la proposition remplace ;
 *   — `conserver` : une recette achevée, que la proposition ne touche pas ;
 *   — `reutiliser` : un titre seul, qui désigne une recette connue ;
 *   — `libre` : un titre seul, que rien ne désigne — « Restes », « Resto ».
 */
export function sortDuPlat({ existante, aPreparation, plat }) {
  const contenu = apporteDuContenu(plat);

  if (!existante) return contenu ? 'creer' : 'libre';
  if (!contenu) return 'reutiliser';
  return aPreparation ? 'conserver' : 'completer';
}

/**
 * Ce qu'une proposition change à une ébauche — prêt pour `updateRecipe`.
 *
 * Les ingrédients et les étapes **fournis** remplacent les anciens : ils vont
 * ensemble, et des étapes nouvelles sur des ingrédients d'avant parleraient de
 * ce qui n'est pas acheté. Une liste vide, en revanche, ne vide rien.
 *
 * Ce que le foyer a déjà écrit lui-même reste : les parts et la remarque ne
 * sont posées que si elles manquaient, et les étiquettes s'ajoutent aux
 * siennes — « les enfants aiment » ne se perd pas parce qu'une proposition ne
 * le savait pas.
 *
 * @param {object} existante  la recette entière, étiquettes comprises
 * @param {object} plat
 * @returns {object} les seuls champs à écrire.
 */
export function champsACompleter(existante, plat) {
  const champs = {};

  if (plat.ingredients.length > 0) champs.ingredients = plat.ingredients;
  if (plat.steps.length > 0) champs.steps = plat.steps;
  if (existante.servings == null && plat.servings != null) champs.servings = plat.servings;
  if (!existante.notes && plat.notes) champs.notes = plat.notes;
  // Les doublons sont l'affaire de `remplacerEtiquettes`, qui aligne aussi les
  // orthographes sur celles du répertoire.
  if (plat.tags.length > 0) champs.tags = [...existante.tags, ...plat.tags];

  return champs;
}
