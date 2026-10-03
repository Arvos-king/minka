import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    module: { label: 'Menus', description: 'Ce qu’on mange cette semaine' },

    /** Les deux moments d'une journée, par leur clé — celle de l'API. */
    creneaux: { midi: 'Midi', soir: 'Soir' },

    /** Les deux textes libres de toutes les semaines : finir ce qui reste, ou sortir. */
    raccourcisDeDepart: ['Restes', 'Resto'],

    page: {
      versQuelleCase: 'Vers quelle case ?',
      semainePrecedente: 'Semaine précédente',
      semaineSuivante: 'Semaine suivante',
      importer: 'Importer',
      revenirACetteSemaine: 'Revenir à cette semaine',
      aideDeplacer: {
        avant: 'Pour déplacer un repas, fais glisser sa poignée',
        apres:
          ", ou touche-la puis choisis la case. Sur un repas déjà prévu, il s'insère et pousse " +
          "la suite d'un jour.",
      },
      envoyerAuxCourses: 'Envoyer les ingrédients dans les courses',
      aucuneRecettePosee: "Aucune recette posée cette semaine pour l'instant.",
      semaineVide: 'Semaine vide',
      aideVide: 'Touche un midi ou un soir pour y poser un repas.',
      annulationImpossible: "Impossible d'annuler : le planning a changé entre-temps.",
    },

    jour: {
      aujourdhui: "· aujourd'hui",
      poserIci: 'Poser ici',
      rienDePrevu: 'Rien de prévu',
      aDeplacer: ' — repas à déplacer : toucher pour annuler',
      poserIciLecteur: ' — poser ici',
      ouvrirRecette: (titre) => `Ouvrir la recette : ${titre}`,
      deplacer: (intitule) => `Déplacer « ${intitule} »`,
    },

    bandeaux: {
      annuler: 'Annuler',
      ouPoser: (intitule) => `Où poser « ${intitule} » ?`,
      pousseLaSuite: "Sur un repas déjà prévu, il pousse la suite d'un jour.",
    },

    repas: {
      dialogue: (jour, creneau) => `Repas du ${jour}, ${creneau}`,
      actuellement: (intitule) => `Actuellement : ${intitule}`,
      decalage: 'Décalage…',
      annulerDecalage: 'Annuler le décalage',
      annuler: 'Annuler',
      deplacer: 'Déplacer…',
      decaler: "Décaler d'un jour",
      prevu: 'Ce qui est prévu',
      chercherOuEcrire: 'Chercher, ou écrire…',
      exempleLibre: 'Restes, resto…',
      poserTelQuel: 'Poser tel quel',
      enFaireUneRecette: 'En faire une recette',
      raccourcis: 'Raccourcis',
      mesRecettes: 'Mes recettes',
      aucuneRecette: 'Aucune recette pour le moment.',
      aucuneCorrespondance: 'Aucune recette ne correspond.',
      parts: (n) => `${n} parts`,
      vider: 'Vider la case',
    },

    courses: {
      dialogue: 'Envoyer les ingrédients dans la liste de courses',
      titre: 'Ingrédients de la semaine',
      ajoutes: (n) => (n === 1 ? '1 article ajouté' : `${n} articles ajoutés`),
      attendent: "Ils t'attendent dans la liste de courses.",
      aucunIngredient:
        'Aucun ingrédient cette semaine. Pose des recettes dans le planning, leurs ingrédients ' +
        'apparaîtront ici.',
      decocher: 'Décoche ce que tu as déjà. Le texte est celui qui arrivera dans la liste.',
      envoyer: (n) => (n === 1 ? 'Envoyer 1 article' : `Envoyer ${n} articles`),
    },

    importation: {
      exemple: `Lundi
Midi : Salade de lentilles
  - Lentilles vertes : 250 g
  - Échalote : 1
Soir : Restes

Mardi
Soir : Gratin de courgettes`,
      dialogue: 'Importer une semaine de menus',
      titre: 'Importer une semaine',
      poses: (n) => `${n} repas posés`,
      creees: (n, liste) => `${n} recette(s) créée(s) : ${liste}`,
      completees: (n, liste) => `${n} recette(s) complétée(s) : ${liste}`,
      conservees: (liste) =>
        `Gardée(s) telle(s) quelle(s), car elles ont déjà leur préparation : ${liste}`,
      libres: (liste) => `Posés en texte libre : ${liste}`,
      aideAvecRecettes:
        'Colle la semaine proposée. Un plat dont les ingrédients sont listés devient une ' +
        'recette ; sinon, une recette du même nom est réutilisée si elle existe.',
      aideSansRecettes:
        'Colle la semaine proposée. Les plats seront posés tels quels, en texte : le module ' +
        'recettes ne répond pas.',
      champ: 'Semaine à importer',
      apercu: (n) => `Ce qui sera posé (${n} repas)`,
      ingredients: (n) => ` (${n} ingrédient${n > 1 ? 's' : ''})`,
      poser: (n) => `Poser ${n > 0 ? `${n} repas` : ''}`,

      // Les avertissements de l'analyse.
      aucunJour: (ligne) => `« ${ligne} » : aucun jour n'a été annoncé avant.`,
      aucunPlat: (jour, creneau) => `${jour} ${creneau} : aucun plat indiqué.`,
      deuxFois: (jour, creneau) => `${jour} ${creneau} est indiqué deux fois ; le dernier l'emporte.`,
      ligneIgnoree: (ligne) => `Ligne ignorée : « ${ligne} ».`,
      aucunRepas:
        "Aucun repas reconnu. Chaque jour s'annonce sur sa propre ligne, puis « Midi : … » et « Soir : … ».",
    },

    deplacement: {
      /** « jeudi 20 soir » */
      caseDuPlan: (jour, creneau) => `${jour} ${creneau}`,
      seul: (titre, ou) => `« ${titre} » passe au ${ou}.`,
      pousseUn: (titre, ou, pousse) =>
        `« ${titre} » passe au ${ou}, et pousse « ${pousse} » d'un jour.`,
      pousseN: (titre, ou, n) => `« ${titre} » passe au ${ou}, et pousse ${n} repas d'un jour.`,
      depot: (ou, occupant) => (occupant ? `${ou} · pousse « ${occupant} »` : ou),
    },
  },

  en: {
    module: { label: 'Meals', description: 'What we’re eating this week' },

    creneaux: { midi: 'Lunch', soir: 'Dinner' },

    raccourcisDeDepart: ['Leftovers', 'Eating out'],

    page: {
      versQuelleCase: 'Which slot?',
      semainePrecedente: 'Previous week',
      semaineSuivante: 'Next week',
      importer: 'Import',
      revenirACetteSemaine: 'Back to this week',
      aideDeplacer: {
        avant: 'To move a meal, drag its handle',
        apres: ', or tap it and choose the slot. On a meal already planned, it slots in and pushes the rest back a day.',
      },
      envoyerAuxCourses: 'Send the ingredients to the shopping list',
      aucuneRecettePosee: 'No recipes in this week’s plan yet.',
      semaineVide: 'Empty week',
      aideVide: 'Tap a lunch or a dinner to plan a meal.',
      annulationImpossible: 'Can’t undo: the plan changed in the meantime.',
    },

    jour: {
      aujourdhui: '· today',
      poserIci: 'Place here',
      rienDePrevu: 'Nothing planned',
      aDeplacer: ' — meal to move: tap to cancel',
      poserIciLecteur: ' — place here',
      ouvrirRecette: (titre) => `Open the recipe: ${titre}`,
      deplacer: (intitule) => `Move “${intitule}”`,
    },

    bandeaux: {
      annuler: 'Undo',
      ouPoser: (intitule) => `Where should “${intitule}” go?`,
      pousseLaSuite: 'On a meal already planned, it pushes the rest back a day.',
    },

    repas: {
      dialogue: (jour, creneau) => `Meal for ${jour}, ${creneau}`,
      actuellement: (intitule) => `Currently: ${intitule}`,
      decalage: 'Moving…',
      annulerDecalage: 'Undo the move',
      annuler: 'Undo',
      deplacer: 'Move…',
      decaler: 'Push back a day',
      prevu: 'What’s planned',
      chercherOuEcrire: 'Search, or type…',
      exempleLibre: 'Leftovers, eating out…',
      poserTelQuel: 'Use as is',
      enFaireUneRecette: 'Make it a recipe',
      raccourcis: 'Shortcuts',
      mesRecettes: 'My recipes',
      aucuneRecette: 'No recipes yet.',
      aucuneCorrespondance: 'No recipe matches.',
      parts: (n) => `${n} servings`,
      vider: 'Clear the slot',
    },

    courses: {
      dialogue: 'Send the ingredients to the shopping list',
      titre: 'This week’s ingredients',
      ajoutes: (n) => (n === 1 ? '1 item added' : `${n} items added`),
      attendent: 'They’re waiting for you in the shopping list.',
      aucunIngredient:
        'No ingredients this week. Put recipes in the plan and their ingredients will show up here.',
      decocher: 'Untick what you already have. The text is what will appear in the list.',
      envoyer: (n) => (n === 1 ? 'Send 1 item' : `Send ${n} items`),
    },

    importation: {
      exemple: `Monday
Lunch: Lentil salad
  - Green lentils: 250 g
  - Shallot: 1
Dinner: Leftovers

Tuesday
Dinner: Courgette gratin`,
      dialogue: 'Import a week of meals',
      titre: 'Import a week',
      poses: (n) => `${n} meal${n > 1 ? 's' : ''} planned`,
      creees: (n, liste) => `${n} recipe${n > 1 ? 's' : ''} created: ${liste}`,
      completees: (n, liste) => `${n} recipe${n > 1 ? 's' : ''} filled in: ${liste}`,
      conservees: (liste) => `Kept as they were, since they already have a method: ${liste}`,
      libres: (liste) => `Planned as plain text: ${liste}`,
      aideAvecRecettes:
        'Paste the proposed week. A dish with its ingredients listed becomes a recipe; ' +
        'otherwise a recipe with the same name is reused if there is one.',
      aideSansRecettes:
        'Paste the proposed week. The dishes will be planned as plain text: the recipes module ' +
        'is not responding.',
      champ: 'Week to import',
      apercu: (n) => `What will be planned (${n} meal${n > 1 ? 's' : ''})`,
      ingredients: (n) => ` (${n} ingredient${n > 1 ? 's' : ''})`,
      poser: (n) => (n > 0 ? `Plan ${n} meal${n > 1 ? 's' : ''}` : 'Plan'),

      aucunJour: (ligne) => `“${ligne}”: no day was given before it.`,
      aucunPlat: (jour, creneau) => `${jour} ${creneau}: no dish given.`,
      deuxFois: (jour, creneau) => `${jour} ${creneau} is given twice; the last one wins.`,
      ligneIgnoree: (ligne) => `Line ignored: “${ligne}”.`,
      aucunRepas:
        'No meals recognised. Each day goes on its own line, followed by “Lunch: …” and “Dinner: …”.',
    },

    deplacement: {
      /** « dinner on Thursday 20 » */
      caseDuPlan: (jour, creneau) => `${creneau} on ${jour}`,
      seul: (titre, ou) => `“${titre}” moves to ${ou}.`,
      pousseUn: (titre, ou, pousse) => `“${titre}” moves to ${ou}, and pushes “${pousse}” back a day.`,
      pousseN: (titre, ou, n) => `“${titre}” moves to ${ou}, and pushes ${n} meals back a day.`,
      depot: (ou, occupant) => (occupant ? `${ou} · pushes “${occupant}”` : ou),
    },
  },
};

export const T = textes(TEXTES);
