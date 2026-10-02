/**
 * Défilement automatique pendant qu'on glisse un repas.
 *
 * La semaine est plus haute que l'écran d'un téléphone : pour poser le gratin
 * du lundi sur le dimanche, il faut que la page défile sous le doigt, qui ne
 * peut plus la faire défiler lui-même — il tient le repas.
 *
 * Logique pure, sans DOM : `useGlisser` lui passe la position du pointeur et
 * la hauteur de l'écran, et applique la vitesse rendue.
 */

/** Part de la hauteur de l'écran, en haut comme en bas, où la page défile. */
const PART = 0.18;
/** Plancher de la bande, pour les écrans bas — un téléphone à l'horizontale. */
const BANDE_MIN = 80;
/** Vitesse au bord de l'écran, en pixels par image : la semaine en une seconde et demie environ. */
const VITESSE_MAX = 14;

/**
 * Vitesse de défilement pour un pointeur à la hauteur `y` d'un écran haut de
 * `hauteur` : nulle au milieu, négative dans la bande du haut, positive dans
 * celle du bas, et d'autant plus forte qu'on s'y enfonce.
 *
 * Les bandes se mesurent depuis les bords de l'écran, pas depuis l'en-tête ni
 * la barre d'onglets : le socle garde leur hauteur pour lui, et le doigt peut
 * fort bien glisser par-dessus — c'est même le geste naturel pour « monter »
 * ou « descendre ». Une bande d'un cinquième d'écran déborde sur le contenu
 * même derrière une encoche et une barre de gestes.
 */
export function vitesseDeDefilement(y, hauteur) {
  const bande = Math.max(BANDE_MIN, hauteur * PART);
  const enfoncement = y < bande ? (y - bande) / bande : y > hauteur - bande ? (y - (hauteur - bande)) / bande : 0;
  if (enfoncement === 0) return 0;

  const vitesse = Math.ceil(VITESSE_MAX * Math.min(1, Math.abs(enfoncement)));
  return Math.sign(enfoncement) * vitesse;
}
