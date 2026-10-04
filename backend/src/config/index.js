/**
 * Configuration de l'application, lue une seule fois au démarrage.
 *
 * Le principe est le « fail-fast » : toute variable manquante ou incohérente
 * arrête le processus avec un message explicite, plutôt que de laisser tourner
 * une application silencieusement mal configurée. Sur une instance exposée sur
 * Internet, un secret de session par défaut serait la pire des trappes.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { lireLangue } from '../lib/langue.js';
import { T } from '../textes.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const isProduction = process.env.NODE_ENV === 'production';

/** Arrête le démarrage en expliquant ce qu'il faut corriger. */
function fail(message) {
  console.error(`\n${T.config.demarrageImpossible(message)}\n`);
  process.exit(1);
}

function readBoolean(name, fallback) {
  const raw = (process.env[name] ?? '').trim().toLowerCase();
  if (raw === '') return fallback;
  if (['true', '1', 'yes', 'on'].includes(raw)) return true;
  if (['false', '0', 'no', 'off'].includes(raw)) return false;
  return fail(T.config.booleen(name, raw));
}

function readInteger(name, fallback, { min = 1 } = {}) {
  const raw = (process.env[name] ?? '').trim();
  if (raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    return fail(T.config.entier(name, min, raw));
  }
  return value;
}

// --- Langue -----------------------------------------------------------------
//
// Lue par `lib/langue.js`, qui retombe sur le français faute de mieux : c'est
// ici qu'une valeur inconnue arrête le démarrage. Le message ne peut pas
// s'appuyer sur la langue demandée, puisqu'elle n'est pas comprise : il est
// donné dans les deux.

if (lireLangue() === null) {
  console.error(
    `\n[config] MINKA_LANG="${process.env.MINKA_LANG}" : valeurs possibles fr ou en. ` +
      '/ Accepted values: fr or en.\n',
  );
  process.exit(1);
}

// --- Secret de session ------------------------------------------------------

const MIN_SECRET_LENGTH = 32;
let sessionSecret = (process.env.SESSION_SECRET ?? '').trim();

if (sessionSecret === '') {
  if (isProduction) {
    fail(T.config.secretAbsent);
  }
  // En développement on préfère un secret jetable à un blocage : les sessions
  // ne survivront simplement pas à un redémarrage du serveur.
  sessionSecret = crypto.randomBytes(48).toString('base64');
  console.warn(T.config.secretJetable);
} else if (sessionSecret.length < MIN_SECRET_LENGTH) {
  fail(T.config.secretCourt(sessionSecret.length, MIN_SECRET_LENGTH));
}

// --- Proxies ----------------------------------------------------------------
//
// Deux proxies se trouvent devant l'API en production : Nginx Proxy Manager,
// puis le nginx de minka-web. Express doit le savoir pour reconstituer l'IP
// réelle du visiteur à partir de X-Forwarded-For — sans quoi le rate-limit de
// la page de connexion s'applique à l'IP du proxy, donc à tout le monde en
// même temps.

const rawTrustProxy = (process.env.TRUST_PROXY ?? '2').trim();
if (rawTrustProxy.toLowerCase() === 'true') {
  fail(T.config.trustProxyAveugle);
}
const trustProxy = /^\d+$/.test(rawTrustProxy) ? Number(rawTrustProxy) : rawTrustProxy;

// --- Comptes à créer au démarrage -------------------------------------------

/**
 * Lit les comptes déclarés dans l'environnement sous la forme
 * MINKA_USER<n>_USERNAME / _PASSWORD / _NAME.
 *
 * On balaie les variables présentes plutôt que de compter de 1 à N : un trou
 * dans la numérotation (USER1 vidé, USER2 rempli) ne fait pas disparaître les
 * comptes suivants.
 */
function readSeedUsers() {
  const indexes = Object.keys(process.env)
    .map((key) => /^MINKA_USER(\d+)_USERNAME$/.exec(key)?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b);

  const users = [];
  for (const index of indexes) {
    const username = (process.env[`MINKA_USER${index}_USERNAME`] ?? '').trim().toLowerCase();
    const password = process.env[`MINKA_USER${index}_PASSWORD`] ?? '';
    const displayName = (process.env[`MINKA_USER${index}_NAME`] ?? '').trim();

    // Un emplacement entièrement vide est normal (modèle .env non rempli).
    if (username === '' && password === '') continue;

    if (username === '') {
      fail(T.config.compteSansIdentifiant(index));
    }
    if (password.length < 8) {
      fail(T.config.motDePasseCourt(index, username));
    }
    users.push({ username, password, displayName: displayName || username });
  }
  return users;
}

// --- Emplacement des données ------------------------------------------------

const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(backendRoot, 'data'));
fs.mkdirSync(dataDir, { recursive: true });

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: readInteger('PORT', 3000),

  dataDir,
  databaseFile: path.join(dataDir, 'minka.db'),

  trustProxy,

  session: {
    secret: sessionSecret,
    cookieName: 'minka_session',
    secureCookie: readBoolean('SESSION_COOKIE_SECURE', isProduction),
    lifetimeDays: readInteger('SESSION_LIFETIME_DAYS', 30),
    /**
     * En deçà de ce seuil, le jeton est réémis à la volée lors d'une requête
     * authentifiée. C'est ce qui évite de se retrouver déconnecté en plein
     * supermarché parce que la session a expiré pendant la nuit.
     */
    renewWhenDaysLeft: 7,
  },

  /**
   * Origines acceptées pour les requêtes mutantes. Vide = on se contente de
   * vérifier que l'origine correspond à l'hôte appelé, ce qui couvre aussi bien
   * le sous-domaine de production que le serveur de développement Vite.
   */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),

  seedUsers: readSeedUsers(),
};
