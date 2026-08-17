import { useCallback, useEffect, useState } from 'react';

import { useRefreshOnFocus } from '../../lib/useRefreshOnFocus.js';
import { calendarApi } from './api.js';

/**
 * État du calendrier.
 *
 * Contrairement aux deux autres modules, les écritures ne sont pas optimistes :
 * un événement se saisit dans un formulaire, geste posé où l'on attend une
 * confirmation, et son rang dans l'agenda dépend de champs que l'utilisateur
 * vient de choisir. Recharger après enregistrement est ici plus honnête — et
 * imperceptible, puisque la réponse arrive pendant la fermeture du panneau.
 */
export function useCalendar() {
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    try {
      const data = await calendarApi.listEvents();
      setEvents(data.events);
      setStatus('ready');
    } catch (apiError) {
      if (silent) return;
      setError(apiError.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
    // La liste des personnes ne change quasiment jamais : un seul appel au
    // montage suffit.
    calendarApi
      .listPeople()
      .then((data) => setPeople(data.people))
      .catch(() => setPeople([]));
  }, [refresh]);

  const refreshSilently = useCallback(() => refresh({ silent: true }), [refresh]);
  useRefreshOnFocus(refreshSilently);

  const saveEvent = useCallback(
    async (event) => {
      // Un identifiant présent signifie qu'on modifie, sinon on crée.
      if (event.id) {
        const { id, ...champs } = event;
        await calendarApi.update(id, champs);
      } else {
        await calendarApi.create(event);
      }
      await refresh({ silent: true });
    },
    [refresh],
  );

  const removeEvent = useCallback(
    async (id) => {
      setEvents((precedents) => precedents.filter((event) => event.id !== id));
      try {
        await calendarApi.remove(id);
      } catch (apiError) {
        setError(apiError.message);
        await refresh({ silent: true });
      }
    },
    [refresh],
  );

  return {
    events,
    people,
    status,
    error,
    dismissError: () => setError(null),
    saveEvent,
    removeEvent,
  };
}
