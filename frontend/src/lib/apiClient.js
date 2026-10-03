/**
 * Client HTTP de l'application.
 *
 * Le frontend et l'API partagent la même origine (nginx relaie /api en
 * production, Vite en développement) : pas de CORS, et le cookie de session
 * voyage tout seul. Il reste `credentials: 'include'` par sécurité, pour le cas
 * où l'application serait un jour servie depuis un autre domaine.
 */

import { T } from '../textes.js';
import { marquerSynchro } from './reseau.js';

const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * @param {object} [options]
 * @param {boolean} [options.allowAnonymous]
 *   Empêche un 401 de déclencher la déconnexion globale. Réservé aux appels
 *   pour lesquels « non connecté » est une réponse normale : la vérification de
 *   session au démarrage et la tentative de connexion elle-même.
 */
async function request(method, path, { body, allowAnonymous = false, signal } = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    // Coupure réseau : fréquent en magasin, le message doit rester clair.
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', T.reseau.injoignable);
  }

  /*
   * Lecture réussie : on note l'heure, mais seulement si le navigateur se dit
   * en ligne. Hors ligne, la réponse vient du cache du service worker et
   * daterait à tort la synchronisation d'aujourd'hui.
   */
  if (response.ok && method === 'GET') marquerSynchro();

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !allowAnonymous) {
      // La session a expiré pendant la navigation : on prévient l'application,
      // qui ramène proprement à l'écran de connexion.
      window.dispatchEvent(new CustomEvent('minka:unauthorized'));
    }
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? T.reseau.erreur(response.status),
      error?.details,
    );
  }

  return payload;
}

export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  // `put` fixe le contenu d'une ressource adressable — la case « mardi soir »
  // du planning des menus, par exemple. Refaire le même appel donne le même
  // résultat, ce que `post` ne promet pas.
  put: (path, body, options) => request('PUT', path, { ...options, body }),
  delete: (path, options) => request('DELETE', path, options),
};
