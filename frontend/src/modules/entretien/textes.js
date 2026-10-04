import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    module: { label: 'Entretien', description: 'Ce que la maison réclame' },

    sections: { enRetard: 'En retard', bientot: 'Cette semaine', plusTard: 'Plus tard' },
    touteLaMaison: 'Toute la maison',
    aucuneIntervention: 'Aucune intervention',
    aideVide: "Le planning de départ se pose au premier démarrage de l'API.",
    rienCetteSemaine: 'Rien à faire cette semaine.',
    rienDansCettePiece: 'Rien de prévu dans cette pièce.',
    nouvelle: 'Nouvelle intervention',
    marquerFait: (label) => `Marquer « ${label} » comme fait`,

    feuille: {
      regler: "Régler l'intervention",
      nouvelle: 'Nouvelle intervention',
      placeholder: 'Détartrer la machine à espresso',
      aFaire: "Ce qu'il y a à faire",
      piece: 'Pièce',
      rythme: 'Rythme',
      prochaineFois: 'Prochaine fois',
      dernierPassage: (date) => `Dernier passage : ${date}`,
      quiSEnOccupe: "Qui s'en occupe ?",
      quiVeut: 'Qui veut',
      notePlaceholder: 'Note (référence du filtre, numéro du chauffagiste…)',
      pasMaintenant: 'Pas maintenant',
      dansUneSemaine: 'Dans une semaine',
      dansUnMois: 'Dans un mois',
      retirer: 'Retirer du planning',
    },

    echeance: {
      hier: 'Hier',
      retardJours: (n) => `En retard de ${n} j`,
      retardSemaines: (n) => `En retard de ${n} sem.`,
      retardMois: (n) => `En retard de ${n} mois`,
      aujourdhui: "Aujourd'hui",
      demain: 'Demain',
      dans: (n) => `Dans ${n} j`,
    },

    rythmes: {
      weekly: 'Chaque semaine',
      monthly: 'Chaque mois',
      quarterly: 'Tous les trois mois',
      biannual: 'Tous les six mois',
      yearly: 'Chaque année',
    },
  },

  en: {
    module: { label: 'Maintenance', description: 'What the house needs' },

    sections: { enRetard: 'Overdue', bientot: 'This week', plusTard: 'Later' },
    touteLaMaison: 'Whole house',
    aucuneIntervention: 'No jobs',
    aideVide: 'The starter plan is created the first time the API starts.',
    rienCetteSemaine: 'Nothing to do this week.',
    rienDansCettePiece: 'Nothing planned in this room.',
    nouvelle: 'New job',
    marquerFait: (label) => `Mark “${label}” as done`,

    feuille: {
      regler: 'Adjust the job',
      nouvelle: 'New job',
      placeholder: 'Descale the espresso machine',
      aFaire: 'What needs doing',
      piece: 'Room',
      rythme: 'How often',
      prochaineFois: 'Next time',
      dernierPassage: (date) => `Last done: ${date}`,
      quiSEnOccupe: 'Who takes care of it?',
      quiVeut: 'Whoever',
      notePlaceholder: 'Note (filter reference, heating engineer’s number…)',
      pasMaintenant: 'Not now',
      dansUneSemaine: 'In a week',
      dansUnMois: 'In a month',
      retirer: 'Remove from the plan',
    },

    echeance: {
      hier: 'Yesterday',
      retardJours: (n) => `${n} days overdue`,
      retardSemaines: (n) => `${n} weeks overdue`,
      retardMois: (n) => `${n} months overdue`,
      aujourdhui: 'Today',
      demain: 'Tomorrow',
      dans: (n) => `In ${n} days`,
    },

    rythmes: {
      weekly: 'Every week',
      monthly: 'Every month',
      quarterly: 'Every three months',
      biannual: 'Every six months',
      yearly: 'Every year',
    },
  },
};

export const T = textes(TEXTES);
