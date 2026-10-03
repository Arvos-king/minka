import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    introuvable: "Cette tâche n'existe plus.",
    echeanceRequise: 'Une tâche qui se répète a besoin d’une échéance.',

    schemas: {
      intituleRequis: "L'intitulé est requis.",
      intituleTropLong: "L'intitulé est trop long.",
      rythmeInconnu: 'Rythme de répétition inconnu.',
      noteTropLongue: 'La note est trop longue.',
      echeanceDeDepart: 'Une tâche qui se répète a besoin d’une échéance de départ.',
    },
  },

  en: {
    introuvable: 'This task no longer exists.',
    echeanceRequise: 'A repeating task needs a due date.',

    schemas: {
      intituleRequis: 'The title is required.',
      intituleTropLong: 'The title is too long.',
      rythmeInconnu: 'Unknown repeat interval.',
      noteTropLongue: 'The note is too long.',
      echeanceDeDepart: 'A repeating task needs a starting due date.',
    },
  },
};

export const T = textes(TEXTES);
