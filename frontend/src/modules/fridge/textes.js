import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    module: { label: 'Frigo', description: 'Ce qui reste, et ce qui périme' },

    perimes: (n) => (n === 1 ? '1 produit est périmé' : `${n} produits sont périmés`),
    aConsommer: (n) =>
      n === 1 ? '1 produit est à consommer rapidement' : `${n} produits sont à consommer rapidement`,
    frigoVide: 'Frigo vide',
    produits: (n) => `${n} produit${n > 1 ? 's' : ''}`,
    rienDansLeFrigo: 'Rien dans le frigo',
    aideAjout: "Ajoute un produit avec le champ en bas de l'écran.",

    formulaire: {
      raccourcis: { sansDate: 'Sans date', troisJours: '3 j', semaine: '1 sem.', mois: '1 mois' },
      datePrecise: 'Date de péremption précise',
      placeholder: 'Ajouter un produit…',
      nomAAjouter: 'Nom du produit à ajouter',
    },

    ligne: {
      reduire: (nom) => `Réduire la quantité de ${nom}`,
      retirer: (nom) => `Retirer ${nom}`,
      quantite: (n) => `Quantité : ${n}`,
      augmenter: (nom) => `Augmenter la quantité de ${nom}`,
      datePeremption: (nom) => `Date de péremption de ${nom}`,
      retirerLaDate: 'Retirer la date',
      ajoute: 'Ajouté',
      auxCourses: 'Aux courses',
    },

    peremption: {
      perimeHier: 'Périmé hier',
      perimeDepuis: (n) => `Périmé depuis ${n} j`,
      aujourdhui: "Aujourd'hui",
      demain: 'Demain',
      dans: (n) => `Dans ${n} j`,
    },
  },

  en: {
    module: { label: 'Fridge', description: 'What’s left, and what’s going off' },

    perimes: (n) => (n === 1 ? '1 product is past its date' : `${n} products are past their date`),
    aConsommer: (n) => (n === 1 ? '1 product should be eaten soon' : `${n} products should be eaten soon`),
    frigoVide: 'Fridge empty',
    produits: (n) => `${n} product${n > 1 ? 's' : ''}`,
    rienDansLeFrigo: 'Nothing in the fridge',
    aideAjout: 'Add a product with the field at the bottom of the screen.',

    formulaire: {
      raccourcis: { sansDate: 'No date', troisJours: '3 days', semaine: '1 week', mois: '1 month' },
      datePrecise: 'Exact use-by date',
      placeholder: 'Add a product…',
      nomAAjouter: 'Name of the product to add',
    },

    ligne: {
      reduire: (nom) => `Decrease the quantity of ${nom}`,
      retirer: (nom) => `Remove ${nom}`,
      quantite: (n) => `Quantity: ${n}`,
      augmenter: (nom) => `Increase the quantity of ${nom}`,
      datePeremption: (nom) => `Use-by date of ${nom}`,
      retirerLaDate: 'Remove the date',
      ajoute: 'Added',
      auxCourses: 'Add to shopping',
    },

    peremption: {
      perimeHier: 'Expired yesterday',
      perimeDepuis: (n) => `Expired ${n} days ago`,
      aujourdhui: 'Today',
      demain: 'Tomorrow',
      dans: (n) => `In ${n} days`,
    },
  },
};

export const T = textes(TEXTES);
