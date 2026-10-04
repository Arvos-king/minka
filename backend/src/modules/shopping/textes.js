import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    introuvable: "Cet article n'existe plus.",

    /** Les libellés des rayons, que l'API envoie avec les articles. */
    rayons: {
      'fruits-legumes': 'Fruits et légumes',
      boulangerie: 'Boulangerie',
      boucherie: 'Boucherie et volaille',
      poissonnerie: 'Poissonnerie',
      'charcuterie-traiteur': 'Charcuterie et traiteur',
      cremerie: 'Crémerie',
      'epicerie-salee': 'Épicerie salée',
      'epicerie-sucree': 'Épicerie sucrée',
      boissons: 'Boissons',
      surgeles: 'Surgelés',
      hygiene: 'Hygiène et beauté',
      entretien: 'Entretien et maison',
      autres: 'Autres',
    },

    schemas: {
      quantiteEntiere: 'La quantité doit être un nombre entier.',
      quantiteMin: 'La quantité doit être au moins de 1.',
      quantiteMax: 'La quantité ne peut pas dépasser 99.',
      nomRequis: "Le nom de l'article est requis.",
      nomTropLong: 'Le nom est trop long.',
      rayonInconnu: "Ce rayon n'existe pas.",
    },

    journal: {
      articlesRanges: (n) => `[shopping] ${n} article(s) rangés au rayon.`,
    },
  },

  en: {
    introuvable: 'This item no longer exists.',

    rayons: {
      'fruits-legumes': 'Fruit and veg',
      boulangerie: 'Bakery',
      boucherie: 'Meat and poultry',
      poissonnerie: 'Fish and seafood',
      'charcuterie-traiteur': 'Deli',
      cremerie: 'Dairy and eggs',
      'epicerie-salee': 'Savoury pantry',
      'epicerie-sucree': 'Sweet pantry',
      boissons: 'Drinks',
      surgeles: 'Frozen',
      hygiene: 'Health and beauty',
      entretien: 'Household',
      autres: 'Other',
    },

    schemas: {
      quantiteEntiere: 'The quantity must be a whole number.',
      quantiteMin: 'The quantity must be at least 1.',
      quantiteMax: 'The quantity cannot be more than 99.',
      nomRequis: 'The item name is required.',
      nomTropLong: 'The name is too long.',
      rayonInconnu: 'This aisle does not exist.',
    },

    journal: {
      articlesRanges: (n) => `[shopping] ${n} item${n > 1 ? 's' : ''} sorted into aisles.`,
    },
  },
};

export const T = textes(TEXTES);
