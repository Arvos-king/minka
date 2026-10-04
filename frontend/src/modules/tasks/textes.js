import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    module: { label: 'Tâches', description: 'Ce qu’il reste à faire' },

    revient: (titre, date) => `« ${titre} » revient le ${date}.`,
    rienAFaire: 'Rien à faire',
    aFaire: (n) => `${n} tâche${n > 1 ? 's' : ''} à faire`,
    rienPourCettePersonne: 'Rien pour cette personne',
    toutEstFait: 'Tout est fait',
    aideAjout: 'Touche le bouton en bas à droite pour ajouter une tâche.',
    faites: (n) => `Faites (${n})`,
    supprimerFaites: (n) => (n > 1 ? `Supprimer les ${n} tâches` : 'Supprimer la tâche'),
    viderFaites: 'Vider les tâches faites',
    ajouter: 'Ajouter une tâche',
    cocher: (titre) => `Cocher ${titre}`,
    decocher: (titre) => `Décocher ${titre}`,

    feuille: {
      modifier: 'Modifier la tâche',
      nouvelle: 'Nouvelle tâche',
      placeholder: 'Que faut-il faire ?',
      intitule: 'Intitulé',
      aFairePour: 'À faire pour',
      echeancePrecise: 'Échéance précise',
      seRepete: 'Se répète',
      explicationRythme:
        "Une fois cochée, la tâche reviendra à l'échéance suivante au lieu d'être terminée.",
      pourQui: 'Pour qui ?',
      supprimer: 'Supprimer la tâche',
      raccourcis: { sansDate: 'Sans date', aujourdhui: "Aujourd'hui", demain: 'Demain', semaine: '1 sem.' },
    },

    echeance: {
      hier: 'Hier',
      enRetard: (n) => `En retard de ${n} j`,
      aujourdhui: "Aujourd'hui",
      demain: 'Demain',
      dans: (n) => `Dans ${n} j`,
    },

    rythmes: {
      unique: 'Une seule fois',
      daily: 'Chaque jour',
      weekly: 'Chaque semaine',
      monthly: 'Chaque mois',
      quarterly: 'Tous les trois mois',
      biannual: 'Tous les six mois',
      yearly: 'Chaque année',
    },
  },

  en: {
    module: { label: 'Tasks', description: 'What is left to do' },

    revient: (titre, date) => `“${titre}” comes back on ${date}.`,
    rienAFaire: 'Nothing to do',
    aFaire: (n) => `${n} task${n > 1 ? 's' : ''} to do`,
    rienPourCettePersonne: 'Nothing for this person',
    toutEstFait: 'All done',
    aideAjout: 'Tap the button at the bottom right to add a task.',
    faites: (n) => `Done (${n})`,
    supprimerFaites: (n) => (n > 1 ? `Delete the ${n} tasks` : 'Delete the task'),
    viderFaites: 'Clear done tasks',
    ajouter: 'Add a task',
    cocher: (titre) => `Check off ${titre}`,
    decocher: (titre) => `Uncheck ${titre}`,

    feuille: {
      modifier: 'Edit task',
      nouvelle: 'New task',
      placeholder: 'What needs doing?',
      intitule: 'Title',
      aFairePour: 'Due',
      echeancePrecise: 'Exact due date',
      seRepete: 'Repeats',
      explicationRythme:
        'Once checked off, the task comes back at its next due date instead of being finished.',
      pourQui: 'Who for?',
      supprimer: 'Delete task',
      raccourcis: { sansDate: 'No date', aujourdhui: 'Today', demain: 'Tomorrow', semaine: '1 week' },
    },

    echeance: {
      hier: 'Yesterday',
      enRetard: (n) => `${n} days overdue`,
      aujourdhui: 'Today',
      demain: 'Tomorrow',
      dans: (n) => `In ${n} days`,
    },

    rythmes: {
      unique: 'Once',
      daily: 'Every day',
      weekly: 'Every week',
      monthly: 'Every month',
      quarterly: 'Every three months',
      biannual: 'Every six months',
      yearly: 'Every year',
    },
  },
};

export const T = textes(TEXTES);
