/**
 * Manipulation de dates nues (AAAA-MM-JJ).
 *
 * Tous les calculs passent par UTC : comparer des jours en heure locale fait
 * gagner ou perdre une journée aux changements d'heure. La conversion vers le
 * fuseau local n'intervient qu'une fois, pour savoir quel jour on est.
 */

/** Date du jour au format AAAA-MM-JJ, dans le fuseau local. */
export function aujourdhui() {
  const maintenant = new Date();
  // On retire le décalage avant de sérialiser : `toISOString()` bascule en UTC
  // et ferait changer de jour en soirée depuis la France.
  const decalage = maintenant.getTimezoneOffset() * 60_000;
  return new Date(maintenant.getTime() - decalage).toISOString().slice(0, 10);
}

/** Convertit AAAA-MM-JJ en instant UTC, pour comparer des jours entre eux. */
export function versJourUtc(date) {
  const [annee, mois, jour] = date.split('-').map(Number);
  return Date.UTC(annee, mois - 1, jour);
}

/** Décale une date d'un nombre de jours (négatif pour reculer). */
export function decalerJours(date, jours) {
  return new Date(versJourUtc(date) + jours * 86_400_000).toISOString().slice(0, 10);
}

/** Nombre de jours entre deux dates (positif si `b` est postérieure à `a`). */
export function joursEntre(a, b) {
  return Math.round((versJourUtc(b) - versJourUtc(a)) / 86_400_000);
}
