import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    nomRequis: 'Le nom est requis.',
    nomTropLong: 'Le nom est trop long.',
    introuvable: "Ce membre du foyer n'existe plus.",
    aUnCompte: 'Ce membre correspond à un compte de connexion et ne peut pas être retiré.',
  },

  en: {
    nomRequis: 'The name is required.',
    nomTropLong: 'The name is too long.',
    introuvable: 'This household member no longer exists.',
    aUnCompte: 'This member has a sign-in account and cannot be removed.',
  },
};

export const T = textes(TEXTES);
