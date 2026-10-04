import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    repasDeplace: "Ce repas n'est plus à sa place : le planning a changé entre-temps.",
    planningChange: 'Le planning a changé entre-temps.',

    schemas: {
      moment: 'Le moment doit être « midi » ou « soir ».',
      intituleRequis: 'Indique ce qui est prévu.',
      texteTropLong: 'Ce texte est trop long.',
      dejaDansCetteCase: 'Le repas est déjà dans cette case.',
      aucuneCase: 'Aucune case à fixer.',
      tropDeCases: 'Trop de cases d’un coup.',
      caseEnDouble: 'Une même case figure deux fois.',
      aucunRepas: 'Aucun repas à importer.',
      quatorzeRepas: 'Une semaine compte au plus quatorze repas.',
    },
  },

  en: {
    repasDeplace: 'This meal is no longer where it was: the plan changed in the meantime.',
    planningChange: 'The plan changed in the meantime.',

    schemas: {
      // Les clés restent françaises : ce sont des identifiants de l'API.
      moment: 'The slot must be "midi" (lunch) or "soir" (dinner).',
      intituleRequis: 'Say what is planned.',
      texteTropLong: 'This text is too long.',
      dejaDansCetteCase: 'The meal is already in this slot.',
      aucuneCase: 'No slots to set.',
      tropDeCases: 'Too many slots at once.',
      caseEnDouble: 'The same slot appears twice.',
      aucunRepas: 'No meals to import.',
      quatorzeRepas: 'A week has at most fourteen meals.',
    },
  },
};

export const T = textes(TEXTES);
