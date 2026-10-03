import { useCallback, useEffect, useRef, useState } from 'react';

import { aujourdhui, decalerJours } from '../../lib/dates.js';
import { useCollection } from '../../lib/useCollection.js';
import { useServerModule } from '../../lib/serverModules.js';
import { menusApi } from './api.js';
import { completerRaccourcis } from './raccourcis.js';
import {
  appliquerCases,
  casesDAnnulation,
  contenuDe,
  predireAnnulation,
  predireDeplacement,
  releverCases,
  resumerDeplacement,
} from './reorganisation.js';
import { debutSemaine, decalerSemaine, finSemaine } from './semaine.js';
import { T } from './textes.js';

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
    setElements,
    ajouter,
    modifier,
    retirer,
  } = useCollection(charger);

  /*
   * La semaine affichée, lue au retour d'un appel plutôt qu'à son départ : on
   * a pu changer de semaine entre-temps, et les cases rendues par le serveur
   * ne doivent toucher que celle qui est à l'écran.
   */
  const periode = useRef({ from: debut, to: finSemaine(debut) });
  useEffect(() => {
    periode.current = { from: debut, to: finSemaine(debut) };
  }, [debut]);

  /*
   * La dernière réorganisation, gardée pour « Annuler » : les cases touchées,
   * telles que le serveur les a rendues, et la phrase qui la résume.
   *
   * Toute autre écriture l'efface. Annuler un décalage après avoir posé
   * « Resto » dans la case qu'il a libérée finirait en refus du serveur — à
   * raison, mais on ne comprendrait pas pourquoi.
   */
  const [annulation, setAnnulation] = useState(null);
  const oublierAnnulation = useCallback(() => setAnnulation(null), []);

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

  /*
   * Les raccourcis du panneau d'une case : les textes libres les plus
   * fréquents du foyer. Une commodité, pas une donnée : s'ils ne se chargent
   * pas, le panneau garde ceux de départ, sans bandeau d'erreur.
   */
  const [raccourcis, setRaccourcis] = useState(() => completerRaccourcis([]));

  const rafraichirRaccourcis = useCallback(async () => {
    try {
      setRaccourcis(completerRaccourcis((await menusApi.raccourcis()).raccourcis));
    } catch {
      // Ceux de départ restent proposés.
    }
  }, []);

  useEffect(() => {
    rafraichirRaccourcis();
  }, [rafraichirRaccourcis]);

  const repasDe = useCallback(
    (date, creneau) => entries.find((e) => e.onDate === date && e.slot === creneau) ?? null,
    [entries],
  );

  /**
   * La recette du répertoire que désigne une case, ou `null` : texte libre,
   * recette supprimée depuis la pose, ou module recettes absent. Le pointeur
   * n'étant garanti par rien, c'est le répertoire qui dit s'il mène encore
   * quelque part.
   */
  const recetteDe = useCallback(
    (repas) => (repas?.recipeId ? (recipes.find((r) => r.id === repas.recipeId) ?? null) : null),
    [recipes],
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
    (repas) => (repas ? (recetteDe(repas)?.title ?? repas.title) : null),
    [recetteDe],
  );

  /** Pose un repas dans une case, ou remplace celui qui s'y trouvait. */
  const definirRepas = useCallback(
    async (date, creneau, { recipeId = null, title }) => {
      setAnnulation(null);

      const appel = async () => {
        const data = await menusApi.setEntry(date, creneau, { recipeId, title });
        return { element: data.entry };
      };

      const existante = repasDe(date, creneau);
      const affichage = { recipeId, title };

      let reponse;
      try {
        reponse = existante
          ? await modifier(existante, affichage, appel)
          : await ajouter({ onDate: date, slot: creneau, ...affichage }, appel);
      } catch {
        // `ajouter` relance, `modifier` non : on rattrape pour que l'appelant
        // n'ait pas à connaître cette différence. L'erreur est déjà affichée.
        return undefined;
      }

      // Un texte libre de plus : il peut entrer dans les raccourcis.
      if (reponse && recipeId === null) rafraichirRaccourcis();
      return reponse;
    },
    [ajouter, modifier, rafraichirRaccourcis, repasDe],
  );

  const viderRepas = useCallback(
    (entry) => {
      setAnnulation(null);
      return retirer(entry, () => menusApi.clearEntry(entry.onDate, entry.slot));
    },
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
      setAnnulation(null);

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

  /**
   * Déplace un repas en poussant ceux qu'il déloge (`reorganisation.js`).
   *
   * La page applique d'abord la règle à ce qu'elle voit, puis la réponse du
   * serveur, qui fait foi : lui seul voit au-delà du dimanche, et l'état réel
   * du planning. En cas d'échec, les cases reprennent ce qu'elles portaient et
   * la semaine se recharge — un refus signale le plus souvent que l'autre a
   * réorganisé entre-temps.
   *
   * @param {{date: string, slot: string}} de
   * @param {{date: string, slot: string}} vers
   * @param {object} [contenuConnu]  ce que porte la case de départ quand elle
   *   n'est plus à l'écran : le mode « Déplacer… » laisse changer de semaine.
   * @returns `{ resume }`, ou `undefined` en cas d'échec — l'erreur est déjà
   *   affichée.
   */
  const deplacer = useCallback(
    async (de, vers, contenuConnu = null) => {
      setAnnulation(null);

      const contenu = contenuDe(repasDe(de.date, de.slot)) ?? contenuConnu;
      const prevues = contenu ? predireDeplacement(entries, de, contenu, vers) : [];
      const releves = releverCases(entries, prevues);
      setElements((precedents) => appliquerCases(precedents, prevues, periode.current));

      try {
        const { cases } = await menusApi.deplacer(de, vers);
        setElements((precedents) => appliquerCases(precedents, cases, periode.current));

        const resume = resumerDeplacement(cases, vers, intituleDe);
        setAnnulation({ cases, resume });
        return { resume };
      } catch (apiError) {
        setElements((precedents) => appliquerCases(precedents, releves, periode.current));
        signalerErreur(apiError.message);
        refresh({ silent: true });
        return undefined;
      }
    },
    [entries, intituleDe, refresh, repasDe, setElements, signalerErreur],
  );

  /** « Décaler d'un jour » : la même règle, vers le lendemain au même moment. */
  const decaler = useCallback(
    (date, slot) => deplacer({ date, slot }, { date: decalerJours(date, 1), slot }),
    [deplacer],
  );

  /**
   * Défait la dernière réorganisation : chaque case touchée revient à son état
   * d'avant. Le serveur refuse tout si l'une d'elles a changé depuis, plutôt
   * que d'effacer en silence ce que l'autre vient de poser.
   */
  const annuler = useCallback(async () => {
    if (!annulation) return undefined;

    const { cases } = annulation;
    setAnnulation(null);

    const prevues = predireAnnulation(cases);
    const releves = releverCases(entries, prevues);
    setElements((precedents) => appliquerCases(precedents, prevues, periode.current));

    try {
      const reponse = await menusApi.fixerCases(casesDAnnulation(cases));
      setElements((precedents) => appliquerCases(precedents, reponse.cases, periode.current));
      return reponse;
    } catch (apiError) {
      setElements((precedents) => appliquerCases(precedents, releves, periode.current));
      signalerErreur(
        apiError.status === 409 ? T.page.annulationImpossible : apiError.message,
      );
      refresh({ silent: true });
      return undefined;
    }
  }, [annulation, entries, refresh, setElements, signalerErreur]);

  return {
    debut,
    fin: finSemaine(debut),
    semainePrecedente: () => setDebut((precedent) => decalerSemaine(precedent, -1)),
    semaineSuivante: () => setDebut((precedent) => decalerSemaine(precedent, 1)),
    revenirALaSemaineCourante: () => setDebut(debutSemaine(aujourdhui())),

    entries,
    repasDe,
    recetteDe,
    intituleDe,
    /**
     * Après un import, le planning entier a changé — ce qu'on aurait pu
     * annuler avec, et peut-être les textes libres les plus fréquents.
     */
    rafraichir: () => {
      setAnnulation(null);
      rafraichirRaccourcis();
      return refresh({ silent: true });
    },
    recipes,
    raccourcis,
    recettesDisponibles,
    status,
    error,
    dismissError,

    definirRepas,
    viderRepas,
    creerEtPoser,

    deplacer,
    decaler,
    annulation,
    annuler,
    oublierAnnulation,
  };
}
