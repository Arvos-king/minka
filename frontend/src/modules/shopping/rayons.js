/**
 * Répartition de la liste de courses par rayon, côté affichage.
 *
 * Le classement lui-même se fait sur le serveur, à l'ajout : chaque article
 * arrive avec sa clé de rayon. Il ne reste ici qu'à mettre les sections dans
 * l'ordre, celui que l'API livre — l'ordre du parcours en magasin.
 *
 * Fonction pure, sans React ni DOM, pour se vérifier avec `node --test` comme
 * `entretien/echeances.js`.
 */

/**
 * Groupe les articles à acheter par rayon, rayons vides exclus.
 *
 * L'ordre à l'intérieur d'une section est celui d'entrée, donc l'ordre d'ajout,
 * puisque c'est ainsi que le serveur trie les articles à acheter.
 *
 * Deux garanties, qui comptent plus que le reste :
 *
 *   — **aucun article n'est perdu.** Un rayon que le client ne connaît pas —
 *     parce que la page tourne depuis avant un déploiement — tombe dans la
 *     dernière section plutôt que de disparaître de l'écran ;
 *   — **rien n'est mémorisé.** Le résultat se recalcule à chaque rendu et n'est
 *     jamais réinjecté dans la liste, que `useCollection` manipule à plat, par
 *     position : un tableau de groupes y casserait les restaurations.
 *
 * @param {Array} articles articles à acheter, déjà filtrés
 * @param {Array<{cle: string, libelle: string}>} rayons
 * @returns {Array<{cle: string|null, libelle: string|null, articles: Array}>}
 */
export function grouperParRayon(articles, rayons) {
  // Avant la première réponse de l'API : une seule section sans titre, plutôt
  // qu'une liste vide qui escamoterait les articles déjà affichés.
  if (!rayons || rayons.length === 0) {
    return articles.length === 0 ? [] : [{ cle: null, libelle: null, articles }];
  }

  const parCle = new Map(rayons.map((rayon) => [rayon.cle, []]));
  const derniere = rayons.at(-1).cle;

  for (const article of articles) {
    (parCle.get(article.rayon) ?? parCle.get(derniere)).push(article);
  }

  return rayons
    .map((rayon) => ({ ...rayon, articles: parCle.get(rayon.cle) }))
    .filter((section) => section.articles.length > 0);
}
