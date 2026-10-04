/**
 * Les outils que Claude peut appeler.
 *
 * Chacun n'est proposé que si le module dont il dépend est monté : sans frigo,
 * pas de `lire_frigo`, et Claude ne s'y essaie pas. Tous passent par les
 * routes HTTP des modules (voir `interne.js`), au nom de la personne
 * connectée.
 *
 * Les descriptions sont écrites pour Claude, qui n'a qu'elles pour choisir :
 * elles disent quand se servir de l'outil, pas seulement ce qu'il fait. Elles
 * vivent dans `textes.js`, comme les noms des outils, qui suivent la langue de
 * l'instance.
 */

import { z } from 'zod';

import { isoDate } from '../../lib/schemas.js';
import { ErreurMinka, appelerMinka } from './interne.js';
import { T } from './textes.js';
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
  parts: z.number().int().min(1).max(50).describe(T.champs.parts),
  etiquettes: z.array(z.string().trim().min(1).max(30)).max(12).describe(T.champs.etiquettes),
  remarques: z.string().trim().max(4000).describe(T.champs.remarques),
  ingredients: z
    .array(
      z.object({
        nom: z.string().trim().min(1).max(120),
        quantite: z.string().trim().max(60).optional().describe(T.champs.quantite),
      }),
    )
    .max(60)
    .describe(T.champs.ingredients),
  etapes: z.array(z.string().trim().min(1).max(500)).max(60).describe(T.champs.etapes),
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
  { message: T.refus.recetteVide },
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

  const { lirePlanning, listerRecettes, lireRecette, lireFrigo, poserRepas } = T.outils;
  const { enregistrerRecette, modifierRecette } = T.outils;

  if (modules.includes('menus')) {
    outil(
      lirePlanning.nom,
      {
        title: lirePlanning.titre,
        description: lirePlanning.description,
        inputSchema: z.object({
          du: isoDate.optional().describe(lirePlanning.du),
          au: isoDate.optional().describe(lirePlanning.au(JOURS_MAX)),
        }),
        annotations: LECTURE,
      },
      async ({ du, au }) => {
        const aujourdhui = aujourdhuiLocal();
        const defaut = periodeParDefaut(aujourdhui);
        const periode = { du: du ?? defaut.du, au: au ?? defaut.au };

        if (periode.du > periode.au) return echec(T.refus.duAvantAu);
        if (joursCouverts(periode.du, periode.au) > JOURS_MAX) {
          return echec(T.refus.periodeTropLongue(JOURS_MAX));
        }

        const { entries } = await appeler('GET', `/menus/plan?from=${periode.du}&to=${periode.au}`);
        return reussite(planningLisible({ ...periode, entrees: entries, aujourdhui }));
      },
    );
  }

  // --- Recettes ---------------------------------------------------------------

  if (modules.includes('recipes')) {
    outil(
      listerRecettes.nom,
      {
        title: listerRecettes.titre,
        description: listerRecettes.description,
        inputSchema: z.object({}),
        annotations: LECTURE,
      },
      async () => {
        const { recipes } = await appeler('GET', '/recipes/items');
        return reussite(repertoireLisible(recipes));
      },
    );

    outil(
      lireRecette.nom,
      {
        title: lireRecette.titre,
        description: lireRecette.description,
        inputSchema: z.object({
          id: z.number().int().positive().describe(lireRecette.id),
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
      lireFrigo.nom,
      {
        title: lireFrigo.titre,
        description: lireFrigo.description,
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
      poserRepas.nom,
      {
        title: poserRepas.titre,
        description: poserRepas.description,
        inputSchema: z.object({
          repas: z
            .array(
              z.object({
                date: isoDate.describe(poserRepas.date),
                creneau: z.enum(['midi', 'soir']),
                plat: titre.describe(poserRepas.plat),
                recette: recetteProposee.optional().describe(poserRepas.recette),
              }),
            )
            .min(1)
            .max(14),
          remplacer: z.boolean().default(false).describe(poserRepas.remplacer),
        }),
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      },
      async ({ repas, remplacer }) => {
        const doubles = casesEnDouble(repas);
        if (doubles.length > 0) return echec(T.refus.caseEnDouble(doubles.join(', ')));

        /*
         * Le planning est lu d'abord, et rien n'est écrit s'il refuse : c'est
         * ce qui évite de créer des recettes pour une semaine qui ne sera pas
         * posée.
         */
        const { du, au } = periodeDesRepas(repas);
        const { entries } = await appeler('GET', `/menus/plan?from=${du}&to=${au}`);

        const conflits = casesEnConflit(repas, entries);
        if (conflits.length > 0 && !remplacer) {
          return echec(T.refus.casesPrises(conflits.map((c) => `${c.case} (${c.occupeePar})`).join(', ')));
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
            return echec(T.refus.planningChange);
          }
          throw erreur;
        }

        return reussite(bilanDePose({ repas, resolus, recettes }));
      },
    );
  }

  if (recettesPresentes) {
    outil(
      enregistrerRecette.nom,
      {
        title: enregistrerRecette.titre,
        description: enregistrerRecette.description,
        inputSchema: recetteSansTitre.extend({ titre }).refine(...assezPourUneRecette),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      },
      async ({ titre: intitule, ...recette }) => {
        const { plats, bilan } = await appeler('POST', '/recipes/resolve', {
          plats: [recettePourMinka(intitule, recette)],
        });
        const [{ title, recipeId }] = plats;

        const resultat = bilan.creees.length > 0
          ? T.resultats.creee
          : bilan.completees.length > 0
            ? T.resultats.completee
            : T.resultats.gardee;

        return reussite({ id: recipeId, titre: title, resultat });
      },
    );

    outil(
      modifierRecette.nom,
      {
        title: modifierRecette.titre,
        description: modifierRecette.description,
        inputSchema: z
          .object({
            id: z.number().int().positive().describe(modifierRecette.id),
            titre: titre.optional(),
            parts: champsDeRecette.parts.nullable().optional(),
            etiquettes: champsDeRecette.etiquettes.optional(),
            remarques: champsDeRecette.remarques.nullable().optional(),
            ingredients: champsDeRecette.ingredients.optional(),
            etapes: champsDeRecette.etapes.optional(),
          })
          .refine((champs) => Object.keys(champs).length > 1, { message: T.refus.aucuneModification }),
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      },
      async ({ id, ...champs }) => {
        const { recipe } = await appeler('PATCH', `/recipes/items/${id}`, modificationPourMinka(champs));
        return reussite(recetteLisible(recipe));
      },
    );
  }
}
