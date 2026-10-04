import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    depenseIntrouvable: "Cette dépense n'existe plus.",
    categorieIntrouvable: "Cette catégorie n'existe plus.",
    categorieDejaPrise: 'Une catégorie porte déjà ce nom.',

    schemas: {
      libelleRequis: 'Le libellé est requis.',
      libelleTropLong: 'Le libellé est trop long.',
      montantEntier: 'Le montant doit être un nombre entier de centimes.',
      montantPositif: 'Le montant doit être supérieur à zéro.',
      montantDemesure: 'Ce montant est hors de proportion.',
      plafondDemesure: 'Ce plafond est hors de proportion.',
    },
  },

  en: {
    depenseIntrouvable: 'This expense no longer exists.',
    categorieIntrouvable: 'This category no longer exists.',
    categorieDejaPrise: 'A category with this name already exists.',

    schemas: {
      libelleRequis: 'The label is required.',
      libelleTropLong: 'The label is too long.',
      montantEntier: 'The amount must be a whole number of cents.',
      montantPositif: 'The amount must be greater than zero.',
      montantDemesure: 'This amount is implausibly large.',
      plafondDemesure: 'This limit is implausibly large.',
    },
  },
};

export const T = textes(TEXTES);
