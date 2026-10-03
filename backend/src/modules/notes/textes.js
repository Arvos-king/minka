import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    introuvable: "Cette note n'existe plus.",
    conflit: 'Cette note a été modifiée entre-temps.',

    schemas: {
      titreTropLong: 'Le titre est trop long.',
      noteTropLongue: 'Cette note est trop longue.',
    },
  },

  en: {
    introuvable: 'This note no longer exists.',
    conflit: 'This note was changed in the meantime.',

    schemas: {
      titreTropLong: 'The title is too long.',
      noteTropLongue: 'This note is too long.',
    },
  },
};

export const T = textes(TEXTES);
