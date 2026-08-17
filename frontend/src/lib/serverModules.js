import { useEffect, useState } from 'react';

import { api } from './apiClient.js';

/**
 * Découverte des modules disponibles côté API.
 *
 * Sert à un module qui veut proposer une passerelle vers un autre — par
 * exemple le frigo qui envoie un produit épuisé dans la liste de courses —
 * sans jamais importer son code.
 *
 * La source est `/api/health`, et non le registre du frontend, pour deux
 * raisons :
 *   — le registre charge les modules, donc un module qui l'importerait à son
 *     tour créerait un cycle d'imports ;
 *   — c'est bien la présence de l'API distante qui compte, pas celle de la
 *     page : c'est elle que l'on va appeler.
 */

let requete = null;

export function fetchServerModules() {
  requete ??= api
    .get('/health', { allowAnonymous: true })
    .then((data) => data.modules ?? [])
    .catch(() => []);
  return requete;
}

/** @returns {boolean} vrai si le module est monté côté serveur. */
export function useServerModule(name) {
  const [present, setPresent] = useState(false);

  useEffect(() => {
    let annule = false;
    fetchServerModules().then((liste) => {
      if (!annule) setPresent(liste.includes(name));
    });
    return () => {
      annule = true;
    };
  }, [name]);

  return present;
}
