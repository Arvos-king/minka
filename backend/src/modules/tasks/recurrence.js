/**
 * Calcul des occurrences d'une tâche récurrente.
 *
 * Séparé de `service.js` parce que ce calcul est purement arithmétique : il ne
 * touche jamais à la base. Or importer `service.js` ouvre une connexion SQLite
 * — donc crée un fichier de base — et il serait absurde de payer cela pour
 * vérifier une addition de dates. C'est ce qui rend ces fonctions testables
 * telles quelles, avec le seul `node --test`.
 */

function versJourUtc(date) {
  const [annee, mois, jour] = date.split('-').map(Number);
  return Date.UTC(annee, mois - 1, jour);
}

function enDate(instant) {
  return new Date(instant).toISOString().slice(0, 10);
}

/**
 * Ajoute des mois en restant dans le mois d'arrivée.
 *
 * Le 31 janvier plus un mois donne le 28 (ou 29) février, et non le 3 mars :
 * laisser JavaScript déborder ferait dériver une tâche mensuelle de quelques
 * jours à chaque passage.
 */
export function ajouterMois(date, nombre) {
  const [annee, mois, jour] = date.split('-').map(Number);
  const cible = new Date(Date.UTC(annee, mois - 1 + nombre, 1));
  const dernierJour = new Date(
    Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0),
  ).getUTCDate();
  cible.setUTCDate(Math.min(jour, dernierJour));
  return cible.toISOString().slice(0, 10);
}

/** Date obtenue en avançant de `n` périodes depuis `date`. */
export function avancerDe(date, recurrence, n) {
  switch (recurrence) {
    case 'daily':
      return enDate(versJourUtc(date) + n * 86_400_000);
    case 'weekly':
      return enDate(versJourUtc(date) + n * 7 * 86_400_000);
    case 'monthly':
      return ajouterMois(date, n);
    case 'yearly':
      return ajouterMois(date, n * 12);
    default:
      return null;
  }
}

/**
 * Nombre maximal de périodes explorées avant d'abandonner la recherche.
 *
 * Garde-fou contre une boucle sans fin sur une tâche oubliée depuis longtemps.
 * Voir `prochaineEcheance` pour ce qui se passe quand il est atteint.
 */
export const PERIODES_MAX = 500;

/**
 * Échéance suivante, toujours située dans le futur.
 *
 * Une tâche hebdomadaire cochée avec trois semaines de retard doit repartir sur
 * la prochaine occurrence à venir, pas sur une date déjà passée qu'on
 * cocherait aussitôt : on cherche donc le premier multiple de la période qui
 * dépasse aujourd'hui.
 *
 * Le calcul repart à chaque fois de l'échéance d'origine plutôt que de la
 * précédente valeur calculée. C'est ce qui évite la dérive d'une tâche
 * mensuelle tombant le 31 : en enchaînant les additions, elle serait ramenée au
 * 28 en passant par février, puis y resterait. En comptant depuis l'origine,
 * elle retrouve le 31 dès que le mois le permet.
 */
export function prochaineEcheance(
  dueOn,
  recurrence,
  aujourdhui = new Date().toISOString().slice(0, 10),
) {
  if (!recurrence) return null;

  for (let n = 1; n <= PERIODES_MAX; n += 1) {
    const date = avancerDe(dueOn, recurrence, n);
    if (date > aujourdhui) return date;
  }
  return avancerDe(dueOn, recurrence, PERIODES_MAX);
}
