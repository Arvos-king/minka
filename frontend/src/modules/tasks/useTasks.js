import { useCallback, useState } from 'react';

import { useCollection } from '../../lib/useCollection.js';
import { tasksApi } from './api.js';

/**
 * État de la liste de tâches.
 *
 * Le cycle commun vient de `useCollection`. Deux partis pris restent propres au
 * module :
 *
 *   — cocher est optimiste, c'est un geste rapide et souvent répété ; créer et
 *     modifier passent par un formulaire et attendent le serveur, comme dans le
 *     calendrier ;
 *   — cocher une tâche récurrente ne la termine pas, elle se replanifie. Sans
 *     un mot pour l'annoncer, on croirait qu'il ne s'est rien passé.
 */
export function useTasks() {
  const charger = useCallback(async () => {
    const data = await tasksApi.list();
    return { elements: data.tasks, extra: data.counts };
  }, []);

  const {
    elements: tasks,
    extra: counts,
    status,
    error,
    dismissError,
    refresh,
    modifier,
    retirer,
    retirerPlusieurs,
  } = useCollection(charger);

  /** Message éphémère annonçant la replanification d'une tâche récurrente. */
  const [replanification, setReplanification] = useState(null);

  const toggleTask = useCallback(
    async (task) => {
      const reponse = await modifier(task, { done: !task.done }, async () => {
        const data = await tasksApi.update(task.id, { done: !task.done });
        return { element: data.task, extra: data.counts, rescheduled: data.rescheduled };
      });

      if (reponse?.rescheduled) {
        setReplanification({ titre: reponse.element.title, dueOn: reponse.element.dueOn });
        // La tâche repart avec une nouvelle échéance : elle change de rang.
        await refresh({ silent: true });
      }
    },
    [modifier, refresh],
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

  // Le panneau de saisie ne connaît que l'identifiant de la tâche qu'il édite.
  const removeTask = useCallback(
    async (id) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      await retirer(task, async () => ({ extra: (await tasksApi.remove(id)).counts }));
    },
    [tasks, retirer],
  );

  const purgeCompleted = useCallback(
    () =>
      retirerPlusieurs(
        (task) => task.done,
        async () => ({ extra: (await tasksApi.purgeCompleted()).counts }),
      ),
    [retirerPlusieurs],
  );

  return {
    tasks,
    counts: counts ?? { pending: 0, done: 0 },
    status,
    error,
    dismissError,
    replanification,
    dismissReplanification: useCallback(() => setReplanification(null), []),
    refresh,
    toggleTask,
    saveTask,
    removeTask,
    purgeCompleted,
  };
}
