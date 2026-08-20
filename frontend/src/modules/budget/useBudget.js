import { useCallback, useEffect, useState } from 'react';

import { aujourdhui } from '../../lib/dates.js';
import { useCollection } from '../../lib/useCollection.js';
import { budgetApi } from './api.js';
import { debutMois, decalerMois, finMois } from './mois.js';

/**
 * Dépenses du mois affiché, et catégories du foyer.
 *
 * Le mois fait partie de l'état : `charger` en dépend, et en changer déclenche
 * donc le rechargement tout seul — comme la semaine du module menus.
 *
 * Les totaux voyagent dans `extra` : ils accompagnent la liste sans en faire
 * partie, et c'est le serveur qui les calcule, pour que deux écrans n'en
 * donnent jamais deux versions.
 */
export function useBudget() {
  const [debut, setDebut] = useState(() => debutMois(aujourdhui()));
  const fin = finMois(debut);

  const charger = useCallback(async () => {
    const data = await budgetApi.expenses(debut, finMois(debut));
    return { elements: data.expenses, extra: data.totals };
  }, [debut]);

  const {
    elements: expenses,
    extra: totals,
    status,
    error,
    dismissError,
    signalerErreur,
    refresh,
    ajouter,
    modifier,
    retirer,
  } = useCollection(charger);

  /* Les catégories changent rarement et ne dépendent pas du mois : elles
     vivent à part, comme le répertoire de recettes des menus. */
  const [categories, setCategories] = useState([]);

  const rafraichirCategories = useCallback(async () => {
    try {
      setCategories((await budgetApi.categories()).categories);
    } catch (apiError) {
      signalerErreur(apiError.message);
    }
  }, [signalerErreur]);

  useEffect(() => {
    rafraichirCategories();
  }, [rafraichirCategories]);

  /*
   * Les totaux sont calculés par le serveur : toute écriture les périme, et
   * refaire la somme dans le navigateur finirait par diverger de celle faite
   * en base. On recharge donc en silence — la ligne, elle, est déjà affichée.
   */
  const ajouterDepense = useCallback(
    async (depense) => {
      const reponse = await ajouter(depense, async () => {
        const data = await budgetApi.createExpense(depense);
        return { element: data.expense };
      });
      await refresh({ silent: true });
      return reponse;
    },
    [ajouter, refresh],
  );

  const modifierDepense = useCallback(
    async (depense, champs) => {
      const reponse = await modifier(depense, champs, async () => {
        const data = await budgetApi.updateExpense(depense.id, champs);
        return { element: data.expense };
      });
      if (reponse) await refresh({ silent: true });
      return reponse;
    },
    [modifier, refresh],
  );

  const supprimerDepense = useCallback(
    async (depense) => {
      const reponse = await retirer(depense, () => budgetApi.removeExpense(depense.id));
      if (reponse) await refresh({ silent: true });
    },
    [retirer, refresh],
  );

  const enregistrerCategorie = useCallback(
    async (categorie) => {
      if (categorie.id) {
        const { id, ...champs } = categorie;
        await budgetApi.updateCategory(id, champs);
      } else {
        await budgetApi.createCategory(categorie);
      }
      await rafraichirCategories();
      // Les lignes affichent le nom de leur catégorie : un renommage doit s'y voir.
      await refresh({ silent: true });
    },
    [rafraichirCategories, refresh],
  );

  const supprimerCategorie = useCallback(
    async (id) => {
      try {
        await budgetApi.removeCategory(id);
        await rafraichirCategories();
        // Ses dépenses restent, sans étiquette : le classement a changé.
        await refresh({ silent: true });
      } catch (apiError) {
        signalerErreur(apiError.message);
      }
    },
    [rafraichirCategories, refresh, signalerErreur],
  );

  return {
    debut,
    fin,
    moisPrecedent: () => setDebut((precedent) => decalerMois(precedent, -1)),
    moisSuivant: () => setDebut((precedent) => decalerMois(precedent, 1)),
    revenirAuMoisCourant: () => setDebut(debutMois(aujourdhui())),

    expenses,
    totals: totals ?? { spentCents: 0, byCategory: [] },
    categories,
    status,
    error,
    dismissError,

    ajouterDepense,
    modifierDepense,
    supprimerDepense,
    enregistrerCategorie,
    supprimerCategorie,
  };
}
