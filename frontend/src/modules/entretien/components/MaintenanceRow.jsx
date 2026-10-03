import { CheckIcon } from '../../../components/icons.jsx';
import { couleurPersonne, nomPersonne } from '../../../lib/people.js';
import { libelleRythme, statutEcheance, STYLES_ECHEANCE } from '../echeances.js';
import { T } from '../textes.js';

/**
 * Une intervention du planning.
 *
 * Le bouton « fait » est séparé du reste, comme la corbeille d'un article de
 * courses : déclarer une chose faite est le geste courant, l'ouvrir pour la
 * régler l'exception.
 */
export function MaintenanceRow({ tache, people, onFaite, onOuvrir }) {
  const statut = statutEcheance(tache.dueOn);

  return (
    <li className={`flex items-center rounded-2xl bg-surface ring-1 ring-sand-200 ${tache.pending ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={() => onOuvrir(tache)}
        className="min-h-14 flex-1 rounded-l-2xl px-4 py-2 text-left active:bg-sand-50"
      >
        <span className="block break-words text-sand-900">{tache.label}</span>

        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ${STYLES_ECHEANCE[statut.niveau]}`}>
            {statut.libelle}
          </span>
          {/* Les séparateurs sont écrits, pas seulement dessinés : `gap` espace
              à l'œil, mais un lecteur d'écran enchaînerait « DemainBuanderie ». */}
          {tache.zoneLabel && <span className="text-sand-500">{' · '}{tache.zoneLabel}</span>}
          <span className="text-sand-400">{' · '}{libelleRythme(tache.recurrence)}</span>
          {tache.assigneeId != null && (
            <span className="inline-flex items-center gap-1 text-sand-500">
              {' · '}
              <span
                className={`size-2 rounded-full ${couleurPersonne(tache.assigneeId).pastille}`}
                aria-hidden="true"
              />
              {nomPersonne(tache.assigneeId, people)}
            </span>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onFaite(tache)}
        aria-label={T.marquerFait(tache.label)}
        className="grid min-h-14 w-14 shrink-0 place-items-center rounded-r-2xl text-sand-400 active:bg-brand-50 active:text-accent"
      >
        <span className="grid size-7 place-items-center rounded-full border-2 border-current">
          <CheckIcon className="size-4" strokeWidth={3} />
        </span>
      </button>
    </li>
  );
}
