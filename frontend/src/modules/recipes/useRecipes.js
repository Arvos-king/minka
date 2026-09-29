import { useCallback } from 'react';

import { useCollection } from '../../lib/useCollection.js';
import { recipesApi } from './api.js';

/**
 * Le répertoire de recettes.
 *
 * `useCollection` pour ce qu'il apporte ici : le chargement, l'erreur, le
 * rafraîchissement au retour sur l'application, et une suppression optimiste
 * qui remet la recette à sa place si le serveur refuse.
 *
 * L'enregistrement, lui, n'est pas optimiste : il passe par un formulaire qui
 * attend déjà la réponse pour se fermer, et une recette qui apparaîtrait avant
 * d'exister n'avancerait à rien.
 */
export function useRecipes() {
  const charger = useCallback(async () => {
    const data = await recipesApi.list();
    return { elements: data.recipes };
  }, []);

  const { elements, status, error, dismissError, signalerErreur, refresh, retirer } =
    useCollection(charger);

  /** @returns la recette telle que le serveur l'a enregistrée. */
  const enregistrer = useCallback(
    async (recette) => {
      let reponse;
      if (recette.id) {
        const { id, ...champs } = recette;
        reponse = await recipesApi.update(id, champs);
      } else {
        reponse = await recipesApi.create(recette);
      }
      await refresh({ silent: true });
      return reponse.recipe;
    },
    [refresh],
  );

  /**
   * L'appelant ne passe qu'un identifiant : la recette est reprise dans la
   * liste, et non reconstruite à partir de la fiche ouverte. C'est elle que
   * `useCollection` remettra à sa place si le serveur refuse, avec son
   * décompte d'ingrédients — une fiche n'en porte pas.
   */
  const supprimer = useCallback(
    (id) => {
      const recette = elements.find((element) => element.id === id);
      if (recette) retirer(recette, () => recipesApi.remove(id));
    },
    [elements, retirer],
  );

  return {
    recettes: elements,
    status,
    error,
    dismissError,
    signalerErreur,
    enregistrer,
    supprimer,
  };
}
