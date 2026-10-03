/**
 * Textes du socle de l'interface : connexion, compte, en-tête, onglets,
 * bandeaux, tableau de bord, membres du foyer.
 *
 * Chaque module tient les siens dans son propre `textes.js` et peut puiser
 * ici ce qui est commun à tous (`commun`). Les deux langues doivent porter
 * exactement les mêmes clés — `lib/langue.test.js` y veille, pour tous les
 * dictionnaires à la fois.
 */

import { textes } from './lib/langue.js';

export const TEXTES = {
  fr: {
    commun: {
      fermer: 'Fermer',
      enregistrer: 'Enregistrer',
    },

    slogan: 'La maison, en un seul endroit.',
    chargement: 'Chargement…',

    entete: {
      monCompte: 'Mon compte',
      revenir: 'Revenir en arrière',
    },

    onglets: {
      navigation: 'Navigation principale',
      accueil: 'Accueil',
      plus: 'Plus',
    },

    horsLigne: {
      titre: 'Hors ligne',
      donnees: (anciennete) => ` — données ${anciennete}`,
      modifications: 'Les modifications ne seront pas enregistrées.',
    },

    anciennete: {
      instant: "à l'instant",
      minutes: (n) => `il y a ${n} min`,
      heures: (n) => `il y a ${n} h`,
      hier: 'hier',
      jours: (n) => `il y a ${n} j`,
    },

    miseAJour: {
      disponible: 'Une nouvelle version de Minka est disponible.',
      appliquer: 'Mettre à jour',
    },

    reseau: {
      injoignable: 'Connexion au serveur impossible.',
      erreur: (status) => `Erreur ${status}.`,
    },

    connexion: {
      identifiant: 'Identifiant',
      motDePasse: 'Mot de passe',
      seConnecter: 'Se connecter',
      espacePrive: 'Espace privé. Les comptes sont créés depuis le serveur.',
    },

    compte: {
      changerMotDePasse: 'Changer de mot de passe',
      motDePasseActuel: 'Mot de passe actuel',
      nouveauMotDePasse: 'Nouveau mot de passe',
      huitCaracteres: '8 caractères minimum.',
      motDePasseMisAJour: 'Mot de passe mis à jour.',
      seDeconnecter: 'Se déconnecter',
    },

    accueil: {
      salutation: (heure) => (heure < 5 ? 'Bonne nuit' : heure < 18 ? 'Bonjour' : 'Bonsoir'),
      question: 'Que veux-tu ouvrir ?',
      aucunModule: 'Aucun module pour le moment',
      premierModule: "Le premier — la liste de courses — arrive à l'étape suivante.",
    },

    membres: {
      titre: 'Membres du foyer',
      dialogue: 'Participants',
      intro: "Les personnes à qui attribuer un événement ou une tâche, qu'elles aient un compte ou non.",
      nomDe: (nom) => `Nom de ${nom}`,
      aUnCompte: 'Ce participant a un compte de connexion',
      compte: 'Compte',
      retirer: (nom) => `Retirer ${nom}`,
      ajouterQuelquun: "Ajouter quelqu'un…",
      nomAAjouter: 'Nom de la personne à ajouter',
      ajouter: 'Ajouter la personne',
      retraitSansPerte:
        "Retirer quelqu'un ne supprime pas ses événements ni ses tâches : ils passent sur " +
        '« tout le monde ».',
      toutLeMonde: 'Tout le monde',
      inconnu: 'Inconnu',
    },
  },

  en: {
    commun: {
      fermer: 'Close',
      enregistrer: 'Save',
    },

    slogan: 'Your home, all in one place.',
    chargement: 'Loading…',

    entete: {
      monCompte: 'My account',
      revenir: 'Go back',
    },

    onglets: {
      navigation: 'Main navigation',
      accueil: 'Home',
      plus: 'More',
    },

    horsLigne: {
      titre: 'Offline',
      donnees: (anciennete) => ` — last updated ${anciennete}`,
      modifications: 'Changes will not be saved.',
    },

    anciennete: {
      instant: 'just now',
      minutes: (n) => `${n} min ago`,
      heures: (n) => `${n} h ago`,
      hier: 'yesterday',
      jours: (n) => `${n} days ago`,
    },

    miseAJour: {
      disponible: 'A new version of Minka is available.',
      appliquer: 'Update',
    },

    reseau: {
      injoignable: 'Cannot reach the server.',
      erreur: (status) => `Error ${status}.`,
    },

    connexion: {
      identifiant: 'Username',
      motDePasse: 'Password',
      seConnecter: 'Sign in',
      espacePrive: 'Private space. Accounts are created on the server.',
    },

    compte: {
      changerMotDePasse: 'Change password',
      motDePasseActuel: 'Current password',
      nouveauMotDePasse: 'New password',
      huitCaracteres: 'At least 8 characters.',
      motDePasseMisAJour: 'Password updated.',
      seDeconnecter: 'Sign out',
    },

    accueil: {
      // « Good night » prend congé en anglais, il ne salue pas : la nuit, on
      // dit simplement bonjour.
      salutation: (heure) =>
        heure < 5 ? 'Hello' : heure < 12 ? 'Good morning' : heure < 18 ? 'Good afternoon' : 'Good evening',
      question: 'What would you like to open?',
      aucunModule: 'No modules yet',
      premierModule: 'The first one — the shopping list — is coming in the next step.',
    },

    membres: {
      titre: 'Household members',
      dialogue: 'Members',
      intro: 'The people you can assign an event or a task to, whether or not they have an account.',
      nomDe: (nom) => `Name of ${nom}`,
      aUnCompte: 'This member has a sign-in account',
      compte: 'Account',
      retirer: (nom) => `Remove ${nom}`,
      ajouterQuelquun: 'Add someone…',
      nomAAjouter: 'Name of the person to add',
      ajouter: 'Add this person',
      retraitSansPerte:
        'Removing someone does not delete their events or tasks: they move to “everyone”.',
      toutLeMonde: 'Everyone',
      inconnu: 'Unknown',
    },
  },
};

export const T = textes(TEXTES);
