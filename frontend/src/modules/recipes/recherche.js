/**
 * Fouiller le répertoire.
 *
 * Tout se passe **dans le navigateur**, sur la liste déjà chargée : pas
 * d'aller-retour à chaque lettre tapée, et une recherche qui marche hors ligne
 * comme en ligne. C'est ce qui justifie que l'API livre les noms d'ingrédients
 * avec le répertoire — voir `listRecipes` côté serveur.
 */

/** Sans casse ni accents : on tape « creme » et on trouve « Crème ». */
export function normaliser(texte) {
  return (texte ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Les étiquettes en usage, pour les proposer en filtre et à la saisie.
 *
 * Rassemblées par forme normalisée — deux orthographes ne font qu'un filtre —,
 * puis rangées par ordre alphabétique. Le serveur aligne déjà les orthographes
 * à l'écriture ; ceci couvre ce qui aurait été écrit avant cette règle.
 */
export function etiquettesDe(recettes) {
  const parCle = new Map();

  for (const recette of recettes) {
    for (const tag of recette.tags ?? []) {
      const cle = normaliser(tag);
      if (cle !== '' && !parCle.has(cle)) parCle.set(cle, tag);
    }
  }

  return [...parCle.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}

/**
 * Cherche dans les titres **et dans les ingrédients**.
 *
 * « Qu'est-ce que je fais avec des courgettes ? » est la question qu'on pose à
 * un répertoire, et elle n'a de réponse que si l'on cherche aussi dedans.
 *
 * @returns {Array<{recette: object, ingredientsTrouves: string[]}>}
 *   `ingredientsTrouves` n'est rempli que lorsque le titre, lui, ne dit pas
 *   pourquoi la recette est là — inutile de rappeler que « Gratin de
 *   courgettes » contient des courgettes.
 */
export function chercherRecettes(recettes, { terme = '', etiquette = null } = {}) {
  const cleTerme = normaliser(terme);
  const cleEtiquette = etiquette === null ? null : normaliser(etiquette);
  const resultats = [];

  for (const recette of recettes) {
    if (
      cleEtiquette !== null &&
      !(recette.tags ?? []).some((tag) => normaliser(tag) === cleEtiquette)
    ) {
      continue;
    }

    if (cleTerme === '') {
      resultats.push({ recette, ingredientsTrouves: [] });
      continue;
    }

    const titreCorrespond = normaliser(recette.title).includes(cleTerme);
    const ingredientsTrouves = (recette.ingredients ?? []).filter((nom) =>
      normaliser(nom).includes(cleTerme),
    );

    if (titreCorrespond || ingredientsTrouves.length > 0) {
      resultats.push({ recette, ingredientsTrouves: titreCorrespond ? [] : ingredientsTrouves });
    }
  }

  return resultats;
}
