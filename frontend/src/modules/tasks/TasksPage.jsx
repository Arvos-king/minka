import { useEffect, useState } from 'react';

import { ChevronDownIcon, PlusIcon } from '../../components/icons.jsx';
import { PeopleSheet } from '../../components/PeopleSheet.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { couleurPersonne, usePeople } from '../../lib/people.js';
import { TaskRow } from './components/TaskRow.jsx';
import { TaskSheet } from './components/TaskSheet.jsx';
import { TasksIcon } from './TasksIcon.jsx';
import { useTasks } from './useTasks.js';

/**
 * Date en toutes lettres, avec l'année dès qu'elle diffère de l'année en cours :
 * une tâche annuelle replanifiée revient l'an prochain, et « mardi 17 août »
 * seul se lirait comme aujourd'hui.
 */
function libelleDateLongue(date) {
  const objet = new Date(`${date}T12:00:00`);
  return objet.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(objet.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
  });
}

export function TasksPage() {
  const {
    tasks,
    counts,
    status,
    error,
    dismissError,
    replanification,
    dismissReplanification,
    refresh,
    toggleTask,
    saveTask,
    removeTask,
    purgeCompleted,
  } = useTasks();
  const { people, addPerson, renamePerson, removePerson } = usePeople();

  const [saisie, setSaisie] = useState(null);
  const [gestionMembres, setGestionMembres] = useState(false);
  const [filtre, setFiltre] = useState(null); // null = tout le monde
  const [afficherFaites, setAfficherFaites] = useState(false);
  const [confirmationPurge, setConfirmationPurge] = useState(false);

  // Le message de replanification s'efface de lui-même : c'est une confirmation
  // discrète, pas une alerte à traiter.
  useEffect(() => {
    if (!replanification) return undefined;
    const minuteur = setTimeout(dismissReplanification, 4000);
    return () => clearTimeout(minuteur);
  }, [replanification, dismissReplanification]);

  const visibles = filtre === null ? tasks : tasks.filter((t) => t.assigneeId === filtre);
  const aFaire = visibles.filter((t) => !t.done);
  const faites = visibles.filter((t) => t.done);

  return (
    <div className="pb-24">
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3">
          <p className="flex-1 text-sm text-danger">{error}</p>
          <button type="button" onClick={dismissError} className="text-sm font-medium text-danger underline">
            Fermer
          </button>
        </div>
      )}

      {replanification && (
        <p role="status" className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-accent">
          «&nbsp;{replanification.titre}&nbsp;» revient le {libelleDateLongue(replanification.dueOn)}.
        </p>
      )}

      {/* Filtre par personne, qui sert aussi de légende et d'accès à la
          gestion des membres — comme dans le calendrier. */}
      {people.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFiltre(null)}
            aria-pressed={filtre === null}
            className={[
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              filtre === null ? 'bg-sand-900 text-fond' : 'bg-surface text-sand-600 ring-1 ring-sand-300',
            ].join(' ')}
          >
            Tout
          </button>

          {people.map((personne) => {
            const actif = filtre === personne.id;
            const couleur = couleurPersonne(personne.id);
            return (
              <button
                key={personne.id}
                type="button"
                onClick={() => setFiltre(actif ? null : personne.id)}
                aria-pressed={actif}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  actif ? `${couleur.fond} ${couleur.texte} ring-1 ${couleur.bordure}` : 'bg-surface text-sand-600 ring-1 ring-sand-300',
                ].join(' ')}
              >
                <span className={`size-2 rounded-full ${couleur.pastille}`} aria-hidden="true" />
                {personne.displayName}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setGestionMembres(true)}
            className="ml-auto text-sm font-medium text-accent"
          >
            Gérer
          </button>
        </div>
      )}

      {status === 'loading' && <p className="py-10 text-center text-sm text-sand-500">Chargement…</p>}

      {status === 'ready' && (
        <>
          <p className="mb-3 text-sm font-medium text-sand-600">
            {aFaire.length === 0
              ? 'Rien à faire'
              : `${aFaire.length} tâche${aFaire.length > 1 ? 's' : ''} à faire`}
          </p>

          {aFaire.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sand-300 px-6 py-12 text-center">
              <TasksIcon className="mx-auto size-8 text-sand-400" />
              <p className="mt-3 text-sm font-medium text-sand-700">
                {counts.pending > 0 ? 'Rien pour cette personne' : 'Tout est fait'}
              </p>
              <p className="mt-1 text-sm text-sand-500">
                Touche le bouton en bas à droite pour ajouter une tâche.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {aFaire.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  people={people}
                  onToggle={toggleTask}
                  onEdit={setSaisie}
                />
              ))}
            </ul>
          )}

          {faites.length > 0 && (
            <section className="mt-8">
              <button
                type="button"
                onClick={() => setAfficherFaites((v) => !v)}
                className="flex min-h-11 w-full items-center gap-2 text-sm font-medium text-sand-600"
                aria-expanded={afficherFaites}
              >
                <ChevronDownIcon
                  className={`size-4 transition-transform ${afficherFaites ? '' : '-rotate-90'}`}
                />
                Faites ({faites.length})
              </button>

              {afficherFaites && (
                <>
                  <ul className="mt-2 space-y-2">
                    {faites.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        people={people}
                        onToggle={toggleTask}
                        onEdit={setSaisie}
                      />
                    ))}
                  </ul>

                  <div className="mt-4">
                    {confirmationPurge ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            purgeCompleted();
                            setConfirmationPurge(false);
                            setAfficherFaites(false);
                          }}
                        >
                          {faites.length > 1
                            ? `Supprimer les ${faites.length} tâches`
                            : 'Supprimer la tâche'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmationPurge(false)}>
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setConfirmationPurge(true)}>
                        Vider les tâches faites
                      </Button>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setSaisie({})}
        aria-label="Ajouter une tâche"
        className="bottom-onglets fixed right-4 z-20 mb-4 grid size-14 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition-colors hover:bg-brand-700 active:bg-brand-800"
      >
        <PlusIcon className="size-7" />
      </button>

      {saisie && (
        <TaskSheet
          task={saisie.id ? saisie : null}
          people={people}
          onSave={saveTask}
          onDelete={removeTask}
          onClose={() => setSaisie(null)}
        />
      )}

      {gestionMembres && (
        <PeopleSheet
          people={people}
          onAdd={addPerson}
          onRename={renamePerson}
          onRemove={async (id) => {
            await removePerson(id);
            if (filtre === id) setFiltre(null);
            await refresh({ silent: true });
          }}
          onClose={() => setGestionMembres(false)}
        />
      )}
    </div>
  );
}
