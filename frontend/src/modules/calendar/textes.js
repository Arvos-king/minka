import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    module: { label: 'Calendrier', description: 'Ce qui nous attend' },

    rienDePrevu: 'Rien de prévu',
    aideAjout: 'Touche le bouton en bas à droite pour ajouter un événement.',
    ajouter: 'Ajouter un événement',
    jourSur: (rang, total) => `jour ${rang}/${total}`,

    feuille: {
      modifier: "Modifier l'événement",
      nouveau: 'Nouvel événement',
      intitule: 'Intitulé',
      journeeEntiere: 'Journée entière',
      heureDebut: 'Heure de début',
      heureFin: 'Heure de fin (facultative)',
      seTermine: 'Se termine le',
      sejour: '(séjour)',
      dateFin: 'Date de fin, pour un événement sur plusieurs jours',
      quiEstConcerne: 'Qui est concerné ?',
      supprimer: "Supprimer l'événement",
    },

    agenda: {
      aujourdhui: "Aujourd'hui",
      demain: 'Demain',
      journee: 'Journée',
    },
  },

  en: {
    module: { label: 'Calendar', description: 'What lies ahead' },

    rienDePrevu: 'Nothing planned',
    aideAjout: 'Tap the button at the bottom right to add an event.',
    ajouter: 'Add an event',
    jourSur: (rang, total) => `day ${rang}/${total}`,

    feuille: {
      modifier: 'Edit event',
      nouveau: 'New event',
      intitule: 'Title',
      journeeEntiere: 'All day',
      heureDebut: 'Start time',
      heureFin: 'End time (optional)',
      seTermine: 'Ends on',
      sejour: '(several days)',
      dateFin: 'End date, for an event spanning several days',
      quiEstConcerne: 'Who is it for?',
      supprimer: 'Delete event',
    },

    agenda: {
      aujourdhui: 'Today',
      demain: 'Tomorrow',
      journee: 'All day',
    },
  },
};

export const T = textes(TEXTES);
