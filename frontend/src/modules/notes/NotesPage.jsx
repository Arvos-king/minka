import { useState } from 'react';

import { PlusIcon } from '../../components/icons.jsx';
import { T as SOCLE } from '../../textes.js';
import { NoteCard } from './components/NoteCard.jsx';
import { NoteEditor } from './components/NoteEditor.jsx';
import { NotesIcon } from './NotesIcon.jsx';
import { T } from './textes.js';
import { useNotes } from './useNotes.js';

export function NotesPage() {
  const {
    notes,
    status,
    error,
    dismissError,
    epingler,
    supprimer,
    noteEnregistree,
    editionTerminee,
  } = useNotes();

  // `{}` = note vierge, un objet = note existante, `null` = éditeur fermé.
  const [edition, setEdition] = useState(null);

  const epinglees = notes.filter((note) => note.pinned);
  const autres = notes.filter((note) => !note.pinned);

  const proprietes = { onOuvrir: setEdition, onEpingler: epingler };

  return (
    <div className="pb-24">
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3">
          <p className="flex-1 text-sm text-danger">{error}</p>
          <button type="button" onClick={dismissError} className="text-sm font-medium text-danger underline">
            {SOCLE.commun.fermer}
          </button>
        </div>
      )}

      {status === 'loading' && <p className="py-10 text-center text-sm text-sand-500">{SOCLE.chargement}</p>}

      {status === 'ready' && (
        <>
          {notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-300 bg-linear-to-b from-brand-50 to-peche-50 px-6 py-12 text-center">
              <NotesIcon className="mx-auto size-8 text-brand-500" />
              <p className="mt-3 text-sm font-medium text-sand-700">{T.aucuneNote}</p>
              <p className="mt-1 text-sm text-sand-500">{T.aideVide}</p>
            </div>
          ) : (
            <>
              {epinglees.length > 0 && (
                <section className="mb-6">
                  <h2 className="mb-2 text-sm font-medium text-sand-600">{T.epinglees}</h2>
                  <ul className="space-y-2">
                    {epinglees.map((note) => (
                      <NoteCard key={note.id} note={note} {...proprietes} />
                    ))}
                  </ul>
                </section>
              )}

              {autres.length > 0 && (
                <section>
                  {epinglees.length > 0 && (
                    <h2 className="mb-2 text-sm font-medium text-sand-600">{T.lesAutres}</h2>
                  )}
                  <ul className="space-y-2">
                    {autres.map((note) => (
                      <NoteCard key={note.id} note={note} {...proprietes} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setEdition({})}
        aria-label={T.nouvelle}
        className="bottom-onglets fixed right-4 z-20 mb-4 grid size-14 place-items-center rounded-full bg-brand-600 text-sur-marque shadow-lg transition-colors hover:bg-brand-700 active:bg-brand-800"
      >
        <PlusIcon className="size-7" />
      </button>

      {edition && (
        <NoteEditor
          note={edition.id ? edition : null}
          onEnregistree={noteEnregistree}
          onEpingler={(note) => epingler(notes.find((n) => n.id === note.id) ?? note)}
          onSupprimer={(id) => supprimer(notes.find((n) => n.id === id) ?? { id })}
          onClose={() => {
            setEdition(null);
            editionTerminee();
          }}
        />
      )}
    </div>
  );
}
