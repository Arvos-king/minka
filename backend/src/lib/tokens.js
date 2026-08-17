/**
 * Jetons de session (JWT) et cookie associé.
 *
 * Ce fichier appartient au socle et non au module `auth` : le middleware de
 * vérification en a besoin, tout comme les routes de connexion. Les isoler ici
 * évite une dépendance circulaire entre le socle et le module.
 *
 * Le jeton voyage dans un cookie `httpOnly` plutôt que dans le localStorage :
 * un script injecté dans la page ne peut alors pas le lire.
 */

import jwt from 'jsonwebtoken';

import { config } from '../config/index.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Options du cookie, partagées entre l'émission et la suppression. */
function cookieOptions() {
  return {
    httpOnly: true,
    // `Secure` en production : le cookie ne part alors qu'en HTTPS.
    secure: config.session.secureCookie,
    // `lax` laisse passer la navigation normale vers l'application tout en
    // bloquant les requêtes mutantes venues d'un autre site (protection CSRF).
    sameSite: 'lax',
    path: '/',
  };
}

export function signSessionToken(user) {
  return jwt.sign(
    { sub: String(user.id), username: user.username },
    config.session.secret,
    { expiresIn: `${config.session.lifetimeDays}d` },
  );
}

/** @returns {object|null} le contenu du jeton, ou null s'il est invalide/expiré. */
export function verifySessionToken(token) {
  try {
    return jwt.verify(token, config.session.secret);
  } catch {
    return null;
  }
}

export function setSessionCookie(res, user) {
  res.cookie(config.session.cookieName, signSessionToken(user), {
    ...cookieOptions(),
    maxAge: config.session.lifetimeDays * MS_PER_DAY,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.session.cookieName, cookieOptions());
}

/**
 * Indique si le jeton approche de son terme et mérite d'être réémis.
 * C'est ce renouvellement glissant qui évite d'être déconnecté au mauvais
 * moment : tant que l'application est utilisée, la session ne s'éteint pas.
 */
export function shouldRenew(payload) {
  if (!payload?.exp) return false;
  const msLeft = payload.exp * 1000 - Date.now();
  return msLeft < config.session.renewWhenDaysLeft * MS_PER_DAY;
}
