import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    introuvable: "Cette recette n'existe plus.",

    schemas: {
      intituleRequis: "L'intitulé de la recette est requis.",
      intituleTropLong: "L'intitulé est trop long.",
      partsEntier: 'Le nombre de parts doit être un entier.',
      partsMin: 'Il faut au moins une part.',
      partsMax: 'Ce nombre de parts est déraisonnable.',
      remarquesTropLongues: 'Ces remarques sont trop longues.',
      etapeVide: 'Une étape ne peut pas être vide.',
      etapeTropLongue: 'Cette étape est trop longue ; coupe-la en deux.',
      tropDEtapes: 'Cette recette a trop d’étapes.',
      etiquetteVide: 'Une étiquette ne peut pas être vide.',
      etiquetteTropLongue: 'Cette étiquette est trop longue.',
      tropDEtiquettes: 'Cette recette a trop d’étiquettes.',
      ingredientRequis: "Le nom de l'ingrédient est requis.",
      nomTropLong: 'Ce nom est trop long.',
      quantiteTropLongue: 'Cette quantité est trop longue.',
      tropDIngredients: 'Cette recette a trop d’ingrédients.',
      identifiants: 'Les identifiants doivent être des nombres séparés par des virgules.',
      tropDeRecettes: 'Trop de recettes demandées d’un coup.',
      aucunPlat: 'Aucun plat à retrouver.',
      tropDePlats: 'Trop de plats d’un coup.',
    },
  },

  en: {
    introuvable: 'This recipe no longer exists.',

    schemas: {
      intituleRequis: 'The recipe title is required.',
      intituleTropLong: 'The title is too long.',
      partsEntier: 'The number of servings must be a whole number.',
      partsMin: 'There must be at least one serving.',
      partsMax: 'This number of servings is unreasonable.',
      remarquesTropLongues: 'These notes are too long.',
      etapeVide: 'A step cannot be empty.',
      etapeTropLongue: 'This step is too long; split it in two.',
      tropDEtapes: 'This recipe has too many steps.',
      etiquetteVide: 'A tag cannot be empty.',
      etiquetteTropLongue: 'This tag is too long.',
      tropDEtiquettes: 'This recipe has too many tags.',
      ingredientRequis: 'The ingredient name is required.',
      nomTropLong: 'This name is too long.',
      quantiteTropLongue: 'This quantity is too long.',
      tropDIngredients: 'This recipe has too many ingredients.',
      identifiants: 'The ids must be numbers separated by commas.',
      tropDeRecettes: 'Too many recipes requested at once.',
      aucunPlat: 'No dish to look up.',
      tropDePlats: 'Too many dishes at once.',
    },
  },
};

export const T = textes(TEXTES);
