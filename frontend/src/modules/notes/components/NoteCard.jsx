import { extrait, libelleModification, titreAffiche } from '../apercu.js';
import { PinIcon } from '../NotesIcon.jsx';

/**
 * Une note dans la liste.
 *
 * Toucher la carte ouvre l'éditeur ; la punaise reste à part, comme la
 * corbeille d'un article de courses — viser « épingler » ne doit pas ouvrir la
 * note par mégarde.
 */
export function NoteCard({ note, onOuvrir, onEpingler }) {
  const titre = titreAffiche(note);
  const apercu = extrait(note);
  const quand = libelleModification(note.updatedAt);

  return (
    <li
      className={[
        'flex items-start rounded-2xl bg-surface ring-1 transition',
        note.pinned ? 'ring-brand-300' : 'ring-sand-200',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onOuvrir(note)}
        className="min-h-14 flex-1 rounded-l-2xl px-4 py-3 text-left active:bg-sand-50"
      >
        <span className="block font-medium text-sand-900">
          {titre === '' ? <span className="text-sand-400">Note sans titre</span> : titre}
        </span>

        {apercu !== '' && (
          <span className="mt-0.5 block truncate text-sm text-sand-500">{apercu}</span>
        )}

        <span className="mt-1 block text-xs text-sand-400">
          {quand}
          {note.updatedByName && ` · ${note.updatedByName}`}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onEpingler(note)}
        aria-pressed={note.pinned}
        aria-label={note.pinned ? `Détacher ${titre || 'cette note'}` : `Épingler ${titre || 'cette note'}`}
        className={[
          'grid min-h-14 w-14 shrink-0 place-items-center rounded-r-2xl active:bg-sand-100',
          note.pinned ? 'text-accent' : 'text-sand-400',
        ].join(' ')}
      >
        <PinIcon className="size-5" rempli={note.pinned} />
      </button>
    </li>
  );
}
