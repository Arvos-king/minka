/**
 * Les textes du connecteur Claude : noms et descriptions des outils, refus,
 * bilans, journaux.
 *
 * En français, ils sont **à la lettre ceux d'avant** : les noms d'outils sont
 * ceux qu'un projet Claude connaît déjà (`instructions.test.js` les fige). En
 * anglais, les outils ont des noms anglais, mais les champs JSON échangés
 * restent ceux de l'API du connecteur — `plat`, `creneau`, `aPreparation` —,
 * que les descriptions expliquent.
 *
 * Les instructions, plus longues, vivent dans `instructions.js`.
 */

import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    outils: {
      lirePlanning: {
        nom: 'lire_planning',
        titre: 'Lire le planning des repas',
        description:
          'Les repas prévus, jour par jour, midi et soir, cases vides comprises (null). ' +
          'Sans paramètre : les quatre semaines passées, la semaine en cours et la suivante — ' +
          'de quoi éviter de reproposer ce qu’on vient de manger, et voir ce qui est déjà posé ' +
          'sur la semaine à préparer. La réponse donne aussi la date du jour.',
        du: 'Premier jour lu (AAAA-MM-JJ).',
        au: (max) => `Dernier jour lu (AAAA-MM-JJ), ${max} jours au plus après le premier.`,
      },
      listerRecettes: {
        nom: 'lister_recettes',
        titre: 'Lister les recettes du foyer',
        description:
          'Le répertoire : titre, parts, étiquettes, noms des ingrédients, et aPreparation. ' +
          'Une recette dont aPreparation vaut true fait foi : désigne-la par son titre exact. ' +
          'Une recette dont aPreparation vaut false n’est qu’une ébauche, à compléter.',
      },
      lireRecette: {
        nom: 'lire_recette',
        titre: 'Lire une recette',
        description: 'Une recette entière : ingrédients avec leurs quantités, étapes, remarques.',
        id: 'L’identifiant donné par lister_recettes.',
      },
      lireFrigo: {
        nom: 'lire_frigo',
        titre: 'Lire le contenu du frigo',
        description:
          'Les produits du frigo, avec leur quantité et leur date limite (avant), ' +
          'les plus pressés en tête : ce qu’il faut finir cette semaine.',
      },
      poserRepas: {
        nom: 'poser_repas',
        titre: 'Poser des repas dans le planning',
        description:
          'Pose jusqu’à quatorze repas d’un coup — une semaine. À n’appeler qu’une fois la personne ' +
          'd’accord avec la proposition. Un plat du répertoire dont aPreparation vaut true : son titre ' +
          'exact, sans recette. Un plat nouveau, ou une ébauche : joins sa recette entière. Restes, resto, ' +
          'repas chez quelqu’un : un titre seul. Une case déjà occupée par autre chose n’est jamais ' +
          'écrasée : l’outil refuse tout et la nomme ; redemande avec remplacer: true seulement si la ' +
          'personne veut la remplacer. Lis le bilan : une recette « conservée » est celle du foyer, ' +
          'gardée telle quelle.',
        date: 'AAAA-MM-JJ',
        plat: 'Le titre du plat, tel qu’il s’affichera dans le planning.',
        recette: 'Seulement pour un plat absent du répertoire, ou qui n’y est qu’une ébauche.',
        remplacer: 'Écraser les cases occupées. Seulement à la demande explicite de la personne.',
      },
      enregistrerRecette: {
        nom: 'enregistrer_recette',
        titre: 'Enregistrer une recette',
        description:
          'Ajoute une recette au répertoire sans la planifier — quand la personne veut garder une idée ' +
          'pour plus tard. Même règle que poser_repas : une ébauche du même nom est complétée, une ' +
          'recette qui a sa préparation est gardée telle quelle.',
      },
      modifierRecette: {
        nom: 'modifier_recette',
        titre: 'Modifier une recette du répertoire',
        description:
          'Réécrit une recette existante. Seulement quand la personne demande explicitement de corriger ' +
          'ou de changer une recette du répertoire — jamais pour planifier. Seuls les champs fournis ' +
          'changent ; une liste fournie (ingrédients, étapes, étiquettes) remplace l’ancienne en entier.',
        id: 'L’identifiant donné par lister_recettes.',
      },
    },

    /** Ce qu'une recette peut porter, dans les mots de Claude. */
    champs: {
      parts: 'Pour combien de personnes sont les quantités.',
      etiquettes: 'Courtes et réutilisables : « végétarien », « rapide », « four ».',
      remarques: 'Ce qui ne tient pas dans une étape : « se congèle », « se prépare la veille ».',
      quantite: 'Comme on la dit en cuisine : « 600 g », « 2 gousses ».',
      ingredients: 'Ce qu’il faut acheter ; le placard n’y figure pas.',
      etapes: 'Une action par étape, sans numérotation.',
    },

    refus: {
      recetteVide: 'Une recette demande au moins des ingrédients ou des étapes.',
      aucuneModification: 'Aucune modification fournie.',
      duAvantAu: '« du » doit précéder « au ».',
      periodeTropLongue: (max) => `La période dépasse ${max} jours ; lis-la en plusieurs fois.`,
      caseEnDouble: (cases) => `Case demandée deux fois : ${cases}. Rien n’a été posé.`,
      casesPrises: (cases) =>
        'Rien n’a été posé : ces cases sont déjà prises — ' +
        cases +
        '. Propose une autre case, ou redemande avec remplacer: true si la personne veut les remplacer.',
      planningChange:
        'Le planning a changé pendant la pose — quelqu’un y a touché depuis Minka —, et rien n’y a ' +
        'été écrit. Les recettes, elles, sont enregistrées. Relis le planning, puis repose.',
      minkaARepondu: (statut) => `Minka a répondu ${statut}.`,
      detail: (champ, message) => `${champ} : ${message}`,
    },

    resultats: {
      creee: 'Recette créée.',
      completee: 'Recette complétée : ce n’était qu’une ébauche.',
      gardee: 'Recette gardée telle quelle : le foyer en a déjà la préparation, qui fait foi.',
    },

    bilan: {
      sansRecettes:
        'Le module recettes ne répond pas : tout a été posé en texte libre, sans recette ni ingrédients.',
      conservees: (liste) =>
        `Recettes du foyer gardées telles quelles : ${liste}. ` +
        'Elles ont déjà leur préparation, qui fait foi : la version proposée n’a pas été ' +
        'enregistrée, et ses ingrédients ne sont pas ceux qui partiront dans les courses. ' +
        'Lis-les avec lire_recette avant d’en parler.',
    },

    /** De quoi dire une case comme on la dit : « lundi 5 octobre soir ». */
    dates: {
      jours: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
      mois: [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
      ],
      creneaux: { midi: 'midi', soir: 'soir' },
      caseDuPlan: (jour, quantieme, mois, creneau) => `${jour} ${quantieme} ${mois} ${creneau}`,
    },

    http: {
      eteint: "Le connecteur Claude n'est pas configuré (variables MCP_* absentes, voir .env.example).",
      sansAcces: "Ce compte Pocket-ID n'a pas accès à Minka.",
      postSeulement: 'Le connecteur ne répond qu’en POST.',
    },

    configuration: {
      adresseInvalide: (nom, brut) => `${nom} n'est pas une adresse valide (reçu : "${brut}").`,
      httpsRequis: (nom, brut) => `${nom} doit être une adresse HTTPS (reçu : "${brut}").`,
      formeDesComptes: (entree) => `MCP_USERS : « ${entree} » n'a pas la forme <sub>=<identifiant>.`,
      aucunCompte: 'MCP_USERS ne désigne aucun compte.',
      aMoitie: (manquantes) =>
        `connecteur Claude à moitié configuré : ${manquantes.join(', ')} ` +
        `manque${manquantes.length > 1 ? 'nt' : ''} (voir .env.example).`,
      permissionUnique: (permission) =>
        `MCP_PERMISSION est une seule permission, sans espace (reçu : "${permission}").`,
    },

    jeton: {
      absent: 'jeton absent',
      sansSujet: 'jeton sans sujet',
      permissionAbsente: (permission) => `permission « ${permission} » absente`,
      expire: 'jeton expiré',
      reclamation: (claim, raison) => `réclamation « ${claim} » refusée (${raison})`,
      signature: 'signature invalide',
      cleInconnue: 'clé de signature inconnue',
      illisible: (code) => `jeton illisible (${code})`,
      impossible: (message) => `vérification impossible (${message})`,
      decouverte: (statut) => `découverte de Pocket-ID : ${statut}`,
    },

    journal: {
      eteint: '[mcp] connecteur Claude éteint (aucune variable MCP_*).',
      actif: (ressource, emetteur, comptes) =>
        `[mcp] connecteur Claude actif sur ${ressource}, ` +
        `jetons de ${emetteur}, ${comptes} compte(s).`,
      compteInconnu: (identifiant) =>
        `[mcp] MCP_USERS désigne « ${identifiant} », qui n'est pas un compte Minka.`,
      sujetInconnu: (sujet) =>
        `[mcp] sujet inconnu « ${sujet} » : ajoute-le à MCP_USERS pour lui ouvrir Minka.`,
      jetonRefuse: (raison) => `[mcp] jeton refusé : ${raison}`,
      claudeParti: '[mcp] Claude est parti avant la fin de la réponse.',
    },
  },

  en: {
    outils: {
      lirePlanning: {
        nom: 'read_meal_plan',
        titre: 'Read the meal plan',
        description:
          'The planned meals, day by day, lunch (midi) and dinner (soir), empty slots included (null). ' +
          'With no parameters: the past four weeks, the current week and the next one — enough to avoid ' +
          'suggesting what was just eaten, and to see what is already planned for the week being ' +
          'prepared. The answer also gives today’s date (aujourdhui).',
        du: 'First day to read (YYYY-MM-DD).',
        au: (max) => `Last day to read (YYYY-MM-DD), at most ${max} days after the first.`,
      },
      listerRecettes: {
        nom: 'list_recipes',
        titre: 'List the household’s recipes',
        description:
          'The recipe collection: titre (title), parts (servings), etiquettes (tags), ingredient names, ' +
          'and aPreparation. A recipe whose aPreparation is true is the household’s own and stands: refer ' +
          'to it by its exact title. A recipe whose aPreparation is false is only a draft, to be completed.',
      },
      lireRecette: {
        nom: 'read_recipe',
        titre: 'Read a recipe',
        description:
          'A whole recipe: ingredients with their quantities (nom, quantite), steps (etapes), notes (remarques).',
        id: 'The id given by list_recipes.',
      },
      lireFrigo: {
        nom: 'read_fridge',
        titre: 'Read what is in the fridge',
        description:
          'The products in the fridge, with their quantity (quantite) and use-by date (avant), ' +
          'the most urgent first: what needs finishing this week.',
      },
      poserRepas: {
        nom: 'plan_meals',
        titre: 'Put meals in the meal plan',
        description:
          'Plans up to fourteen meals at once — a week. Only call it once the person has agreed to the ' +
          'proposal. A dish from the collection whose aPreparation is true: its exact title, no recipe. ' +
          'A new dish, or a draft: attach its whole recipe. Leftovers, eating out, a meal at someone’s ' +
          'house: a title alone. A slot already taken by something else is never overwritten: the tool ' +
          'refuses everything and names it; ask again with remplacer: true only if the person wants to ' +
          'replace it. Read the summary: a recipe that was kept (conservees) is the household’s own, ' +
          'left as it was. Each meal (repas) has a date, a creneau — midi for lunch, soir for dinner —, ' +
          'a plat (the dish) and, if needed, a recette.',
        date: 'YYYY-MM-DD',
        plat: 'The title of the dish, as it will appear in the meal plan.',
        recette: 'Only for a dish that is not in the collection, or is only a draft there.',
        remplacer: 'Overwrite slots that are taken. Only if the person explicitly asks.',
      },
      enregistrerRecette: {
        nom: 'save_recipe',
        titre: 'Save a recipe',
        description:
          'Adds a recipe to the collection without planning it — when the person wants to keep an idea ' +
          'for later. Same rule as plan_meals: a draft with the same name is completed, a recipe that ' +
          'already has its method is kept as it is.',
      },
      modifierRecette: {
        nom: 'edit_recipe',
        titre: 'Edit a recipe in the collection',
        description:
          'Rewrites an existing recipe. Only when the person explicitly asks to correct or change a ' +
          'recipe in the collection — never to plan meals. Only the fields provided change; a list ' +
          'provided (ingredients, etapes, etiquettes) replaces the old one entirely.',
        id: 'The id given by list_recipes.',
      },
    },

    champs: {
      parts: 'How many people the quantities are for.',
      etiquettes: 'Short and reusable: “vegetarian”, “quick”, “oven”.',
      remarques: 'What does not fit in a step: “freezes well”, “make the day before”.',
      quantite: 'As you would say it in the kitchen: “600 g”, “2 cloves”.',
      ingredients: 'What needs buying (nom, quantite); store-cupboard staples are left out.',
      etapes: 'The steps: one action each, unnumbered.',
    },

    refus: {
      recetteVide: 'A recipe needs at least ingredients or steps.',
      aucuneModification: 'No changes provided.',
      duAvantAu: '“du” (from) must come before “au” (to).',
      periodeTropLongue: (max) => `The period is longer than ${max} days; read it in several goes.`,
      caseEnDouble: (cases) => `Slot requested twice: ${cases}. Nothing was planned.`,
      casesPrises: (cases) =>
        'Nothing was planned: these slots are already taken — ' +
        cases +
        '. Suggest another slot, or ask again with remplacer: true if the person wants to replace them.',
      planningChange:
        'The meal plan changed while the meals were being planned — someone edited it in Minka — and ' +
        'nothing was written to it. The recipes, however, are saved. Read the meal plan again, then ' +
        'plan again.',
      minkaARepondu: (statut) => `Minka answered ${statut}.`,
      detail: (champ, message) => `${champ}: ${message}`,
    },

    resultats: {
      creee: 'Recipe created.',
      completee: 'Recipe completed: it was only a draft.',
      gardee: 'Recipe kept as it was: the household already has its method, which stands.',
    },

    bilan: {
      sansRecettes:
        'The recipes module is not responding: everything was planned as plain text, with no recipe ' +
        'or ingredients.',
      conservees: (liste) =>
        `Household recipes kept as they were: ${liste}. ` +
        'They already have their method, which stands: the proposed version was not saved, and its ' +
        'ingredients are not the ones that will go to the shopping list. Read them with read_recipe ' +
        'before talking about them.',
    },

    dates: {
      jours: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      mois: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ],
      creneaux: { midi: 'lunch', soir: 'dinner' },
      caseDuPlan: (jour, quantieme, mois, creneau) => `${jour} ${quantieme} ${mois}, ${creneau}`,
    },

    http: {
      eteint: 'The Claude connector is not configured (MCP_* variables missing, see .env.example).',
      sansAcces: 'This account is not allowed into Minka.',
      postSeulement: 'The connector only answers POST requests.',
    },

    configuration: {
      adresseInvalide: (nom, brut) => `${nom} is not a valid address (got "${brut}").`,
      httpsRequis: (nom, brut) => `${nom} must be an HTTPS address (got "${brut}").`,
      formeDesComptes: (entree) => `MCP_USERS: "${entree}" is not of the form <sub>=<username>.`,
      aucunCompte: 'MCP_USERS names no account.',
      aMoitie: (manquantes) =>
        `Claude connector half configured: ${manquantes.join(', ')} ` +
        `${manquantes.length > 1 ? 'are' : 'is'} missing (see .env.example).`,
      permissionUnique: (permission) =>
        `MCP_PERMISSION is a single permission, without spaces (got "${permission}").`,
    },

    jeton: {
      absent: 'no token',
      sansSujet: 'token without a subject',
      permissionAbsente: (permission) => `permission "${permission}" missing`,
      expire: 'token expired',
      reclamation: (claim, raison) => `claim "${claim}" rejected (${raison})`,
      signature: 'invalid signature',
      cleInconnue: 'unknown signing key',
      illisible: (code) => `unreadable token (${code})`,
      impossible: (message) => `verification failed (${message})`,
      decouverte: (statut) => `identity provider discovery: ${statut}`,
    },

    journal: {
      eteint: '[mcp] Claude connector off (no MCP_* variables).',
      actif: (ressource, emetteur, comptes) =>
        `[mcp] Claude connector active at ${ressource}, ` +
        `tokens from ${emetteur}, ${comptes} account(s).`,
      compteInconnu: (identifiant) =>
        `[mcp] MCP_USERS names "${identifiant}", which is not a Minka account.`,
      sujetInconnu: (sujet) =>
        `[mcp] unknown subject "${sujet}": add it to MCP_USERS to let it into Minka.`,
      jetonRefuse: (raison) => `[mcp] token refused: ${raison}`,
      claudeParti: '[mcp] Claude left before the end of the response.',
    },
  },
};

export const T = textes(TEXTES);
