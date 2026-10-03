import { couleurPersonne, nomPersonne } from '../../../lib/people.js';
import { libelleHoraire, libelleJour } from '../agenda.js';
import { T } from '../textes.js';

/**
 * Les événements d'une même journée.
 *
 * L'en-tête de jour est collant : en faisant défiler une longue période, on
 * sait toujours quel jour on regarde.
 */
export function DayGroup({ date, events, people, onSelect }) {
  return (
    <section>
      <h2 className="sticky top-14 z-10 -mx-4 bg-fond/95 px-4 py-2 text-sm font-semibold text-sand-600 backdrop-blur">
        {libelleJour(date)}
      </h2>

      <ul className="mt-1 space-y-2">
        {events.map((event) => {
          const couleur = couleurPersonne(event.ownerId);
          return (
            <li key={`${event.id}-${date}`}>
              <button
                type="button"
                onClick={() => onSelect(event)}
                className="flex w-full items-stretch gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-sand-200 transition active:bg-sand-50"
              >
                {/* Bande de couleur : on identifie la personne concernée avant
                    même d'avoir lu le texte. */}
                <span className={`w-1 shrink-0 rounded-full ${couleur.pastille}`} aria-hidden="true" />

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="shrink-0 text-sm font-medium tabular-nums text-sand-500">
                      {libelleHoraire(event)}
                    </span>
                    {event.joursTotal && (
                      <span className="shrink-0 rounded-full bg-sand-200 px-2 py-0.5 text-xs text-sand-600">
                        {T.jourSur(event.jourIndex, event.joursTotal)}
                      </span>
                    )}
                  </span>

                  <span className="mt-0.5 block break-words font-medium text-sand-900">
                    {event.title}
                  </span>

                  <span className="mt-0.5 block text-sm text-sand-500">
                    {nomPersonne(event.ownerId, people)}
                    {event.note && ` · ${event.note}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
