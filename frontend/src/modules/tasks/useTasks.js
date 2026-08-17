import { useCallback, useEffect, useState } from 'react';

import { useRefreshOnFocus } from '../../lib/useRefreshOnFocus.js';
import { tasksApi } from './api.js';

/**
 * État de la liste de tâches.
 *
 * Cocher une tâche est optimiste — c'est un geste rapide, souvent répété, et
 * l'attente d'une réponse s'y verrait. La création et la modification passent
 * en revanche par un formulaire et attendent la confirmation du serveur, comme
 * dans le calendrier.
 */
export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, done: 0 });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  /** Message éphémère annonçant la replanification d'une tâche récurrente. */
  const [replanification, setReplanification] = useState(null);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    try {
      const data = await tasksApi.list();
      setTasks(data.tasks);
      setCounts(data.counts);
      setStatus('ready');
    } catch (apiError) {
      if (silent) return;
      setError(apiError.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshSilently = useCallback(() => refresh({ silent: true }), [refresh]);
  useRefreshOnFocus(refreshSilently);

  const toggleTask = useCallback(
    async (task) => {
      const done = !task.done;

      // Affichage immédiat. Une tâche récurrente ne se termine pas côté
      // serveur : la réponse la remettra à faire, avec une nouvelle échéance.
      setTasks((precedentes) =>
        precedentes.map((t) => (t.id === task.id ? { ...t, done } : t)),
      );

      try {
        const data = await tasksApi.update(task.id, { done });
        setCounts(data.counts);

        if (data.rescheduled) {
          // Sans ce message, cocher une tâche récurrente donnerait l'impression
          // qu'il ne s'est rien passé : elle réapparaît simplement plus loin.
          setReplanification({ titre: data.task.title, dueOn: data.task.dueOn });
          await refresh({ silent: true });
        } else {
          setTasks((precedentes) =>
            precedentes.map((t) => (t.id === task.id ? data.task : t)),
          );
        }
      } catch (apiError) {
        setTasks((precedentes) => precedentes.map((t) => (t.id === task.id ? task : t)));
        setError(apiError.message);
      }
    },
    [refresh],
  );

  const saveTask = useCallback(
    async (task) => {
      if (task.id) {
        const { id, ...champs } = task;
        await tasksApi.update(id, champs);
      } else {
        await tasksApi.create(task);
      }
      await refresh({ silent: true });
    },
    [refresh],
  );

  const removeTask = useCallback(
    async (id) => {
      setTasks((precedentes) => precedentes.filter((t) => t.id !== id));
      try {
        const data = await tasksApi.remove(id);
        setCounts(data.counts);
      } catch (apiError) {
        setError(apiError.message);
        await refresh({ silent: true });
      }
    },
    [refresh],
  );

  const purgeCompleted = useCallback(async () => {
    const retirees = tasks.filter((t) => t.done);
    setTasks((precedentes) => precedentes.filter((t) => !t.done));

    try {
      const data = await tasksApi.purgeCompleted();
      setCounts(data.counts);
    } catch (apiError) {
      setTasks((precedentes) => [...precedentes, ...retirees]);
      setError(apiError.message);
    }
  }, [tasks]);

  return {
    tasks,
    counts,
    status,
    error,
    dismissError: () => setError(null),
    replanification,
    dismissReplanification: () => setReplanification(null),
    refresh,
    toggleTask,
    saveTask,
    removeTask,
    purgeCompleted,
  };
}
