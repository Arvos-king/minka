/**
 * Les outils que Claude peut appeler.
 *
 * Chacun n'est proposé que si le module dont il dépend est monté : sans frigo,
 * pas de `lire_frigo`, et Claude ne s'y essaie pas. Tous passent par les
 * routes HTTP des modules (voir `interne.js`), au nom de la personne
 * connectée.
 *
 * Les descriptions sont écrites pour Claude, qui n'a qu'elles pour choisir :
 * elles disent quand se servir de l'outil, pas seulement ce qu'il fait.
 */

import { z } from 'zod';

import { isoDate } from '../../lib/schemas.js';
import { ErreurMinka, appelerMinka } from './interne.js';
import {
  JOURS_MAX,
  aujourdhuiLocal,
  bilanDePose,
  casesEnConflit,
  casesEnDouble,
  casesPourPlanning,
  frigoLisible,
  joursCouverts,
  modificationPourMinka,
  periodeDesRepas,
  periodeParDefaut,
  planningLisible,
  recetteLisible,
  recettePourMinka,
  repertoireLisible,
} from './traduction.js';

/** Rien n'est modifié, et rien ne sort de Minka. */
const LECTURE = { readOnlyHint: true, openWorldHint: false };

/*
 * Ce qu'une recette peut porter, dans les mots de Claude.
 *
 * Les bornes sont celles du module recettes : les répéter ici fait refuser une
 * étape trop longue avant tout appel, avec un message qui nomme le champ, au
 * lieu d'une pose à moitié faite.
 */
const titre = z.string().trim().min(1).max(120);

const champsDeRecette = {
  parts: z.number().int().min(1).max(50).describe('Pour combien de personnes sont les quantités.'),
  etiquettes: z
    .array(z.string().trim().min(1).max(30))
    .max(12)
    .describe('Courtes et réutilisables : « végétarien », « rapide », « four ».'),
  remarques: z
    .string()
    .trim()
    .max(4000)
    .describe('Ce qui ne tient pas dans une étape : « se congèle », « se prépare la veille ».'),
  ingredients: z
    .array(
      z.object({
        nom: z.string().trim().min(1).max(120),
        quantite: z.string().trim().max(60).optional().describe('Comme on la dit en cuisine : « 600 g », « 2 gousses ».'),
      }),
    )
    .max(60)
    .describe('Ce qu’il faut acheter ; le placard n’y figure pas.'),
  etapes: z
    .array(z.string().trim().min(1).max(500))
    .max(60)
    .describe('Une action par étape, sans numérotation.'),
};

const recetteSansTitre = z.object({
  parts: champsDeRecette.parts.optional(),
  etiquettes: champsDeRecette.etiquettes.optional(),
  remarques: champsDeRecette.remarques.optional(),
  ingredients: champsDeRecette.ingredients.default([]),
  etapes: champsDeRecette.etapes.default([]),
});

/** Des étiquettes seules ne font pas une recette — même règle que le module recettes. */
const assezPourUneRecette = [
  (recette) => recette.ingredients.length > 0 || recette.etapes.length > 0,
  { message: 'Une recette demande au moins des ingrédients ou des étapes.' },
];

const recetteProposee = recetteSansTitre.refine(...assezPourUneRecette);

const reussite = (donnees) => ({ content: [{ type: 'text', text: JSON.stringify(donnees) }] });

/**
 * Un refus rendu à Claude **comme résultat**, et non comme panne : il le lit,
 * comprend — « cette recette n'existe plus » — et peut se reprendre.
 */
const echec = (message) => ({ isError: true, content: [{ type: 'text', text: message }] });

/**
 * @param {import('@modelcontextprotocol/server').McpServer} serveur
 * @param {object} p
 * @param {{id: number, username: string}} p.compte  la personne connectée
 * @param {string[]} p.modules                       les modules montés
 */
