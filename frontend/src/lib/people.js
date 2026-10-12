import { useCallback, useEffect, useState } from 'react';

import { T } from '../textes.js';
import { api } from './apiClient.js';

/**
 * Membres du foyer.
 *
 * Fait partie du socle : le calendrier attribue ses événements, les tâches
 * leurs assignations, et tout module futur pourra en faire autant sans
 * dépendre des autres.
 */

const peopleApi = {
  list: () => api.get('/people'),
  create: (displayName) => api.post('/people', { displayName }),
  rename: (id, displayName) => api.patch(`/people/${id}`, { displayName }),
  remove: (id) => api.delete(`/people/${id}`),
};

// --- Couleurs ----------------------------------------------------------------

/**
 * La teinte est déduite de l'identifiant plutôt que stockée : cela évite une
 * colonne de plus, et reste stable dans le temps puisqu'un identifiant ne
 * change pas.
 */
const PALETTE = [
  { pastille: 'bg-sky-500', fond: 'bg-sky-50', texte: 'text-sky-800', bordure: 'ring-sky-200' },
  { pastille: 'bg-violet-500', fond: 'bg-violet-50', texte: 'text-violet-800', bordure: 'ring-violet-200' },
  { pastille: 'bg-peche-500', fond: 'bg-peche-50', texte: 'text-peche-800', bordure: 'ring-peche-200' },
  { pastille: 'bg-teal-500', fond: 'bg-teal-50', texte: 'text-teal-800', bordure: 'ring-teal-200' },
  { pastille: 'bg-amber-500', fond: 'bg-amber-50', texte: 'text-amber-800', bordure: 'ring-amber-200' },
];

/** Objet ne concernant personne en particulier. */
const COMMUN = {
  pastille: 'bg-brand-600',
  fond: 'bg-brand-100',
  texte: 'text-accent',
  bordure: 'ring-brand-200',
};

export function couleurPersonne(personId) {
  if (personId === null || personId === undefined) return COMMUN;
  // Les identifiants commencent à 1 : on les ramène à un index à partir de 0.
  return PALETTE[(personId - 1) % PALETTE.length];
}

export function nomPersonne(personId, people, defaut = T.membres.toutLeMonde) {
  if (personId === null || personId === undefined) return defaut;
  return people.find((personne) => personne.id === personId)?.displayName ?? T.membres.inconnu;
}

// --- État --------------------------------------------------------------------

export function usePeople() {
  const [people, setPeople] = useState([]);

  const refreshPeople = useCallback(
    () =>
      peopleApi
        .list()
        .then((data) => setPeople(data.people))
        .catch(() => setPeople([])),
    [],
  );

  useEffect(() => {
    refreshPeople();
  }, [refreshPeople]);

  const addPerson = useCallback(
    async (displayName) => {
      await peopleApi.create(displayName);
      await refreshPeople();
    },
    [refreshPeople],
  );

  const renamePerson = useCallback(
    async (id, displayName) => {
      await peopleApi.rename(id, displayName);
      await refreshPeople();
    },
    [refreshPeople],
  );

  const removePerson = useCallback(
    async (id) => {
      await peopleApi.remove(id);
      await refreshPeople();
    },
    [refreshPeople],
  );

  return { people, refreshPeople, addPerson, renamePerson, removePerson };
}
