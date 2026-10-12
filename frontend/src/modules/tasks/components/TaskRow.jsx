import { CheckIcon } from '../../../components/icons.jsx';
import { couleurPersonne, nomPersonne } from '../../../lib/people.js';
import { T as SOCLE } from '../../../textes.js';
import { STYLES_ECHEANCE, libelleRythme, statutEcheance } from '../echeance.js';
import { T } from '../textes.js';

/**
 * Une tâche.
 *
 * La case et l'intitulé forment une seule cible, large, pour cocher d'un
 * pouce ; le reste de la ligne ouvre le formulaire de modification.
 */
export function TaskRow({ task, people, onToggle, onEdit }) {
  const echeance = statutEcheance(task.dueOn);
  const couleur = couleurPersonne(task.assigneeId);
  const rythme = libelleRythme(task.recurrence);

  return (
    <li
      className={[
        'flex items-center rounded-2xl bg-surface ring-1 transition',
        !task.done && echeance.niveau === 'retard' ? 'ring-red-200' : 'ring-sand-200',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-pressed={task.done}
        aria-label={task.done ? T.decocher(task.title) : T.cocher(task.title)}
        className="grid min-h-14 w-12 shrink-0 place-items-center rounded-l-2xl active:bg-sand-50"
      >
        <span
          className={[
            'grid size-6 place-items-center rounded-full border-2 transition',
            task.done ? 'border-brand-600 bg-brand-600 text-sur-marque' : 'border-sand-300',
          ].join(' ')}
          aria-hidden="true"
        >
          {task.done && <CheckIcon className="size-4" strokeWidth={3} />}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onEdit(task)}
        className="min-h-14 flex-1 rounded-r-2xl py-2 pr-3 text-left active:bg-sand-50"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={[
              'min-w-0 break-words',
              task.done ? 'text-sand-400 line-through' : 'text-sand-900',
            ].join(' ')}
          >
            {task.title}
          </span>

          {!task.done && echeance.libelle && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STYLES_ECHEANCE[echeance.niveau]}`}
            >
              {echeance.libelle}
            </span>
          )}
        </span>

        <span className="mt-0.5 flex items-center gap-1.5 text-sm text-sand-500">
          <span className={`size-2 rounded-full ${couleur.pastille}`} aria-hidden="true" />
          {nomPersonne(task.assigneeId, people, SOCLE.membres.toutLeMonde)}
          {rythme && task.recurrence && <span>· {rythme.toLowerCase()}</span>}
        </span>
      </button>
    </li>
  );
}
