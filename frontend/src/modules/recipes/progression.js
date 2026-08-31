/**
 * Où l'on en est dans une recette qu'on est en train de cuisiner.
 *
 * **Dans le navigateur, et nulle part ailleurs.** Une séance de cuisine
 * appartient à qui tient le téléphone : la mettre en base demanderait une
 * notion de session, une règle pour la clore, et ferait apparaître chez l'autre
 * des cases cochées qui ne le concernent pas. Le prix à payer est connu — la
 * progression ne suit pas d'un appareil à l'autre —, et c'est le bon prix.
 *
 * Elle survit en revanche à la fermeture de l'application : on repose son
 * téléphone entre deux étapes, on répond à un message, on revient.
 */

const cle = (recipeId) => `minka:cuisine:${recipeId}`;

/**
 * Au-delà, la progression n'est plus la nôtre.
 *
 * Douze heures : assez pour couvrir une préparation entamée le matin et reprise
 * le soir, trop peu pour qu'une recette rouverte la semaine suivante s'ouvre à
 * moitié cochée — ce qui ferait sauter des étapes sans qu'on s'en aperçoive.
 */
const PEREMPTION = 12 * 60 * 60 * 1000;

/**
 * Ce qu'il reste d'une progression enregistrée, une fois périmée ou devenue
 * caduque.
 *
 * Séparée de la lecture, et sans `localStorage` : c'est ici que sont les
 * décisions, elles s'éprouvent donc sans navigateur.
 *
 * @param {{etapes: number[], le: number}|null} enregistree
 * @param {Array<{id: number}>} steps  les étapes actuelles de la recette
 * @returns {number[]} les identifiants à recocher
 */
export function etapesRetenues(enregistree, steps, maintenant) {
  if (!enregistree || !Array.isArray(enregistree.etapes)) return [];

  // Modifier une recette réécrit ses étapes, donc leurs identifiants : ceux
  // d'avant ne désignent plus rien, et la marche à suivre ayant changé, repartir
  // de zéro est le comportement voulu.
  const connues = new Set(steps.map((step) => step.id));
  const retenues = enregistree.etapes.filter((id) => connues.has(id));
  if (retenues.length === 0) return [];

  const age = maintenant - enregistree.le;
  // `age` négatif : l'horloge a reculé depuis l'enregistrement. On garde — la
  // progression est plus récente que ce que la machine croit, pas plus vieille.
  return Number.isFinite(enregistree.le) && age <= PEREMPTION ? retenues : [];
}

/** @returns {number[]} les étapes à recocher à l'ouverture. */
export function lireProgression(recipeId, steps, maintenant = Date.now()) {
  try {
    const brut = localStorage.getItem(cle(recipeId));
    return etapesRetenues(brut === null ? null : JSON.parse(brut), steps, maintenant);
  } catch {
    // Navigation privée, quota plein, contenu abîmé : on cuisine sans filet.
    return [];
  }
}

export function ecrireProgression(recipeId, etapes, maintenant = Date.now()) {
  try {
    localStorage.setItem(cle(recipeId), JSON.stringify({ etapes, le: maintenant }));
  } catch {
    // Idem : perdre la progression est un désagrément, pas une panne.
  }
}

export function effacerProgression(recipeId) {
  try {
    localStorage.removeItem(cle(recipeId));
  } catch {
    // Idem.
  }
}
