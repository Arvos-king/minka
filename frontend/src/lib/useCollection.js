import { useCallback, useEffect, useRef, useState } from 'react';

import {
  creerSuiviQuantites,
  fusionnerElement,
  identifiantProvisoire,
  positionDe,
  reinsererElement,
  reinsererElements,
  releverElements,
  remplacerElement,
  retirerElement,
} from './collection.js';
import { useRefreshOnFocus } from './useRefreshOnFocus.js';

/**
 * Liste partagée, mise à jour de façon optimiste.
 *
 * Trois modules tenaient chacun leur version de ce cycle — chargement, erreur,
 * rafraîchissement au retour sur l'application, modification immédiate avec
 * restauration si le serveur refuse. Le pas de quantité, en particulier, était
 * recopié mot pour mot entre les courses et le frigo, alors qu'il règle un
 * problème de concurrence subtil : un correctif trouvé d'un côté n'atteignait
 * pas l'autre.
 *
 * Le socle le propose, il ne l'impose pas : un module qui a d'autres besoins
 * garde son propre état, comme n'importe quel hook de `lib/`.
 *
 * **Toutes les actions sont optimistes** : l'affichage réagit tout de suite,
 * puis l'appel confirme ou annule. C'est indispensable en magasin, où la
 * connexion est médiocre au moment précis où l'application sert.
 *
 * ## Conventions
 *
 * `charger` renvoie `{ elements, extra }` — à `useCallback`, sans quoi la
 * liste se rechargerait à chaque rendu. `extra` accueille ce qui accompagne la
 * liste sans en faire partie : les compteurs d'en-tête, par exemple.
 *
 * Les appels passés aux actions renvoient de même `{ element, extra }`, tous
 * deux facultatifs. C'est le seul endroit où un module traduit la forme de son
 * API (`data.item`, `data.task`) vers celle du hook.
 *
 * @param {() => Promise<{elements: Array, extra?: any}>} charger
 * @param {object} [options]
 * @param {(id: number, quantite: number) => Promise<{element?, extra?}>} [options.appelQuantite]
 *   Active `changerQuantite`. Omis, l'action n'est pas fournie.
 * @param {number} [options.quantiteMin]
 * @param {number} [options.quantiteMax]
 */
