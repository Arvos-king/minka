import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    introuvable: "Ce produit n'est plus dans le frigo.",

    schemas: {
      nomRequis: 'Le nom du produit est requis.',
      nomTropLong: 'Le nom est trop long.',
      quantiteEntiere: 'La quantité doit être un nombre entier.',
      quantiteMin: 'La quantité doit être au moins de 1.',
      quantiteMax: 'La quantité ne peut pas dépasser 99.',
    },
  },

  en: {
    introuvable: 'This product is no longer in the fridge.',

    schemas: {
      nomRequis: 'The product name is required.',
      nomTropLong: 'The name is too long.',
      quantiteEntiere: 'The quantity must be a whole number.',
      quantiteMin: 'The quantity must be at least 1.',
      quantiteMax: 'The quantity cannot be more than 99.',
    },
  },
};

export const T = textes(TEXTES);
