/**
 * Protection CSRF complémentaire : contrôle de l'en-tête `Origin`.
 *
 * Le cookie de session est déjà en `SameSite=lax`, ce qui empêche un autre site
 * de déclencher une requête mutante authentifiée. Cette vérification ajoute une
 * seconde barrière, indépendante du comportement du navigateur.
 *
 * Un `Origin` absent est accepté : les navigateurs l'envoient systématiquement
 * sur les requêtes non-GET venues d'un autre site — son absence signale donc un
 * client non navigateur (curl, sonde de supervision), pas une attaque CSRF.
 */

import { config } from '../config/index.js';
import { T } from '../textes.js';
import { AppError } from './errorHandler.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function originGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (!origin) return next();

  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return next(new AppError(403, 'BAD_ORIGIN', T.erreurs.origineInvalide));
  }

  // Liste explicite, si elle a été renseignée.
  if (config.allowedOrigins.length > 0) {
    if (config.allowedOrigins.includes(origin)) return next();
    return next(new AppError(403, 'BAD_ORIGIN', T.erreurs.origineNonAutorisee));
  }

  // Sinon : l'origine doit correspondre à l'hôte appelé. Sous Express 5,
  // `req.host` renvoie X-Forwarded-Host (port compris) dès lors que la requête
  // vient d'un proxy de confiance, et retombe sur l'en-tête Host sinon — ce qui
  // couvre le sous-domaine de production comme le serveur Vite en dev.
  if (originHost === req.host) return next();

  return next(new AppError(403, 'BAD_ORIGIN', T.erreurs.origineEtrangere));
}
