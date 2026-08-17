import { useState } from 'react';

import { PlusIcon } from '../../components/icons.jsx';
import { grouperParJour } from './agenda.js';
import { CalendarIcon } from './CalendarIcon.jsx';
import { DayGroup } from './components/DayGroup.jsx';
import { EventSheet } from './components/EventSheet.jsx';
import { PeopleSheet } from './components/PeopleSheet.jsx';
import { couleurPersonne } from './people.js';
import { useCalendar } from './useCalendar.js';

export function CalendarPage() {
  const {
    events,
    people,
    status,
    error,
    dismissError,
    saveEvent,
    removeEvent,
    addPerson,
    renamePerson,
    removePerson,
  } = useCalendar();

  // null = panneau fermé ; un objet = panneau ouvert (vide pour une création).
  const [saisie, setSaisie] = useState(null);
  const [gestionParticipants, setGestionParticipants] = useState(false);

  const jours = grouperParJour(events);

  return (
    <div className="pb-24">
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3">
          <p className="flex-1 text-sm text-red-800">{error}</p>
          <button type="button" onClick={dismissError} className="text-sm font-medium text-red-700 underline">
            Fermer
          </button>
        </div>
      )}

      {/* Légende des couleurs, qui sert aussi d'accès à la gestion : deux
          usages pour une seule ligne, précieuse sur un écran de téléphone. */}
      {people.length > 0 && (
        <button
          type="button"
          onClick={() => setGestionParticipants(true)}
          className="mb-4 flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-white px-3 py-2 text-left ring-1 ring-sand-200 active:bg-sand-50"
        >
          {people.map((personne) => (
            <span key={personne.id} className="inline-flex items-center gap-1.5 text-sm text-sand-600">
              <span
                className={`size-2.5 rounded-full ${couleurPersonne(personne.id).pastille}`}
                aria-hidden="true"
              />
              {personne.displayName}
            </span>
          ))}
          <span className="ml-auto text-sm font-medium text-brand-700">Gérer</span>
        </button>
      )}

      {status === 'loading' && <p className="py-10 text-center text-sm text-sand-500">Chargement…</p>}

      {status === 'ready' &&
        (jours.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-300 px-6 py-12 text-center">
            <CalendarIcon className="mx-auto size-8 text-sand-400" />
            <p className="mt-3 text-sm font-medium text-sand-700">Rien de prévu</p>
            <p className="mt-1 text-sm text-sand-500">
              Touche le bouton en bas à droite pour ajouter un événement.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {jours.map(({ date, events: duJour }) => (
              <DayGroup
                key={date}
                date={date}
                events={duJour}
                people={people}
                onSelect={(event) => setSaisie(event)}
              />
            ))}
          </div>
        ))}

      {/* Bouton d'ajout flottant : le formulaire ayant plusieurs champs, il
          s'ouvre dans un panneau plutôt que de tenir en bas de l'écran comme
          dans les autres modules. */}
      <button
        type="button"
        onClick={() => setSaisie({})}
        aria-label="Ajouter un événement"
        className="mb-safe fixed right-4 bottom-4 z-20 grid size-14 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition-colors hover:bg-brand-700 active:bg-brand-800"
      >
        <PlusIcon className="size-7" />
      </button>

      {saisie && (
        <EventSheet
          event={saisie.id ? saisie : null}
          people={people}
          onSave={saveEvent}
          onDelete={removeEvent}
          onClose={() => setSaisie(null)}
        />
      )}

      {gestionParticipants && (
        <PeopleSheet
          people={people}
          onAdd={addPerson}
          onRename={renamePerson}
          onRemove={removePerson}
          onClose={() => setGestionParticipants(false)}
        />
      )}
    </div>
  );
}
