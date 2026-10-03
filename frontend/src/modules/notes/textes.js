import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    module: { label: 'Notes', description: 'Ce qu’on ne veut pas oublier' },

    aucuneNote: 'Aucune note',
    aideVide: "Codes, mesures, idées de cadeaux : tout ce qui n'a pas sa place ailleurs.",
    epinglees: 'Épinglées',
    lesAutres: 'Les autres',
    nouvelle: 'Nouvelle note',
    sansTitre: 'Note sans titre',
    cetteNote: 'cette note',
    epingler: (titre) => `Épingler ${titre}`,
    detacher: (titre) => `Détacher ${titre}`,

    editeur: {
      note: 'Note',
      fermer: 'Fermer la note',
      epingler: 'Épingler la note',
      detacher: 'Détacher la note',
      enAttente: 'Modifications en attente…',
      envoi: 'Enregistrement…',
      enregistre: 'Enregistré',
      conflit: 'Cette note a été modifiée ailleurs pendant que tu écrivais.',
      voirLeurVersion: 'Voir leur version',
      garderMonTexte: 'Garder mon texte',
      titrePlaceholder: 'Titre (facultatif)',
      titre: 'Titre de la note',
      corpsPlaceholder: 'Écris ici…',
      corps: 'Contenu de la note',
      supprimerLaNote: 'Supprimer la note',
    },

    modification: {
      instant: "à l'instant",
      minutes: (n) => `il y a ${n} min`,
      heures: (n) => `il y a ${n} h`,
      hier: 'hier',
      le: (date) => `le ${date}`,
    },
  },

  en: {
    module: { label: 'Notes', description: 'What we don’t want to forget' },

    aucuneNote: 'No notes',
    aideVide: 'Codes, measurements, gift ideas: anything that has no other home.',
    epinglees: 'Pinned',
    lesAutres: 'Others',
    nouvelle: 'New note',
    sansTitre: 'Untitled note',
    cetteNote: 'this note',
    epingler: (titre) => `Pin ${titre}`,
    detacher: (titre) => `Unpin ${titre}`,

    editeur: {
      note: 'Note',
      fermer: 'Close the note',
      epingler: 'Pin the note',
      detacher: 'Unpin the note',
      enAttente: 'Changes pending…',
      envoi: 'Saving…',
      enregistre: 'Saved',
      conflit: 'This note was changed elsewhere while you were writing.',
      voirLeurVersion: 'See their version',
      garderMonTexte: 'Keep my text',
      titrePlaceholder: 'Title (optional)',
      titre: 'Note title',
      corpsPlaceholder: 'Write here…',
      corps: 'Note content',
      supprimerLaNote: 'Delete the note',
    },

    modification: {
      instant: 'just now',
      minutes: (n) => `${n} min ago`,
      heures: (n) => `${n} h ago`,
      hier: 'yesterday',
      le: (date) => `on ${date}`,
    },
  },
};

export const T = textes(TEXTES);
