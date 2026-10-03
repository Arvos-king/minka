/**
 * Gestion centralisée des erreurs.
 *
 * Les modules lèvent une `AppError` (ou laissent remonter une exception) et
 * n'ont jamais à formater eux-mêmes une réponse d'erreur : le format reste
 * identique dans toute l'API, ce qui simplifie le client.
 *
 * Express 5 transmet automatiquement les rejets des handlers `async` à ce
 * middleware — inutile d'encapsuler quoi que ce soit.
 */

import { T } from '../textes.js';

/** Erreur métier, destinée à être affichée telle quelle au client. */
export class AppError extends Error {
  /**
   * @param {number} status  code HTTP
   * @param {string} code    identifiant stable, exploitable par le frontend
   * @param {string} message message lisible, dans la langue de l'instance
   * @param {unknown} [details]
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Toute route inconnue renvoie un JSON, jamais la page d'erreur HTML d'Express. */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: T.erreurs.routeInconnue(req.method, req.originalUrl) },
  });
}

// eslint-disable-next-line no-unused-vars -- Express identifie ce middleware à ses 4 arguments.
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  // JSON malformé : express.json() lève une SyntaxError porteuse d'un status.
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: T.erreurs.jsonInvalide } });
  }

  // Tout le reste est un bug : trace complète côté serveur, message neutre
  // côté client (un message d'erreur interne renseigne un attaquant).
  console.error('[error]', err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: T.erreurs.interne },
  });
}
