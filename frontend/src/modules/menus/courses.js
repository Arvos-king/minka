/**
 * Traduction d'un ingrédient en article de liste de courses.
 *
 * Les deux modules ne partagent aucun modèle : la liste de courses connaît un
 * nom et une quantité entière, les recettes une quantité en texte libre
 * (« 200 g », « un filet »). La conversion se fait donc ici, dans le seul sens
 * qui a du sens en magasin — la quantité rejoint le nom, où elle reste lisible.
 */

/** Limite du champ `name` de la liste de courses. */
const LONGUEUR_MAX = 120;

/**
 * « Courgettes (200 g) », « Courgettes (200 g + 2) », « Courgettes ».
 *
 * Les quantités sont juxtaposées et non additionnées : « 2 gousses » et « un
 * peu » n'ont pas de somme, et c'est bien le détail qu'on veut lire au rayon.
 */
export function libelleCourse({ name, quantities = [] }) {
  const utiles = quantities.filter((quantite) => quantite && quantite.trim() !== '');
  if (utiles.length === 0) return tronquer(name, LONGUEUR_MAX);

  const detail = ` (${utiles.join(' + ')})`;
  // Le nom passe avant le détail : mieux vaut « Courgettes » seul qu'un nom
  // amputé suivi d'une quantité complète.
  if (name.length + detail.length <= LONGUEUR_MAX) return `${name}${detail}`;

  const place = LONGUEUR_MAX - name.length - 2; // les parenthèses
  if (place < 4) return tronquer(name, LONGUEUR_MAX);

  return `${name} (${tronquer(utiles.join(' + '), place - 1)})`;
}

function tronquer(texte, maximum) {
  return texte.length <= maximum ? texte : `${texte.slice(0, maximum - 1)}…`;
}
