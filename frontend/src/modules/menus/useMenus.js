import { useCallback, useEffect, useState } from 'react';

import { aujourdhui } from '../../lib/dates.js';
import { useCollection } from '../../lib/useCollection.js';
import { menusApi } from './api.js';
import { debutSemaine, decalerSemaine, finSemaine } from './semaine.js';

/**
 * Planning des repas de la semaine, et répertoire des recettes.
 *
 * La semaine affichée fait partie de l'état : `charger` en dépend, et changer
 * de semaine déclenche donc le rechargement tout seul — c'est exactement ce que
 * `useCollection` attend d'une fonction de chargement mémorisée.
 */
export function useMenus() {
  const [debut, setDebut] = useState(() => debutSemaine(aujourdhui()));

  const charger = useCallback(async () => {
    const data = await menusApi.plan(debut, finSemaine(debut));
    return { elements: data.entries };
  }, [debut]);

  const {
    elements: entries,
    status,
    error,
    dismissError,
    signalerErreur,
    refresh,
    ajouter,
    modifier,
    retirer,
  } = useCollection(charger);

  /*
   * Les recettes vivent à part du planning : ce sont deux collections
   * distinctes, et le répertoire ne se modifie qu'au travers d'un formulaire
   * qui attend la réponse. Rien à rendre optimiste ici.
   */
  const [recipes, setRecipes] = useState([]);

  const rafraichirRecettes = useCallback(async () => {
    try {
      setRecipes((await menusApi.recipes()).recipes);
    } catch (apiError) {
      signalerErreur(apiError.message);
    }
  }, [signalerErreur]);

  useEffect(() => {
    rafraichirRecettes();
  }, [rafraichirRecettes]);

  const repasDe = useCallback(
    (date, creneau) => entries.find((e) => e.onDate === date && e.slot === creneau) ?? null,
    [entries],
  );

  /**
   * Pose un repas dans une case, ou remplace celui qui s'y trouvait.
   *
   * `recipeTitle` n'est pas envoyé au serveur — il ne sert qu'à l'affichage
   * immédiat, le temps que la réponse arrive avec le titre joint.
   */
  const definirRepas = useCallback(
    async (date, creneau, { recipeId = null, recipeTitle = null, freeText = null }) => {
      const appel = async () => {
        const data = await menusApi.setEntry(date, creneau, { recipeId, freeText });
        return { element: data.entry };
      };

      const existante = repasDe(date, creneau);
      const affichage = { recipeId, recipeTitle, freeText };

      try {
        if (existante) return await modifier(existante, affichage, appel);
        return await ajouter({ onDate: date, slot: creneau, ...affichage }, appel);
      } catch {
        // `ajouter` relance, `modifier` non : on rattrape pour que l'appelant
        // n'ait pas à connaître cette différence. L'erreur est déjà affichée.
        return undefined;
      }
    },
    [ajouter, modifier, repasDe],
  );

  const viderRepas = useCallback(
    (entry) => retirer(entry, () => menusApi.clearEntry(entry.onDate, entry.slot)),
    [retirer],
  );

  // --- Recettes --------------------------------------------------------------

  const enregistrerRecette = useCallback(
    async (recette) => {
      if (recette.id) {
        const { id, ...champs } = recette;
        await menusApi.updateRecipe(id, champs);
      } else {
        await menusApi.createRecipe(recette);
      }
      await rafraichirRecettes();
      // Le planning affiche les titres : un renommage doit s'y voir.
      await refresh({ silent: true });
    },
    [rafraichirRecettes, refresh],
  );

  const supprimerRecette = useCallback(
    async (id) => {
      try {
        await menusApi.removeRecipe(id);
        await rafraichirRecettes();
        // Ses repas prévus sont partis avec elle : le planning a changé.
        await refresh({ silent: true });
      } catch (apiError) {
        signalerErreur(apiError.message);
      }
    },
    [rafraichirRecettes, refresh, signalerErreur],
  );

  return {
    debut,
    fin: finSemaine(debut),
    semainePrecedente: () => setDebut((precedent) => decalerSemaine(precedent, -1)),
    semaineSuivante: () => setDebut((precedent) => decalerSemaine(precedent, 1)),
    revenirALaSemaineCourante: () => setDebut(debutSemaine(aujourdhui())),

    entries,
    repasDe,
    /** Après un import, le planning entier a changé. */
    rafraichir: () => refresh({ silent: true }),
    recipes,
    status,
    error,
    dismissError,

    definirRepas,
    viderRepas,
    enregistrerRecette,
    supprimerRecette,
  };
}