export function enregistrerOutils(serveur, { compte, modules }) {
  const appeler = (methode, chemin, corps) => appelerMinka(compte, methode, chemin, corps);

  /** Enregistre un outil, avec une ligne de journal et les refus de Minka rendus lisibles. */
  const outil = (nom, definition, executer) => {
    serveur.registerTool(nom, definition, async (args) => {
      console.log(`[mcp] ${compte.username} → ${nom}`);
      try {
        return await executer(args);
      } catch (erreur) {
        if (erreur instanceof ErreurMinka) return echec(erreur.message);
        throw erreur;
      }
    });
  };

  // --- Planning ---------------------------------------------------------------

  if (modules.includes('menus')) {
    outil(
      'lire_planning',
      {
        title: 'Lire le planning des repas',
        description:
          'Les repas prévus, jour par jour, midi et soir, cases vides comprises (null). ' +
          'Sans paramètre : les quatre semaines passées, la semaine en cours et la suivante — ' +
          'de quoi éviter de reproposer ce qu’on vient de manger, et voir ce qui est déjà posé ' +
          'sur la semaine à préparer. La réponse donne aussi la date du jour.',
        inputSchema: z.object({
          du: isoDate.optional().describe('Premier jour lu (AAAA-MM-JJ).'),
          au: isoDate.optional().describe(`Dernier jour lu (AAAA-MM-JJ), ${JOURS_MAX} jours au plus après le premier.`),
        }),
        annotations: LECTURE,
      },
      async ({ du, au }) => {
        const aujourdhui = aujourdhuiLocal();
        const defaut = periodeParDefaut(aujourdhui);
        const periode = { du: du ?? defaut.du, au: au ?? defaut.au };

        if (periode.du > periode.au) return echec('« du » doit précéder « au ».');
        if (joursCouverts(periode.du, periode.au) > JOURS_MAX) {
          return echec(`La période dépasse ${JOURS_MAX} jours ; lis-la en plusieurs fois.`);
        }

        const { entries } = await appeler('GET', `/menus/plan?from=${periode.du}&to=${periode.au}`);
        return reussite(planningLisible({ ...periode, entrees: entries, aujourdhui }));
      },
    );
  }

  // --- Recettes ---------------------------------------------------------------

  if (modules.includes('recipes')) {
    outil(
      'lister_recettes',
      {
        title: 'Lister les recettes du foyer',
        description:
          'Le répertoire : titre, parts, étiquettes, noms des ingrédients, et aPreparation. ' +
          'Une recette dont aPreparation vaut true fait foi : désigne-la par son titre exact. ' +
          'Une recette dont aPreparation vaut false n’est qu’une ébauche, à compléter.',
        inputSchema: z.object({}),
        annotations: LECTURE,
      },
      async () => {
        const { recipes } = await appeler('GET', '/recipes/items');
        return reussite(repertoireLisible(recipes));
      },
    );

    outil(
      'lire_recette',
      {
        title: 'Lire une recette',
        description: 'Une recette entière : ingrédients avec leurs quantités, étapes, remarques.',
        inputSchema: z.object({
          id: z.number().int().positive().describe('L’identifiant donné par lister_recettes.'),
        }),
        annotations: LECTURE,
      },
      async ({ id }) => {
        const { recipe } = await appeler('GET', `/recipes/items/${id}`);
        return reussite(recetteLisible(recipe));
      },
    );
  }

  // --- Frigo --------------------------------------------------------------------

  if (modules.includes('fridge')) {
    outil(
      'lire_frigo',
      {
        title: 'Lire le contenu du frigo',
        description:
          'Les produits du frigo, avec leur quantité et leur date limite (avant), ' +
          'les plus pressés en tête : ce qu’il faut finir cette semaine.',
        inputSchema: z.object({}),
        annotations: LECTURE,
      },
      async () => {
        const { items } = await appeler('GET', '/fridge/items');
        return reussite(frigoLisible(items));
      },
    );
  }

  // --- Écrire -------------------------------------------------------------------

  const recettesPresentes = modules.includes('recipes');

  if (modules.includes('menus')) {
    outil(
      'poser_repas',
      {
        title: 'Poser des repas dans le planning',
        description:
          'Pose jusqu’à quatorze repas d’un coup — une semaine. À n’appeler qu’une fois la personne ' +
          'd’accord avec la proposition. Un plat du répertoire dont aPreparation vaut true : son titre ' +
          'exact, sans recette. Un plat nouveau, ou une ébauche : joins sa recette entière. Restes, resto, ' +
          'repas chez quelqu’un : un titre seul. Une case déjà occupée par autre chose n’est jamais ' +
          'écrasée : l’outil refuse tout et la nomme ; redemande avec remplacer: true seulement si la ' +
          'personne veut la remplacer. Lis le bilan : une recette « conservée » est celle du foyer, ' +
          'gardée telle quelle.',
        inputSchema: z.object({
          repas: z
            .array(
              z.object({
                date: isoDate.describe('AAAA-MM-JJ'),
                creneau: z.enum(['midi', 'soir']),
                plat: titre.describe('Le titre du plat, tel qu’il s’affichera dans le planning.'),
                recette: recetteProposee
                  .optional()
                  .describe('Seulement pour un plat absent du répertoire, ou qui n’y est qu’une ébauche.'),
              }),
            )
            .min(1)
            .max(14),
          remplacer: z
            .boolean()
            .default(false)
            .describe('Écraser les cases occupées. Seulement à la demande explicite de la personne.'),
        }),
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      },
      async ({ repas, remplacer }) => {
        const doubles = casesEnDouble(repas);
        if (doubles.length > 0) return echec(`Case demandée deux fois : ${doubles.join(', ')}. Rien n’a été posé.`);

        /*
         * Le planning est lu d'abord, et rien n'est écrit s'il refuse : c'est
         * ce qui évite de créer des recettes pour une semaine qui ne sera pas
         * posée.
         */
        const { du, au } = periodeDesRepas(repas);
        const { entries } = await appeler('GET', `/menus/plan?from=${du}&to=${au}`);

        const conflits = casesEnConflit(repas, entries);
        if (conflits.length > 0 && !remplacer) {
          return echec(
            'Rien n’a été posé : ces cases sont déjà prises — ' +
              conflits.map((c) => `${c.case} (${c.occupeePar})`).join(', ') +
              '. Propose une autre case, ou redemande avec remplacer: true si la personne veut les remplacer.',
          );
        }

        /*
         * Les recettes d'abord, le planning ensuite : deux modules, deux
         * transactions, et l'ordre de l'import texte. Sans module recettes,
         * tout se pose en texte libre.
         */
        let resolus = repas.map(({ plat }) => ({ title: plat, recipeId: null }));
        let recettes = null;
        if (recettesPresentes) {
          const reponse = await appeler('POST', '/recipes/resolve', {
            plats: repas.map(({ plat, recette }) => recettePourMinka(plat, recette)),
          });
          resolus = reponse.plats;
          recettes = reponse.bilan;
        }

        try {
          await appeler('PATCH', '/menus/plan', { cases: casesPourPlanning(repas, resolus, entries) });
        } catch (erreur) {
          if (erreur instanceof ErreurMinka && erreur.statut === 409) {
            return echec(
              'Le planning a changé pendant la pose — quelqu’un y a touché depuis Minka —, et rien n’y a ' +
                'été écrit. Les recettes, elles, sont enregistrées. Relis le planning, puis repose.',
            );
          }
          throw erreur;
        }

        return reussite(bilanDePose({ repas, resolus, recettes }));
      },
    );
  }

  if (recettesPresentes) {
    outil(
      'enregistrer_recette',
      {
        title: 'Enregistrer une recette',
        description:
          'Ajoute une recette au répertoire sans la planifier — quand la personne veut garder une idée ' +
          'pour plus tard. Même règle que poser_repas : une ébauche du même nom est complétée, une ' +
          'recette qui a sa préparation est gardée telle quelle.',
        inputSchema: recetteSansTitre.extend({ titre }).refine(...assezPourUneRecette),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      },
      async ({ titre: intitule, ...recette }) => {
        const { plats, bilan } = await appeler('POST', '/recipes/resolve', {
          plats: [recettePourMinka(intitule, recette)],
        });
        const [{ title, recipeId }] = plats;

        const sort = bilan.creees.length > 0
          ? 'créée'
          : bilan.completees.length > 0
            ? 'complétée : ce n’était qu’une ébauche'
            : 'gardée telle quelle : le foyer en a déjà la préparation, qui fait foi';

        return reussite({ id: recipeId, titre: title, resultat: `Recette ${sort}.` });
      },
    );

    outil(
      'modifier_recette',
      {
        title: 'Modifier une recette du répertoire',
        description:
          'Réécrit une recette existante. Seulement quand la personne demande explicitement de corriger ' +
          'ou de changer une recette du répertoire — jamais pour planifier. Seuls les champs fournis ' +
          'changent ; une liste fournie (ingrédients, étapes, étiquettes) remplace l’ancienne en entier.',
        inputSchema: z
          .object({
            id: z.number().int().positive().describe('L’identifiant donné par lister_recettes.'),
            titre: titre.optional(),
            parts: champsDeRecette.parts.nullable().optional(),
            etiquettes: champsDeRecette.etiquettes.optional(),
            remarques: champsDeRecette.remarques.nullable().optional(),
            ingredients: champsDeRecette.ingredients.optional(),
            etapes: champsDeRecette.etapes.optional(),
          })
          .refine((champs) => Object.keys(champs).length > 1, { message: 'Aucune modification fournie.' }),
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      },
      async ({ id, ...champs }) => {
        const { recipe } = await appeler('PATCH', `/recipes/items/${id}`, modificationPourMinka(champs));
        return reussite(recetteLisible(recipe));
      },
    );
  }
}
