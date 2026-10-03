import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    introuvable: "Cet événement n'existe plus.",

    schemas: {
      intituleRequis: "L'intitulé est requis.",
      intituleTropLong: "L'intitulé est trop long.",
      noteTropLongue: 'La note est trop longue.',
      finAvantDebut: 'La fin ne peut pas précéder le début.',
      heureFinAvantDebut: "L'heure de fin doit suivre l'heure de début.",
      heureFinSansDebut: "Indique une heure de début, ou retire l'heure de fin.",
    },
  },

  en: {
    introuvable: 'This event no longer exists.',

    schemas: {
      intituleRequis: 'The title is required.',
      intituleTropLong: 'The title is too long.',
      noteTropLongue: 'The note is too long.',
      finAvantDebut: 'The end cannot come before the start.',
      heureFinAvantDebut: 'The end time must come after the start time.',
      heureFinSansDebut: 'Set a start time, or remove the end time.',
    },
  },
};

export const T = textes(TEXTES);
