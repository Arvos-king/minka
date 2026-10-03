import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    module: { label: 'Budget', description: 'Où part l’argent du mois' },

    moisPrecedent: 'Mois précédent',
    moisSuivant: 'Mois suivant',
    revenirAuMoisCourant: 'Revenir à ce mois-ci',
    aucuneDepense: 'Aucune dépense ce mois-ci',
    depenses: (n) => `${n} dépense${n > 1 ? 's' : ''}`,
    parCategorie: 'Par catégorie',
    aucuneCategorie:
      'Aucune catégorie. Sans elles, le total du mois reste juste ; avec, on voit où il part.',
    sansCategorie: 'Sans catégorie',
    leDetail: 'Le détail',
    rienDeNote: 'Rien de noté',
    aideAjout: 'Le montant et deux mots suffisent ; le reste se précise plus tard.',

    saisie: {
      montantExemple: '12,50',
      montant: 'Montant',
      libelleExemple: 'Boulangerie…',
      ceQueCEtait: "Ce que c'était",
      ajouter: 'Ajouter la dépense',
    },

    partDuPlafond: (label, pourcent) => `${label} : ${pourcent} % du plafond`,

    categories: {
      plafondIllisible: 'Ce plafond ne se lit pas.',
      gerer: 'Gérer les catégories',
      titre: 'Catégories',
      intro: 'Le plafond est facultatif : sans lui, la catégorie compte sans juger.',
      nom: 'Nom de la catégorie',
      plafond: 'Plafond',
      plafondMensuel: 'Plafond mensuel (facultatif)',
      ceMoisCi: (montant) => `${montant} ce mois-ci`,
      plafondDe: (montant) => ` · plafond ${montant}`,
      supprimerNommee: (label) => `Supprimer ${label}`,
      confirmerSuppression: (label) =>
        `Supprimer « ${label} » ? Ses dépenses restent comptées, mais perdent leur étiquette.`,
      nouvelle: 'Nouvelle catégorie',
      exemple: 'Restaurants',
      nomNouvelle: 'Nom de la nouvelle catégorie',
    },

    depense: {
      montantIllisible: 'Ce montant ne se lit pas.',
      leFoyer: 'Le foyer',
      modifier: 'Modifier la dépense',
      categorie: 'Catégorie',
      quiAPaye: 'Qui a payé ?',
      supprimer: 'Supprimer la dépense',
    },
  },

  en: {
    module: { label: 'Budget', description: 'Where the money goes each month' },

    moisPrecedent: 'Previous month',
    moisSuivant: 'Next month',
    revenirAuMoisCourant: 'Back to this month',
    aucuneDepense: 'No expenses this month',
    depenses: (n) => `${n} expense${n > 1 ? 's' : ''}`,
    parCategorie: 'By category',
    aucuneCategorie:
      'No categories. The monthly total is right without them; with them, you see where it goes.',
    sansCategorie: 'Uncategorised',
    leDetail: 'Details',
    rienDeNote: 'Nothing recorded',
    aideAjout: 'An amount and a couple of words are enough; the rest can wait.',

    saisie: {
      montantExemple: '12.50',
      montant: 'Amount',
      libelleExemple: 'Bakery…',
      ceQueCEtait: 'What it was',
      ajouter: 'Add the expense',
    },

    partDuPlafond: (label, pourcent) => `${label}: ${pourcent}% of the limit`,

    categories: {
      plafondIllisible: 'This limit is not a valid amount.',
      gerer: 'Manage categories',
      titre: 'Categories',
      intro: 'The limit is optional: without one, the category just keeps count.',
      nom: 'Category name',
      plafond: 'Limit',
      plafondMensuel: 'Monthly limit (optional)',
      ceMoisCi: (montant) => `${montant} this month`,
      plafondDe: (montant) => ` · limit ${montant}`,
      supprimerNommee: (label) => `Delete ${label}`,
      confirmerSuppression: (label) =>
        `Delete “${label}”? Its expenses still count, but lose their category.`,
      nouvelle: 'New category',
      exemple: 'Restaurants',
      nomNouvelle: 'Name of the new category',
    },

    depense: {
      montantIllisible: 'This amount is not valid.',
      leFoyer: 'The household',
      modifier: 'Edit expense',
      categorie: 'Category',
      quiAPaye: 'Who paid?',
      supprimer: 'Delete the expense',
    },
  },
};

export const T = textes(TEXTES);
