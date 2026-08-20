/**
 * Bornes et libellés d'un mois civil.
 *
 * Un budget se lit par mois, et les mois n'ont pas tous la même longueur : les
 * bornes se calculent, elles ne s'ajoutent pas.
 */

const formatMois = new Intl.DateTimeFormat('fr-FR', { month: 'long' });
const formatMoisAnnee = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

/** Premier jour du mois contenant `date`. */
export function debutMois(date) {
  return `${date.slice(0, 7)}-01`;
}

/** Dernier jour du mois commencé le `debut`. */
export function finMois(debut) {
  const [annee, mois] = debut.split('-').map(Number);
  // Le jour 0 du mois suivant est le dernier du mois courant.
  const dernier = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  return `${debut.slice(0, 7)}-${String(dernier).padStart(2, '0')}`;
}

/** Mois précédent ou suivant (`-1` / `+1`). */
export function decalerMois(debut, nombre) {
  const [annee, mois] = debut.split('-').map(Number);
  const cible = new Date(Date.UTC(annee, mois - 1 + nombre, 1));
  return `${cible.getUTCFullYear()}-${String(cible.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * « août », « août 2025 ».
 *
 * L'année n'apparaît que si le mois ne tombe pas dans l'année en cours : en
 * feuilletant les mois passés, on doit voir tout de suite qu'on a changé
 * d'exercice.
 */
export function libelleMois(debut, maintenant = Date.now()) {
  const objet = new Date(`${debut}T12:00:00Z`);
  const memeAnnee = objet.getUTCFullYear() === new Date(maintenant).getFullYear();
  return (memeAnnee ? formatMois : formatMoisAnnee).format(objet);
}
