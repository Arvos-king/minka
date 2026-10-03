import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    module: { label: 'Recettes', description: 'Ce qu’on sait cuisiner' },

    resume: {
      parts: (n) => `${n} parts`,
      ingredients: (n) => `${n} ingrédient${n > 1 ? 's' : ''}`,
    },
    pour: (n) => `Pour ${n}`,
    chercher: {
      placeholder: 'Chercher un plat, un ingrédient…',
      label: 'Chercher une recette',
    },
    importer: 'Importer',
    aucuneCorrespondance: 'Aucune recette ne correspond.',
    aucuneRecette: 'Aucune recette',
    aideVide:
      "Note celles qui reviennent : elles se posent ensuite dans les menus d'un tap, leurs " +
      'ingrédients partent dans les courses, et leurs étapes se cochent pendant la cuisine.',
    ecrire: 'Écrire une recette',
    coller: 'Coller un texte',
    nouvelle: 'Nouvelle recette',

    fiche: {
      ingredients: 'Ingrédients',
      aucunIngredient: 'Aucun ingrédient noté.',
      preparation: 'Préparation',
      remarques: 'Remarques',
      cuisiner: 'Cuisiner',
      modifier: 'Modifier',
    },

    cuisine: {
      dialogue: (titre) => `Cuisiner ${titre}`,
      quitter: 'Quitter le mode cuisine',
      recommencer: 'Recommencer',
      pret: "C'est prêt.",
      terminer: 'Terminer et fermer',
      ecranAllume: "L'écran reste allumé tant que cette page est ouverte.",
      ecranLibre: "L'écran suit le réglage du téléphone : il peut s'éteindre tout seul.",
    },

    formulaire: {
      modifier: 'Modifier la recette',
      nouvelle: 'Nouvelle recette',
      nom: 'Nom de la recette',
      pourCombien: 'Pour combien ?',
      facultatif: '(facultatif)',
      nombreDeParts: 'Nombre de parts',
      etiquettes: 'Étiquettes',
      etiquettesExemple: 'végétarien, rapide…',
      retirerEtiquette: (tag) => `Retirer l'étiquette ${tag}`,
      ingredientExemple: 'Courgettes',
      nomIngredient: "Nom de l'ingrédient",
      quantiteExemple: '200 g',
      quantite: 'Quantité (texte libre)',
      retirerIngredient: (nom) => `Retirer ${nom}`,
      cetIngredient: 'cet ingrédient',
      ajouterIngredient: 'Ajouter un ingrédient',
      uneLigneUneEtape: '— une ligne, une étape',
      aConvertir:
        "Cette recette a une préparation écrite d'un bloc. Elle peut devenir des étapes à " +
        'cocher pendant la cuisine.',
      decouper: 'La découper en étapes',
      preparationExemple: 'Préchauffer le four à 180 °C\nÉmincer les oignons\nFaire revenir 5 min',
      remarquesExemple: 'Se congèle très bien. Recette de ma mère.',
      confirmerSuppression: (titre) =>
        `Supprimer « ${titre} » ? Les repas déjà prévus la garderont ` +
        'comme intitulé, sans sa fiche.',
      supprimer: 'Supprimer la recette',
    },

    importation: {
      exemple: `Gratin de courgettes
Pour 4 personnes
Étiquettes : végétarien, four

Ingrédients
- 600 g de courgettes
- 20 cl de crème fraîche
- 2 gousses d'ail

Préparation
1. Préchauffer le four à 180 °C
2. Émincer les courgettes
3. Enfourner 35 minutes`,
      titre: 'Importer une recette',
      aide:
        "Colle la recette telle que tu l'as trouvée. Le titre en première ligne, les ingrédients à " +
        "la ligne précédés d'un tiret, les étapes numérotées.",
      champ: 'Recette à importer',
      apercu: 'Ce qui sera enregistré',
      creer: 'Créer la recette',
      ligneIgnoree: (ligne) => `Ligne ignorée : « ${ligne} ».`,
      sansTitre: 'Aucun titre trouvé : la première ligne doit être le nom de la recette.',
      sansIngredient:
        'Aucun ingrédient reconnu. Un par ligne, précédé d’un tiret, sous « Ingrédients ».',
    },
  },

  en: {
    module: { label: 'Recipes', description: 'What we know how to cook' },

    resume: {
      parts: (n) => `${n} servings`,
      ingredients: (n) => `${n} ingredient${n > 1 ? 's' : ''}`,
    },
    pour: (n) => `Serves ${n}`,
    chercher: {
      placeholder: 'Search for a dish, an ingredient…',
      label: 'Search recipes',
    },
    importer: 'Import',
    aucuneCorrespondance: 'No recipe matches.',
    aucuneRecette: 'No recipes',
    aideVide:
      'Write down the ones you cook again and again: they go into the meal plan in one tap, ' +
      'their ingredients go to the shopping list, and their steps get ticked off as you cook.',
    ecrire: 'Write a recipe',
    coller: 'Paste some text',
    nouvelle: 'New recipe',

    fiche: {
      ingredients: 'Ingredients',
      aucunIngredient: 'No ingredients written down.',
      preparation: 'Method',
      remarques: 'Notes',
      cuisiner: 'Cook',
      modifier: 'Edit',
    },

    cuisine: {
      dialogue: (titre) => `Cook ${titre}`,
      quitter: 'Leave cooking mode',
      recommencer: 'Start again',
      pret: 'It’s ready.',
      terminer: 'Finish and close',
      ecranAllume: 'The screen stays on while this page is open.',
      ecranLibre: 'The screen follows your phone’s setting: it may turn off by itself.',
    },

    formulaire: {
      modifier: 'Edit recipe',
      nouvelle: 'New recipe',
      nom: 'Recipe name',
      pourCombien: 'How many servings?',
      facultatif: '(optional)',
      nombreDeParts: 'Number of servings',
      etiquettes: 'Tags',
      etiquettesExemple: 'vegetarian, quick…',
      retirerEtiquette: (tag) => `Remove the tag ${tag}`,
      ingredientExemple: 'Courgettes',
      nomIngredient: 'Ingredient name',
      quantiteExemple: '200 g',
      quantite: 'Quantity (free text)',
      retirerIngredient: (nom) => `Remove ${nom}`,
      cetIngredient: 'this ingredient',
      ajouterIngredient: 'Add an ingredient',
      uneLigneUneEtape: '— one line, one step',
      aConvertir:
        'This recipe has its method written as a single block. It can become steps to tick ' +
        'off while you cook.',
      decouper: 'Split it into steps',
      preparationExemple: 'Preheat the oven to 180 °C\nSlice the onions\nFry for 5 min',
      remarquesExemple: 'Freezes very well. My mother’s recipe.',
      confirmerSuppression: (titre) =>
        `Delete “${titre}”? Meals already planned will keep it as their title, without the recipe.`,
      supprimer: 'Delete the recipe',
    },

    importation: {
      exemple: `Courgette gratin
Serves 4
Tags: vegetarian, oven

Ingredients
- 600 g courgettes
- 200 ml crème fraîche
- 2 cloves of garlic

Method
1. Preheat the oven to 180 °C
2. Slice the courgettes
3. Bake for 35 minutes`,
      titre: 'Import a recipe',
      aide:
        'Paste the recipe as you found it. The title on the first line, the ingredients one per ' +
        'line starting with a dash, the steps numbered.',
      champ: 'Recipe to import',
      apercu: 'What will be saved',
      creer: 'Create the recipe',
      ligneIgnoree: (ligne) => `Line ignored: “${ligne}”.`,
      sansTitre: 'No title found: the first line must be the name of the recipe.',
      sansIngredient:
        'No ingredients recognised. One per line, starting with a dash, under “Ingredients”.',
    },
  },
};

export const T = textes(TEXTES);
