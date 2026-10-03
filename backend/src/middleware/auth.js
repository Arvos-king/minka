/**
 * Vérification de la session.
 *
 * Appliqué automatiquement par le loader à tout module déclarant
 * `requiresAuth: true` (la valeur par défaut) : un module n'a donc rien à faire
 * pour être protégé.
 */

import { config } from '../config/index.js';
import { stmt } from '../db/index.js';
import { clearSessionCookie, setSessionCookie, shouldRenew, verifySessionToken } from '../lib/tokens.js';
import { T } from '../textes.js';
import { AppError } from './errorHandler.js';

const UNAUTHENTICATED = () => new AppError(401, 'UNAUTHENTICATED', T.erreurs.sessionAbsente);

export function requireAuth(req, res, next) {
  const token = req.cookies?.[config.session.cookieName];
  if (!token) return next(UNAUTHENTICATED());

  const payload = verifySessionToken(token);
  if (!payload) {
    // Cookie illisible ou périmé : on le retire pour éviter que le navigateur
    // le renvoie indéfiniment.
    clearSessionCookie(res);
    return next(UNAUTHENTICATED());
  }

  // On relit l'utilisateur à chaque requête plutôt que de se fier au contenu du
  // jeton : un compte supprimé ou renommé est ainsi pris en compte immédiatement.
  const user = stmt('SELECT id, username, display_name FROM users WHERE id = ?').get(Number(payload.sub));
  if (!user) {
    clearSessionCookie(res);
    return next(UNAUTHENTICATED());
  }

  req.user = user;

  if (shouldRenew(payload)) setSessionCookie(res, user);

  return next();
}
