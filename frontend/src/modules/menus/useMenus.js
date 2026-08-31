import { useCallback, useEffect, useState } from 'react';

import { aujourdhui } from '../../lib/dates.js';
import { useCollection } from '../../lib/useCollection.js';
import { useServerModule } from '../../lib/serverModules.js';
import { menusApi } from './api.js';
import { debutSemaine, decalerSemaine, finSemaine } from './semaine.js';

/**
 * Planning des repas de la semaine.
 *
 * La semaine affichée fait partie de l'état : `charger` en dépend, et changer
 * de semaine déclenche donc le rechargement tout seul — c'est exactement ce que
 * `useCollection` attend d'une fonction de chargement mémorisée.
 *
 * Les recettes, elles, appartiennent à un autre module. Ce hook les lit par
 * HTTP quand ce module répond, et s'en passe sinon : le planning reste alors un
 * agenda de repas écrits à la main, ce qui est déjà la moitié d'une vraie
 * semaine.
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

  const recettesDisponibles = useServerModule('recipes');
  const [recipes, setRecipes] = useState([]);

  const rafraichirRecettes = useCallback(async () => {
    if (!recettesDisponibles) return;
    try {
      setRecipes((await menusApi.recettes()).recipes);
    } catch (apiError) {
      signalerErreur(apiError.message);
    }
  }, [recettesDisponibles, signalerErreur]);

  useEffect(() => {
    rafraichirRecettes();
  }, [rafraichirRecettes]);

  const repasDe = useCallback(
    (date, creneau) => entries.find((e) => e.onDate === date && e.slot === creneau) ?? null,
    [entries],
  );

  /**
   * L'intitulé à afficher pour une case.
   *
   * La case porte le titre recopié le jour de la pose : c'est lui qui permet
   * au planning de s'afficher sans le module recettes. Mais quand le
   * répertoire est là, c'est **son** titre qui l'emporte — sans quoi renommer
   * une recette ne se verrait jamais dans les semaines déjà posées.
   */
  const intituleDe = useCallback(
    (repas) => {
      if (!repas) return null;
      const recette = repas.recipeId ? recipes.find((r) => r.id === repas.recipeId) : null;
      return recette?.title ?? repas.title;
    },
    [recipes],
  );

  /** Pose un repas dans une case, ou remplace celui qui s'y trouvait. */
  const definirRepas = useCallback(
    async (date, creneau, { recipeId = null, title }) => {
      const appel = async () => {
        const data = await menusApi.setEntry(date, creneau, { recipeId, title });
        return { element: data.entry };
      };

      const existante = repasDe(date, creneau);
      const affichage = { recipeId, title };

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

  /**
   * Crée une recette du seul intitulé, et la pose.
   *
   * Sans ingrédients : on planifie la semaine, ce n'est pas le moment de
   * dresser une liste. La fiche s'étoffe plus tard, dans le module recettes —
   * et le répertoire local est rafraîchi pour que le sélecteur la propose déjà
   * aux autres cases.
   */
  const creerEtPoser = useCallback(
    async (date, creneau, title) => {
      try {
        const { recipe } = await menusApi.creerRecette(title);
        await rafraichirRecettes();
        return await definirRepas(date, creneau, { recipeId: recipe.id, title: recipe.title });
      } catch (apiError) {
        signalerErreur(apiError.details?.[0]?.message ?? apiError.message);
        return undefined;
      }
    },
    [definirRepas, rafraichirRecettes, signalerErreur],
  );

  return {
    debut,
    fin: finSemaine(debut),
    semainePrecedente: () => setDebut((precedent) => decalerSemaine(precedent, -1)),
    semaineSuivante: () => setDebut((precedent) => decalerSemaine(precedent, 1)),
    revenirALaSemaineCourante: () => setDebut(debutSemaine(aujourdhui())),

    entries,
    repasDe,
    intituleDe,
    /** Après un import, le planning entier a changé. */
    rafraichir: () => refresh({ silent: true }),
    recipes,
    recettesDisponibles,
    status,
    error,
    dismissError,

    definirRepas,
    viderRepas,
    creerEtPoser,
  };
}
