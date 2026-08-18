/**
 * Bornes et libellés d'une semaine, du lundi au dimanche.
 *
 * Tous les calculs passent par `lib/dates.js`, donc par UTC : compter des jours
 * en heure locale fait gagner ou perdre une journée aux changements d'heure, et
 * une semaine décalée d'un jour ferait planifier le dîner du dimanche un lundi.
 */

import { decalerJours, versJourUtc } from '../../lib/dates.js';

const formatJourMois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const formatJourMoisAnnee = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const formatJourSeul = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' });
const formatJourSemaine = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric' });

/* Midi plutôt que minuit : à minuit, un fuseau en retard afficherait la veille. */
const aMidi = (date) => new Date(`${date}T12:00:00`);

/** Lundi de la semaine contenant `date`. */
export function debutSemaine(date) {
  // getUTCDay : 0 = dimanche. Le décalage ramène lundi à 0 et dimanche à 6.
  const jour = new Date(versJourUtc(date)).getUTCDay();
  return decalerJours(date, -((jour + 6) % 7));
}

/** Dimanche de la semaine commencée le lundi `debut`. */
export function finSemaine(debut) {
  return decalerJours(debut, 6);
}

/** Les sept dates de la semaine, du lundi au dimanche. */
export function joursDeLaSemaine(debut) {
  return Array.from({ length: 7 }, (_, index) => decalerJours(debut, index));
}

/** Semaine précédente ou suivante (`-1` / `+1`). */
export function decalerSemaine(debut, nombre) {
  return decalerJours(debut, nombre * 7);
}

/**
 * « 17 – 23 août », « 31 août – 6 septembre », « 28 décembre – 3 janvier 2027 ».
 *
 * Le mois n'est répété que s'il change, et l'année n'apparaît que si la semaine
 * ne tombe pas dans l'année en cours — une semaine de janvier consultée en
 * décembre doit se distinguer de celle qui vient de passer.
 */
export function libelleSemaine(debut) {
  const fin = finSemaine(debut);
  const objetDebut = aMidi(debut);
  const objetFin = aMidi(fin);

  const memeAnneeQueMaintenant = objetFin.getFullYear() === new Date().getFullYear();
  const formatFin = memeAnneeQueMaintenant ? formatJourMois : formatJourMoisAnnee;

  const memeMois = debut.slice(0, 7) === fin.slice(0, 7);
  const partieDebut = memeMois ? formatJourSeul.format(objetDebut) : formatJourMois.format(objetDebut);

  return `${partieDebut} – ${formatFin.format(objetFin)}`;
}

/** « lundi 17 », pour l'en-tête d'une journée. */
export function libelleJour(date) {
  return formatJourSemaine.format(aMidi(date));
}

/** Les deux moments d'une journée, dans l'ordre où on les vit. */
export const CRENEAUX = [
  { valeur: 'midi', libelle: 'Midi' },
  { valeur: 'soir', libelle: 'Soir' },
];
