/**
 * Les raccourcis proposés dans le panneau d'une case.
 *
 * Le serveur rend les textes libres que le foyer écrit le plus souvent. Les
 * deux qu'on écrit dans toutes les maisons complètent la liste tant qu'elle
 * est courte : c'est ce qui la rend utile dès le premier jour, avant qu'une
 * habitude se soit installée.
 *
 * Logique pure : `node --test` la vérifie seule.
 */

/** Finir ce qui reste, ou sortir : les deux textes libres de toutes les semaines. */
const DE_DEPART = ['Restes', 'Resto'];

/** Cinq pastilles tiennent sur deux lignes à 375 px ; au-delà, elles repousseraient les recettes. */
const MAX = 5;

/**
 * Les fréquents d'abord, dans l'ordre du serveur ; puis ceux de départ qui n'y
 * figurent pas déjà, quelle qu'en soit la casse — « restes » est déjà
 * « Restes ».
 */
export function completerRaccourcis(frequents) {
  const vus = new Set();

  return [...frequents, ...DE_DEPART]
    .filter((texte) => {
      const cle = texte.toLocaleLowerCase('fr');
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    })
    .slice(0, MAX);
}
