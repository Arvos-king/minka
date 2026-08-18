/**
 * Opérations sur une liste d'éléments identifiés, et suivi des quantités.
 *
 * Logique pure, sans React : c'est ce que `useCollection` manipule, et ce que
 * les tests vérifient sans avoir à rendre quoi que ce soit. Toutes les
 * fonctions renvoient un nouveau tableau, jamais l'ancien modifié — React ne
 * redessine que si la référence change.
 */

/** Position d'un élément, ou -1. */
export function positionDe(elements, id) {
  return elements.findIndex((element) => element.id === id);
}

/** Remplace l'élément d'identifiant `id`. */
export function remplacerElement(elements, id, remplacant) {
  return elements.map((element) => (element.id === id ? remplacant : element));
}

/** Fusionne `changement` dans l'élément d'identifiant `id`. */
export function fusionnerElement(elements, id, changement) {
  return elements.map((element) =>
    element.id === id ? { ...element, ...changement } : element,
  );
}

/** Retire l'élément d'identifiant `id`. */
export function retirerElement(elements, id) {
  return elements.filter((element) => element.id !== id);
}

/**
 * Relève les éléments à retirer, avec leur position.
 *
 * La position est conservée pour pouvoir les remettre exactement là où ils
 * étaient si le serveur refuse : réapparaître en fin de liste donnerait
 * l'impression que l'article a bougé tout seul.
 */
export function releverElements(elements, predicat) {
  return elements
    .map((element, position) => ({ element, position }))
    .filter(({ element }) => predicat(element));
}

/** Réinsère un élément à sa position d'origine, bornée à la taille actuelle. */
export function reinsererElement(elements, element, position) {
  const suivants = [...elements];
  suivants.splice(Math.min(Math.max(position, 0), suivants.length), 0, element);
  return suivants;
}

/**
 * Réinsère plusieurs éléments relevés ensemble.
 *
 * L'ordre croissant des positions est important : en réinsérant d'abord le plus
 * proche du début, les positions suivantes redeviennent justes au fur et à
 * mesure que la liste retrouve sa longueur.
 */
export function reinsererElements(elements, releves) {
  return [...releves]
    .sort((a, b) => a.position - b.position)
    .reduce(
      (suivants, { element, position }) => reinsererElement(suivants, element, position),
      elements,
    );
}

/**
 * Identifiant provisoire d'un élément pas encore enregistré.
 *
 * Négatif : SQLite n'en attribue jamais de tels, la collision est donc
 * impossible. Un compteur complète l'horodatage, deux ajouts pouvant tomber sur
 * la même milliseconde quand on enchaîne les articles au clavier.
 */
let compteurProvisoire = 0;
export function identifiantProvisoire() {
  compteurProvisoire += 1;
  return -(Date.now() * 1000 + (compteurProvisoire % 1000));
}

/**
 * Suivi des quantités demandées, hors du cycle de rendu de React.
 *
 * Deux problèmes, tous deux visibles dès qu'on tape trois fois de suite sur
 * « + » pour mettre 4 :
 *   — les taps s'enchaînent plus vite que les rendus, et repartir de la
 *     quantité affichée ferait calculer plusieurs fois la même valeur ;
 *   — les réponses du serveur peuvent revenir dans le désordre, et la plus
 *     ancienne écraserait alors la plus récente.
 */
export function creerSuiviQuantites({ min = 1, max = 99 } = {}) {
  const demandees = new Map();

  return {
    /**
     * Prochaine quantité pour cet élément, ou `null` si le pas ne change rien
     * (déjà au plancher ou au plafond).
     */
    prochaine(id, quantiteAffichee, pas) {
      const base = demandees.get(id) ?? quantiteAffichee;
      const voulue = Math.min(max, Math.max(min, base + pas));
      if (voulue === base) return null;

      demandees.set(id, voulue);
      return voulue;
    },

    /**
     * Une demande plus récente est-elle partie depuis ? Si oui, la réponse qui
     * arrive est périmée et l'affichage optimiste doit être conservé : c'est lui
     * qui reflète l'intention.
     */
    depassee(id, quantite) {
      return demandees.get(id) !== quantite;
    },

    oublier(id) {
      demandees.delete(id);
    },

    /** La liste du serveur fait foi : les demandes en cours n'ont plus d'objet. */
    oublierTout() {
      demandees.clear();
    },
  };
}