export function useCollection(charger, { appelQuantite, quantiteMin = 1, quantiteMax = 99 } = {}) {
  const [elements, setElements] = useState([]);
  const [extra, setExtra] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  /*
   * Reflet de la dernière liste rendue. Les restaurations ont besoin de
   * connaître la position d'origine d'un élément *avant* de le retirer, et une
   * fonction de mise à jour de React ne peut pas la ressortir : elle s'exécute
   * plus tard, et l'appel réseau est déjà parti.
   */
  const dernieresElements = useRef(elements);
  useEffect(() => {
    dernieresElements.current = elements;
  }, [elements]);

  const suivi = useRef(null);
  suivi.current ??= creerSuiviQuantites({ min: quantiteMin, max: quantiteMax });

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const recu = await charger();
        // La liste du serveur fait foi : les demandes de quantité en vol n'ont
        // plus rien à quoi se comparer.
        suivi.current.oublierTout();
        setElements(recu.elements);
        if (recu.extra !== undefined) setExtra(recu.extra);
        setStatus('ready');
      } catch (apiError) {
        // Un rafraîchissement d'arrière-plan qui échoue ne doit pas remplacer
        // une liste déjà affichée par un écran d'erreur.
        if (silent) return;
        setError(apiError.message);
        setStatus('error');
      }
    },
    [charger],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Voir ce que l'autre a saisi, sans temps réel, au retour sur l'application.
  const refreshSilently = useCallback(() => refresh({ silent: true }), [refresh]);
  useRefreshOnFocus(refreshSilently);

  /** Applique ce que la réponse rapporte : l'élément à jour, et les à-côtés. */
  const appliquerReponse = useCallback((id, reponse) => {
    if (reponse?.element) setElements((precedents) => remplacerElement(precedents, id, reponse.element));
    if (reponse?.extra !== undefined) setExtra(reponse.extra);
  }, []);

  /**
   * Ajout : l'élément paraît immédiatement sous un identifiant provisoire, que
   * la réponse remplace.
   *
   * Seule action à relancer l'erreur : le formulaire d'ajout a besoin de le
   * savoir pour rendre à l'utilisateur le texte qu'il venait de taper.
   */
  const ajouter = useCallback(
    async (provisoire, appel) => {
      const id = identifiantProvisoire();
      setElements((precedents) => [...precedents, { ...provisoire, id, pending: true }]);

      try {
        const reponse = await appel();
        setElements((precedents) =>
          reponse?.element ? remplacerElement(precedents, id, reponse.element) : retirerElement(precedents, id),
        );
        if (reponse?.extra !== undefined) setExtra(reponse.extra);
        return reponse;
      } catch (apiError) {
        setElements((precedents) => retirerElement(precedents, id));
        setError(apiError.message);
        throw apiError;
      }
    },
    [],
  );

  /**
   * Modification d'un élément. `changement` est fusionné pour l'affichage
   * immédiat ; l'élément d'origine revient tel quel si le serveur refuse.
   *
   * @returns la réponse, ou `undefined` en cas d'échec — de quoi réagir à ce
   *   que l'appel rapporte en plus (une tâche replanifiée, par exemple).
   *
   * Le succès renvoie toujours un objet, jamais `null` : sans quoi une route
   * répondant « 204 Sans contenu » serait indiscernable d'un échec pour un
   * appelant qui teste la valeur de retour.
   */
  const modifier = useCallback(
    async (element, changement, appel) => {
      setElements((precedents) => fusionnerElement(precedents, element.id, changement));

      try {
        const reponse = await appel();
        appliquerReponse(element.id, reponse);
        return reponse ?? {};
      } catch (apiError) {
        setElements((precedents) => remplacerElement(precedents, element.id, element));
        setError(apiError.message);
        return undefined;
      }
    },
    [appliquerReponse],
  );

  /** Retrait d'un élément, remis à sa place si le serveur refuse. */
  const retirer = useCallback(async (element, appel) => {
    const position = positionDe(dernieresElements.current, element.id);
    setElements((precedents) => retirerElement(precedents, element.id));

    try {
      const reponse = await appel();
      if (reponse?.extra !== undefined) setExtra(reponse.extra);
      return reponse ?? {};
    } catch (apiError) {
      setElements((precedents) => reinsererElement(precedents, element, position));
      setError(apiError.message);
      return undefined;
    }
  }, []);

  /** Retrait groupé — la purge d'une section terminée. */
  const retirerPlusieurs = useCallback(async (predicat, appel) => {
    const releves = releverElements(dernieresElements.current, predicat);
    // Rien à retirer : inutile d'appeler le serveur, et surtout de laisser
    // croire à un échec en ne renvoyant rien.
    if (releves.length === 0) return {};

    setElements((precedents) => precedents.filter((element) => !predicat(element)));

    try {
      const reponse = await appel();
      if (reponse?.extra !== undefined) setExtra(reponse.extra);
      return reponse ?? {};
    } catch (apiError) {
      setElements((precedents) => reinsererElements(precedents, releves));
      setError(apiError.message);
      return undefined;
    }
  }, []);

  /**
   * Pas de quantité, résistant aux taps rapides et aux réponses désordonnées.
   * Voir `creerSuiviQuantites` pour le détail du problème.
   */
  const changerQuantite = useCallback(
    async (element, pas) => {
      const quantite = suivi.current.prochaine(element.id, element.quantity, pas);
      if (quantite === null) return;

      setElements((precedents) => fusionnerElement(precedents, element.id, { quantity: quantite }));

      try {
        const reponse = await appelQuantite(element.id, quantite);
        // Une demande plus récente est partie entre-temps : on garde
        // l'affichage optimiste, c'est lui qui reflète l'intention.
        if (suivi.current.depassee(element.id, quantite)) return;

        suivi.current.oublier(element.id);
        appliquerReponse(element.id, reponse);
      } catch (apiError) {
        suivi.current.oublier(element.id);
        setElements((precedents) => remplacerElement(precedents, element.id, element));
        setError(apiError.message);
      }
    },
    [appelQuantite, appliquerReponse],
  );

  return {
    elements,
    extra,
    status,
    error,
    dismissError: useCallback(() => setError(null), []),
    signalerErreur: useCallback((message) => setError(message), []),
    refresh,
    setElements,
    setExtra,
    ajouter,
    modifier,
    retirer,
    retirerPlusieurs,
    ...(appelQuantite ? { changerQuantite } : {}),
  };
}
