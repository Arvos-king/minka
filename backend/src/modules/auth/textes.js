import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    tropDeTentatives: 'Trop de tentatives de connexion. Réessaie dans quelques minutes.',
    identifiantsIncorrects: 'Identifiant ou mot de passe incorrect.',
    motDePasseActuelIncorrect: 'Le mot de passe actuel est incorrect.',

    schemas: {
      motDePasseCourt: 'Le mot de passe doit faire au moins 8 caractères.',
      identifiantRequis: "L'identifiant est requis.",
      motDePasseRequis: 'Le mot de passe est requis.',
      motDePasseActuelRequis: 'Le mot de passe actuel est requis.',
    },

    journal: {
      tropDeTentatives: (ip) => `[auth] trop de tentatives de connexion depuis ${ip}`,
      echec: (username, ip) => `[auth] échec de connexion pour « ${username} » depuis ${ip}`,
      aucunCompte:
        '[auth] Aucun compte en base et aucun compte déclaré dans ' +
        "l'environnement : personne ne pourra se connecter. Renseigne " +
        'MINKA_USER1_USERNAME et MINKA_USER1_PASSWORD dans le fichier .env.',
      compteCree: (username, displayName) => `[auth] compte créé : ${username} (${displayName})`,
    },
  },

  en: {
    tropDeTentatives: 'Too many sign-in attempts. Please try again in a few minutes.',
    identifiantsIncorrects: 'Incorrect username or password.',
    motDePasseActuelIncorrect: 'The current password is incorrect.',

    schemas: {
      motDePasseCourt: 'The password must be at least 8 characters long.',
      identifiantRequis: 'The username is required.',
      motDePasseRequis: 'The password is required.',
      motDePasseActuelRequis: 'The current password is required.',
    },

    journal: {
      tropDeTentatives: (ip) => `[auth] too many sign-in attempts from ${ip}`,
      echec: (username, ip) => `[auth] failed sign-in for "${username}" from ${ip}`,
      aucunCompte:
        '[auth] No account in the database and none declared in the ' +
        'environment: nobody will be able to sign in. Set ' +
        'MINKA_USER1_USERNAME and MINKA_USER1_PASSWORD in the .env file.',
      compteCree: (username, displayName) => `[auth] account created: ${username} (${displayName})`,
    },
  },
};

export const T = textes(TEXTES);
