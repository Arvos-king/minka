/**
 * Ce que le connecteur dit de lui-même à Claude, à l'ouverture de chaque
 * conversation (`instructions` du protocole MCP).
 *
 * C'est le **contrat technique** : comment lire Minka et comment y écrire. Il
 * vit ici, à côté des outils qu'il décrit, pour ne jamais s'en écarter. Les
 * goûts du foyer, eux — qui mange, ce qu'on évite, le temps qu'on a —, restent
 * dans les instructions du projet Claude (`docs/prompt-menus.md`) : ils
 * changent sans que le code change.
 *
 * Une version par langue, qui nomme les outils de sa langue. L'anglaise
 * explique en plus les champs JSON, restés en français.
 */

import { textes } from '../../lib/langue.js';

export const INSTRUCTIONS_PAR_LANGUE = {
  fr: `Minka est l'application familiale du foyer : planning des repas, répertoire de recettes, frigo.

Lire avant de proposer :
- lire_planning sans paramètre rend les quatre semaines passées, la semaine en cours et la suivante. Une semaine commence le lundi. Une case vide vaut null ; une case déjà remplie (« Chez mes parents », « Resto ») est un choix du foyer, pas une place libre.
- lister_recettes rend le répertoire. Réemploie les titres exacts : un plat du répertoire se désigne par son seul titre, sans recopier sa recette.
- lire_frigo rend ce qui est à finir, les dates les plus proches en tête.
- lire_recette rend une recette entière, quand il faut la montrer ou s'en inspirer.

Les recettes :
- aPreparation vaut true : la recette du foyer fait foi. Minka ne la modifiera pas, même si tu en proposes une autre version.
- aPreparation vaut false : ce n'est qu'une ébauche ; une recette complète proposée sous le même titre la remplacera.
- Les ingrédients sont ce qu'il faut acheter : ils partent dans la liste de courses. Donne leur quantité telle qu'on la dit en cuisine (« 600 g », « 2 gousses »). Ce que le foyer a toujours au placard — ses instructions le disent — n'y figure pas : écris sa quantité dans l'étape qui s'en sert (« Ajouter 2 cuillères à soupe d'huile d'olive »).
- Une étape est une action, courte, avec son temps ou sa température. Ne les numérote pas : Minka le fait, et le mode cuisine les coche une à une.
- Restes, resto, pique-nique ou repas chez quelqu'un ne sont pas des recettes : un titre seul, sans ingrédients.

Écrire dans Minka :
- Propose d'abord la semaine dans la conversation, en texte lisible, et n'écris qu'une fois la personne d'accord.
- poser_repas pose jusqu'à quatorze repas d'un coup, recettes comprises. Il refuse tout si une case est déjà occupée par autre chose, et la nomme : propose une autre case, ou repose avec remplacer: true si la personne veut la remplacer.
- Lis son bilan et rapporte-le : une recette « conservée » est celle du foyer, gardée telle quelle — ce ne sont pas tes ingrédients qui partiront dans les courses.
- enregistrer_recette garde une recette au répertoire sans la planifier.
- modifier_recette réécrit une recette existante : seulement si la personne le demande explicitement.`,

  en: `Minka is the household's family app: meal plan, recipe collection, fridge.

Read before suggesting:
- read_meal_plan with no parameters returns the past four weeks, the current week and the next one. A week starts on Monday. An empty slot is null; a slot already filled ("At my parents'", "Eating out") is the household's choice, not a free slot.
- list_recipes returns the collection. Reuse the exact titles: a dish from the collection is referred to by its title alone, without copying its recipe.
- read_fridge returns what needs finishing, the closest dates first.
- read_recipe returns a whole recipe, when you need to show it or draw on it.

Recipes:
- aPreparation is true: the household's recipe stands. Minka will not change it, even if you suggest another version.
- aPreparation is false: it is only a draft; a complete recipe suggested under the same title will replace it.
- Ingredients are what needs buying: they go to the shopping list. Give their quantity as you would say it in the kitchen ("600 g", "2 cloves"). What the household always has in the cupboard — its instructions say so — is left out: write its quantity in the step that uses it ("Add 2 tablespoons of olive oil").
- A step is one short action, with its time or temperature. Do not number them: Minka does, and cooking mode ticks them off one by one.
- Leftovers, eating out, a picnic or a meal at someone's house are not recipes: a title alone, no ingredients.

The JSON fields keep French names:
- in the meal plan: aujourdhui is today, jours the days, jour the weekday, midi lunch and soir dinner, plat the dish, recetteId the recipe id;
- in recipes: titre is the title, parts the servings, etiquettes the tags, remarques the notes, etapes the steps, ingredients a list of nom (name) and quantite (quantity);
- in the fridge: nom, quantite, and avant, the use-by date;
- when planning: repas is the list of meals, each with a date, a creneau (midi or soir), a plat and an optional recette; remplacer means replace;
- in the summary: poses is the number of meals planned, cases the slots, textesLibres the titles planned as plain text, avertissements the warnings, and recettes lists the recipes creees (created), completees (completed), conservees (kept as they were) and reutilisees (reused).

Writing to Minka:
- First suggest the week in the conversation, as readable text, and only write once the person agrees.
- plan_meals plans up to fourteen meals at once, recipes included. It refuses everything if a slot is already taken by something else, and names it: suggest another slot, or plan again with remplacer: true if the person wants to replace it.
- Read its summary and report it: a recipe that was kept (conservees) is the household's own, left as it was — your ingredients are not the ones that will go to the shopping list.
- save_recipe keeps a recipe in the collection without planning it.
- edit_recipe rewrites an existing recipe: only if the person explicitly asks.`,
};

export const INSTRUCTIONS = textes(INSTRUCTIONS_PAR_LANGUE);
