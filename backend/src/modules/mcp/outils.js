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
  frigoLisible,
  joursCouverts,
  periodeParDefaut,
  planningLisible,
  recetteLisible,
  repertoireLisible,
} from './traduction.js';

/** Rien n'est modifié, et rien ne sort de Minka. */
const LECTURE = { readOnlyHint: true, openWorldHint: false };

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
}
