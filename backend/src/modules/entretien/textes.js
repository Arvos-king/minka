import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    introuvable: "Cette intervention n'existe plus.",
    pieceIntrouvable: "Cette pièce n'existe plus.",
    pieceDejaPrise: 'Une pièce porte déjà ce nom.',

    schemas: {
      libelleRequis: 'Le libellé est requis.',
      libelleTropLong: 'Le libellé est trop long.',
      rythmeInconnu: 'Rythme inconnu.',
      noteTropLongue: 'La note est trop longue.',
      repousserMin: 'Il faut repousser d’au moins un jour.',
      repousserMax: 'Au-delà d’un an, mieux vaut changer le rythme.',
    },

    journal: {
      planningPose: (pieces) => `[entretien] planning de départ posé : ${pieces} pièces.`,
    },
  },

  en: {
    introuvable: 'This maintenance job no longer exists.',
    pieceIntrouvable: 'This room no longer exists.',
    pieceDejaPrise: 'A room with this name already exists.',

    schemas: {
      libelleRequis: 'The label is required.',
      libelleTropLong: 'The label is too long.',
      rythmeInconnu: 'Unknown interval.',
      noteTropLongue: 'The note is too long.',
      repousserMin: 'Postpone by at least one day.',
      repousserMax: 'Beyond a year, better change the interval.',
    },

    journal: {
      planningPose: (pieces) => `[entretien] starter plan created: ${pieces} rooms.`,
    },
  },
};

export const T = textes(TEXTES);
