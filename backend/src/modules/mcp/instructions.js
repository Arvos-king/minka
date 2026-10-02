/**
 * Ce que le connecteur dit de lui-même à Claude, à l'ouverture de chaque
 * conversation (`instructions` du protocole MCP).
 *
 * C'est le **contrat technique** : comment lire Minka et comment y écrire. Il
 * vit ici, à côté des outils qu'il décrit, pour ne jamais s'en écarter. Les
 * goûts du foyer, eux — qui mange, ce qu'on évite, le temps qu'on a —, restent
 * dans les instructions du projet Claude (`docs/prompt-menus.md`) : ils
 * changent sans que le code change.
 */
export const INSTRUCTIONS = `Minka est l'application familiale du foyer : planning des repas, répertoire de recettes, frigo.

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

Dans l'échange, propose d'abord la semaine dans la conversation, en texte lisible, et n'écris dans Minka qu'une fois la personne d'accord.`;
