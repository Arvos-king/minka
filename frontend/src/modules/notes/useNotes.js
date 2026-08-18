import { useCallback } from 'react';

import { remplacerElement } from '../../lib/collection.js';
import { useCollection } from '../../lib/useCollection.js';
import { notesApi } from './api.js';

/**
 * État des notes partagées.
 *
 * L'épinglage et la suppression passent par `useCollection`, comme partout
 * ailleurs. **La saisie du texte, elle, échappe à ce cycle** : l'éditeur
 * enregistre tout seul, par petites touches, et gère son propre conflit de
 * version. Il prévient ici quand une note a changé, pour que la liste derrière
 * lui reste juste.
 */
export function useNotes() {
  const charger = useCallback(async () => {
    const data = await notesApi.list();
    return { elements: data.notes };
  }, []);

  const {
    elements: notes,
    status,
    error,
    dismissError,
    refresh,
    modifier,
    retirer,
    setElements,
  } = useCollection(charger);

  const epingler = useCallback(
    (note) =>
      modifier(note, { pinned: !note.pinned }, async () => {
        // Sans `expectedVersion` : épingler ne touche pas au texte, il n'y a
        // donc rien à écraser même si l'autre écrit au même moment.
        const data = await notesApi.update(note.id, { pinned: !note.pinned });
        return { element: data.note };
      }),
    [modifier],
  );

  const supprimer = useCallback(
    (note) => retirer(note, () => notesApi.remove(note.id)),
    [retirer],
  );

  /** L'éditeur vient d'enregistrer : la liste doit le refléter sans recharger. */
  const noteEnregistree = useCallback(
    (note) => {
      setElements((precedents) =>
        precedents.some((n) => n.id === note.id)
          ? remplacerElement(precedents, note.id, note)
          : [note, ...precedents],
      );
    },
    [setElements],
  );

  /**
   * L'éditeur se referme : on recharge en silence.
   *
   * Le classement — épinglées d'abord, puis les plus récemment modifiées —
   * appartient au serveur, et une note qu'on vient d'éditer a changé de rang.
   */
  const editionTerminee = useCallback(() => refresh({ silent: true }), [refresh]);

  return {
    notes,
    status,
    error,
    dismissError,
    epingler,
    supprimer,
    noteEnregistree,
    editionTerminee,
  };
}
