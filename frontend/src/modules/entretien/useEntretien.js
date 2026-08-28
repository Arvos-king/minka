import { useCallback, useState } from 'react';

import { useCollection } from '../../lib/useCollection.js';
import { entretienApi } from './api.js';

/**
 * État du planning d'entretien.
 *
 * Les pièces voyagent dans `extra` : elles accompagnent le planning sans en
 * faire partie, et l'API les renvoie du même appel — la page a besoin des deux
 * pour afficher ses filtres.
 */
export function useEntretien() {
  const charger = useCallback(async () => {
    const data = await entretienApi.list();
    return { elements: data.tasks, extra: data.zones };
  }, []);

  const {
    elements: taches,
    extra: zones,
    status,
    error,
    dismissError,
    signalerErreur,
    refresh,
    ajouter,
    modifier,
    retirer,
  } = useCollection(charger);

  /** Filtre par pièce ; `null` = toute la maison. */
  const [zoneFiltre, setZoneFiltre] = useState(null);

  /**
   * « C'est fait ». La ligne saute aussitôt à sa prochaine échéance, ce qui la
   * fait quitter la section « en retard » sous le doigt — la confirmation la
   * plus lisible qui soit.
   */
  const marquerFaite = useCallback(
    (tache) =>
      // Aucun changement optimiste : la nouvelle échéance vient du serveur, et
      // l'inventer ici dupliquerait son calcul.
      modifier(tache, {}, async () => {
        const data = await entretienApi.done(tache.id);
        return { element: data.task };
      }),
    [modifier],
  );

  const repousser = useCallback(
    (tache, jours) =>
      modifier(tache, {}, async () => {
        const data = await entretienApi.snooze(tache.id, jours);
        return { element: data.task };
      }),
    [modifier],
  );

  /**
   * @param {object|null} existante  la tâche telle qu'elle est affichée, ou
   *   `null` pour une création. C'est bien elle qu'il faut passer, et non un
   *   objet reconstruit : c'est elle qui revient à l'écran si le serveur refuse.
   */
  const enregistrer = useCallback(
    (existante, champs) => {
      if (!existante) {
        return ajouter(champs, async () => {
          const data = await entretienApi.create(champs);
          return { element: data.task };
        });
      }
      return modifier(existante, champs, async () => {
        const data = await entretienApi.update(existante.id, champs);
        return { element: data.task };
      });
    },
    [ajouter, modifier],
  );

  const supprimer = useCallback(
    (tache) => retirer(tache, () => entretienApi.remove(tache.id)),
    [retirer],
  );

  const enregistrerZone = useCallback(
    async (zone) => {
      if (zone.id) await entretienApi.updateZone(zone.id, zone.label);
      else await entretienApi.createZone(zone.label);
      await refresh({ silent: true });
    },
    [refresh],
  );

  const supprimerZone = useCallback(
    async (id) => {
      try {
        await entretienApi.removeZone(id);
        // Les interventions restent, sans rattachement : le planning a changé.
        await refresh({ silent: true });
        setZoneFiltre((precedent) => (precedent === id ? null : precedent));
      } catch (apiError) {
        signalerErreur(apiError.message);
      }
    },
    [refresh, signalerErreur],
  );

  const visibles = zoneFiltre === null ? taches : taches.filter((t) => t.zoneId === zoneFiltre);

  return {
    taches: visibles,
    total: taches.length,
    zones: zones ?? [],
    zoneFiltre,
    setZoneFiltre,
    status,
    error,
    dismissError,
    marquerFaite,
    repousser,
    enregistrer,
    supprimer,
    enregistrerZone,
    supprimerZone,
  };
}
