/**
 * Textes du socle de l'API : configuration, démarrage, erreurs communes.
 *
 * Chaque module tient les siens dans son propre `textes.js` ; ceux-ci ne
 * concernent que ce qui n'appartient à aucun module. Les deux langues doivent
 * porter exactement les mêmes clés — `lib/langue.test.js` y veille, pour tous
 * les dictionnaires à la fois.
 */

import { textes } from './lib/langue.js';

export const TEXTES = {
  fr: {
    config: {
      demarrageImpossible: (message) => `[config] Démarrage impossible : ${message}`,
      booleen: (nom, brut) => `${nom} doit valoir true ou false (reçu : "${brut}").`,
      entier: (nom, min, brut) => `${nom} doit être un entier ≥ ${min} (reçu : "${brut}").`,
      secretAbsent:
        'SESSION_SECRET est absent. Génère-le avec « openssl rand -base64 48 » ' +
        'et renseigne-le dans le fichier .env.',
      secretJetable:
        '[config] SESSION_SECRET absent : secret temporaire généré pour le ' +
        'développement. Les sessions seront invalidées à chaque redémarrage.',
      secretCourt: (longueur, minimum) =>
        `SESSION_SECRET fait ${longueur} caractères, ${minimum} au minimum sont requis.`,
      trustProxyAveugle:
        'TRUST_PROXY=true fait aveuglément confiance à tous les en-têtes ' +
        'X-Forwarded-For, ce qui permet de contourner le rate-limit. Indique le ' +
        'nombre de proxies (2 derrière Nginx Proxy Manager, 1 en accès direct).',
      compteSansIdentifiant: (index) =>
        `MINKA_USER${index}_PASSWORD est renseigné mais MINKA_USER${index}_USERNAME est vide.`,
      motDePasseCourt: (index, username) =>
        `MINKA_USER${index}_PASSWORD doit faire au moins 8 caractères ` +
        `(compte « ${username} »). Un compte sans mot de passe utilisable serait inaccessible.`,
    },

    serveur: {
      portOccupe: (port) => `le port ${port} est déjà occupé`,
      demarrageImpossible: (raison) => `[server] Démarrage impossible : ${raison}`,
      echecDemarrage: '[server] Démarrage impossible :',
      ecoute: (port, env) => `[server] Minka écoute sur le port ${port} (${env}).`,
      arret: (signal) => `[server] ${signal} reçu, arrêt en cours…`,
      moduleMonte: (nom, chemin, public_) =>
        `[modules] ${nom} monté sur ${chemin}${public_ ? ' (accès public)' : ''}`,
    },

    migrations: {
      appliquee: (id) => `[migrate] appliquée : ${id}`,
      aJour: '[migrate] schéma déjà à jour.',
    },

    membres: {
      comptesAjoutes: (nombre) => `[people] ${nombre} compte(s) ajouté(s) aux membres du foyer.`,
    },

    schemas: {
      dateFormat: 'La date doit être au format AAAA-MM-JJ.',
      dateInexistante: "Cette date n'existe pas.",
      heureFormat: "L'heure doit être au format HH:MM.",
    },

    erreurs: {
      sessionAbsente: 'Session absente ou expirée, reconnecte-toi.',
      routeInconnue: (methode, url) => `Route inconnue : ${methode} ${url}`,
      jsonInvalide: 'Corps de requête JSON invalide.',
      interne: 'Une erreur interne est survenue.',
      origineInvalide: 'En-tête Origin invalide.',
      origineNonAutorisee: 'Origine non autorisée.',
      origineEtrangere: "L'origine de la requête ne correspond pas au domaine de l'application.",
      donneesInvalides: 'Données invalides.',
    },
  },

  en: {
    config: {
      demarrageImpossible: (message) => `[config] Cannot start: ${message}`,
      booleen: (nom, brut) => `${nom} must be true or false (got "${brut}").`,
      entier: (nom, min, brut) => `${nom} must be an integer ≥ ${min} (got "${brut}").`,
      secretAbsent:
        'SESSION_SECRET is missing. Generate one with "openssl rand -base64 48" ' +
        'and set it in the .env file.',
      secretJetable:
        '[config] SESSION_SECRET is missing: a temporary secret was generated for ' +
        'development. Sessions will be invalidated on every restart.',
      secretCourt: (longueur, minimum) =>
        `SESSION_SECRET is ${longueur} characters long; at least ${minimum} are required.`,
      trustProxyAveugle:
        'TRUST_PROXY=true blindly trusts every X-Forwarded-For header, which lets ' +
        'anyone get around the login rate limit. Set the number of proxies instead ' +
        '(2 behind a reverse proxy, 1 for direct access).',
      compteSansIdentifiant: (index) =>
        `MINKA_USER${index}_PASSWORD is set but MINKA_USER${index}_USERNAME is empty.`,
      motDePasseCourt: (index, username) =>
        `MINKA_USER${index}_PASSWORD must be at least 8 characters long ` +
        `(account "${username}"). An account without a usable password could never sign in.`,
    },

    serveur: {
      portOccupe: (port) => `port ${port} is already in use`,
      demarrageImpossible: (raison) => `[server] Cannot start: ${raison}`,
      echecDemarrage: '[server] Cannot start:',
      ecoute: (port, env) => `[server] Minka is listening on port ${port} (${env}).`,
      arret: (signal) => `[server] ${signal} received, shutting down…`,
      moduleMonte: (nom, chemin, public_) =>
        `[modules] ${nom} mounted on ${chemin}${public_ ? ' (public access)' : ''}`,
    },

    migrations: {
      appliquee: (id) => `[migrate] applied: ${id}`,
      aJour: '[migrate] schema already up to date.',
    },

    membres: {
      comptesAjoutes: (nombre) =>
        `[people] ${nombre} account${nombre > 1 ? 's' : ''} added to the household members.`,
    },

    schemas: {
      dateFormat: 'The date must use the YYYY-MM-DD format.',
      dateInexistante: 'This date does not exist.',
      heureFormat: 'The time must use the HH:MM format.',
    },

    erreurs: {
      sessionAbsente: 'Your session is missing or has expired. Please sign in again.',
      routeInconnue: (methode, url) => `Unknown route: ${methode} ${url}`,
      jsonInvalide: 'Invalid JSON request body.',
      interne: 'An internal error occurred.',
      origineInvalide: 'Invalid Origin header.',
      origineNonAutorisee: 'Origin not allowed.',
      origineEtrangere: "The request's origin does not match the application's domain.",
      donneesInvalides: 'Invalid data.',
    },
  },
};

export const T = textes(TEXTES);
