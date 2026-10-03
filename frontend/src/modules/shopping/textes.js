import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    module: {
      label: 'Liste de courses',
      // Le libellé complet ne tient pas sous une icône d'onglet.
      shortLabel: 'Courses',
      description: "Ce qu'il faut acheter",
    },

    rienAAcheter: 'Rien à acheter',
    aAcheter: (n) => `${n} article${n > 1 ? 's' : ''} à acheter`,
    listeVide: 'La liste est vide',
    aideAjout: "Ajoute un article avec le champ en bas de l'écran.",
    malRange: "Mal rangé ? Appuie longuement sur l'article pour changer son rayon.",
    dejaPris: (n) => `Déjà pris (${n})`,
    supprimerPris: (n) => (n > 1 ? `Supprimer les ${n} articles` : "Supprimer l'article"),
    viderPris: 'Vider les articles achetés',

    formulaire: {
      placeholder: 'Ajouter un article…',
      nom: "Nom de l'article à ajouter",
    },

    ligne: {
      ranger: 'Ranger dans un rayon',
      supprimer: (nom) => `Supprimer ${nom}`,
      reduire: (nom) => `Réduire la quantité de ${nom}`,
      quantite: (n) => `Quantité : ${n}`,
      augmenter: (nom) => `Augmenter la quantité de ${nom}`,
    },

    rayon: {
      dialogue: 'Ranger dans un rayon',
      titre: 'Ranger dans…',
      vaudraAussi: (nom) => `Le choix vaudra aussi pour les prochains « ${nom} ».`,
    },
  },

  en: {
    module: {
      label: 'Shopping list',
      shortLabel: 'Shopping',
      description: 'What we need to buy',
    },

    rienAAcheter: 'Nothing to buy',
    aAcheter: (n) => `${n} item${n > 1 ? 's' : ''} to buy`,
    listeVide: 'The list is empty',
    aideAjout: 'Add an item with the field at the bottom of the screen.',
    malRange: 'In the wrong aisle? Press and hold the item to move it.',
    dejaPris: (n) => `In the basket (${n})`,
    supprimerPris: (n) => (n > 1 ? `Delete the ${n} items` : 'Delete the item'),
    viderPris: 'Clear bought items',

    formulaire: {
      placeholder: 'Add an item…',
      nom: 'Name of the item to add',
    },

    ligne: {
      ranger: 'Move to an aisle',
      supprimer: (nom) => `Delete ${nom}`,
      reduire: (nom) => `Decrease the quantity of ${nom}`,
      quantite: (n) => `Quantity: ${n}`,
      augmenter: (nom) => `Increase the quantity of ${nom}`,
    },

    rayon: {
      dialogue: 'Move to an aisle',
      titre: 'Move to…',
      vaudraAussi: (nom) => `This choice will also apply to future “${nom}”.`,
    },
  },
};

export const T = textes(TEXTES);
