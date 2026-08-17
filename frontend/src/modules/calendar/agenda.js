/**
 * Mise en forme de l'agenda : libellés de jour et regroupement des événements.
 */

import { aujourdhui, decalerJours, joursEntre, versJourUtc } from '../../lib/dates.js';

const formatJourComplet = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const formatJourAvecAnnee = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** « Aujourd'hui », « Demain », sinon « lundi 24 août ». */
export function libelleJour(date) {
  const ecart = joursEntre(aujourdhui(), date);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return 'Demain';

  // Midi plutôt que minuit : à minuit, un fuseau en retard afficherait la
  // veille.
  const objet = new Date(`${date}T12:00:00`);
  const format = ecart > 300 || ecart < -300 ? formatJourAvecAnnee : formatJourComplet;
  return format.format(objet);
}

/** Dernier jour couvert par un événement. */
function dernierJour(event) {
  return event.endsOn ?? event.startsOn;
}

/**
 * Regroupe les événements par jour, entre `depuis` et `jusqua`.
 *
 * Un événement s'étalant sur plusieurs jours apparaît dans chacun d'eux : un
 * séjour n'a d'intérêt dans un agenda que s'il est visible le mardi comme le
 * jeudi. Chaque occurrence porte alors son rang (« jour 2 sur 4 »), pour qu'on
 * comprenne d'un coup d'œil qu'il s'agit du même événement qui se poursuit.
 *
 * @returns {Array<{ date: string, events: Array<object> }>} jours non vides, triés.
 */
export function grouperParJour(events, { depuis = aujourdhui(), jusqua } = {}) {
  const parDate = new Map();

  for (const event of events) {
    const fin = dernierJour(event);
    const total = joursEntre(event.startsOn, fin) + 1;

    for (let index = 0; index < total; index += 1) {
      const date = decalerJours(event.startsOn, index);

      // On n'affiche pas les jours déjà passés, ni ceux au-delà de la fenêtre.
      if (date < depuis) continue;
      if (jusqua && date > jusqua) break;

      if (!parDate.has(date)) parDate.set(date, []);
      parDate.get(date).push(
        total > 1 ? { ...event, jourIndex: index + 1, joursTotal: total } : event,
      );
    }
  }

  return [...parDate.entries()]
    .sort(([a], [b]) => versJourUtc(a) - versJourUtc(b))
    .map(([date, evenements]) => ({ date, events: evenements }));
}

/** « 14:30 », « 14:30 → 15:15 », ou « Journée ». */
export function libelleHoraire(event) {
  if (!event.startsAt) return 'Journée';
  if (!event.endsAt) return event.startsAt;
  return `${event.startsAt} → ${event.endsAt}`;
}
