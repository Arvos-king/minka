/**
 * L'adresse du connecteur : `/api/mcp`.
 *
 * Trois choses s'y passent, dans cet ordre, et l'ordre compte :
 *
 *   1. **le jeton est vérifié avant tout.** Absent ou invalide, la réponse est
 *      un 401 dont l'en-tête `WWW-Authenticate` mène Claude au document de
 *      découverte, puis à Pocket-ID. Ce refus doit partir *avant* le SDK MCP :
 *      une fois l'outil lancé, tout ce qu'il rend est emballé dans un 200, et
 *      un 200 ne déclenche jamais la connexion ;
 *   2. la personne reconnue par Pocket-ID est rapportée à son compte Minka —
 *      `MCP_USERS` est aussi la liste de qui a le droit d'entrer ;
 *   3. un serveur MCP est construit **pour cette seule requête**, lié à ce
 *      compte, puis jeté. Rien n'est gardé d'un appel à l'autre : pas de
 *      session à expirer, rien à perdre au redémarrage du conteneur.
 *
 * Le document de découverte (RFC 9728) est servi ici même, sous `/api/mcp`, et
 * non à la racine du domaine : Claude le trouve par l'en-tête du 401, et une
 * route `/.well-known` à la racine aurait demandé de toucher au nginx du socle.
 */

import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { Router } from 'express';
import { createRemoteJWKSet } from 'jose';

import { stmt } from '../../db/index.js';
import { porteeDemandee } from './config.js';
import { INSTRUCTIONS } from './instructions.js';
import { modulesPresents } from './interne.js';
import { JetonRefuse, creerVerificateur, jetonDeLaRequete, permissionsDu } from './jeton.js';
import { enregistrerOutils } from './outils.js';

/**
 * Les clés publiques de Pocket-ID, cherchées au premier jeton puis gardées en
 * cache par `jose`, qui les relit seul quand Pocket-ID en change.
 *
 * Leur adresse vient du document de découverte de l'émetteur, sauf si
 * `MCP_JWKS_URL` la donne : c'est le recours quand le conteneur ne peut pas
 * joindre l'adresse publique de Pocket-ID depuis le serveur lui-même — une box
 * qui ne fait pas de « hairpin NAT ». Une découverte qui échoue est retentée à
 * l'appel suivant.
 */
function clesDePocketId({ emetteur, jwks }) {
  let jeu = null;

  return async (entete, jeton) => {
    if (!jeu) {
      let adresse = jwks;
      if (!adresse) {
        const reponse = await fetch(`${emetteur}/.well-known/openid-configuration`);
        if (!reponse.ok) throw new Error(`découverte de Pocket-ID : ${reponse.status}`);
        adresse = (await reponse.json()).jwks_uri;
      }
      jeu = createRemoteJWKSet(new URL(adresse));
    }
    return jeu(entete, jeton);
  };
}

/**
 * La requête Express, redite en requête web pour le SDK.
 *
 * Le corps n'est pas recopié : `express.json()` l'a déjà lu, et le SDK le
 * reçoit tout analysé (`parsedBody`).
 */
function requeteWeb(req, ressource) {
  const entetes = new Headers();
  for (const [nom, valeur] of Object.entries(req.headers)) {
    if (['host', 'connection', 'content-length', 'transfer-encoding'].includes(nom)) continue;
    for (const une of [valeur].flat()) if (une !== undefined) entetes.append(nom, une);
  }
  return new Request(new URL(req.originalUrl, ressource), { method: req.method, headers: entetes });
}

/**
 * La réponse web du SDK, rendue par Express — en flux : les clients de 2025
 * reçoivent un flux SSE.
 *
 * Ni les en-têtes de connexion ni la longueur ne passent. La réponse du SDK
 * n'a voyagé sur aucun fil ; celle d'Express part sur la connexion ouverte par
 * nginx, et c'est à Node de la découper et de dire si elle reste ouverte.
 * Recopié, le `Connection: keep-alive` du flux SSE gardait ouverte la
 * connexion que nginx demande de fermer.
 *
 * Le reste passe tel quel. `X-Accel-Buffering: no` fait livrer le flux par le
 * nginx du stack sans tampon ; nginx le garde pour lui, NPMplus ne le voit
 * pas. `Cache-Control: no-cache, no-transform` ne remplace aucune règle :
 * l'API ne pose de `Cache-Control` nulle part, aucun cache ne garde la réponse
 * à un POST porteur d'un jeton, et `no-transform` demande aux intermédiaires
 * de ne pas retoucher le flux.
 */
async function repondre(reponse, res) {
  res.status(reponse.status);
  for (const [nom, valeur] of reponse.headers) {
    if (['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'content-length'].includes(nom)) continue;
    res.setHeader(nom, valeur);
  }
  if (!reponse.body) return res.end();
  return pipeline(Readable.fromWeb(reponse.body), res);
}

/** Le connecteur éteint : dire pourquoi, plutôt qu'un 404 qui laisserait chercher. */
export function routeurEteint() {
  const router = Router();
  router.all('/{*chemin}', (req, res) => {
    res.status(503).json({
      error: {
        code: 'MCP_DISABLED',
        message: "Le connecteur Claude n'est pas configuré (variables MCP_* absentes, voir .env.example).",
      },
    });
  });
  return router;
}

export function routeurConnecteur(configuration) {
  const router = Router();

  const portee = porteeDemandee(configuration);
  const documentDeDecouverte = `${configuration.ressource}/oauth-protected-resource`;

  const verifier = creerVerificateur({ ...configuration, cles: clesDePocketId(configuration) });

  /*
   * Le SDK sert les deux générations du protocole, chaque requête par une
   * instance neuve, et c'est celle du client qui décide de la forme de la
   * réponse :
   *
   *   — un client de 2025, comme claude.ai aujourd'hui, reçoit toujours un
   *     flux SSE (`event: message`), fermé sur la dernière réponse ;
   *   — un client du protocole 2026-07-28 reçoit du JSON tant qu'aucun outil
   *     ne parle avant d'avoir fini — aucun ne le fait —, un flux SSE sinon :
   *     c'est le mode `auto`, par défaut.
   *
   * `responseMode` ne règle que ce second cas, et `'json'` n'y ferait que
   * taire ce qu'un outil dirait en cours de route ; le SDK en avertit par un
   * `console.warn` à chaque démarrage. L'option n'a donc pas sa place ici.
   */
  const mcp = createMcpHandler(
    async ({ authInfo }) => {
      const serveur = new McpServer(
        { name: 'minka', title: 'Minka', version: '1.0.0' },
        { instructions: INSTRUCTIONS },
      );
      enregistrerOutils(serveur, { compte: authInfo.extra.compte, modules: await modulesPresents() });
      return serveur;
    },
    {
      onerror: (erreur) => console.error('[mcp]', erreur),
    },
  );

  router.get('/oauth-protected-resource', (req, res) => {
    res.json({
      resource: configuration.ressource,
      authorization_servers: [configuration.emetteur],
      scopes_supported: portee.split(' '),
      bearer_methods_supported: ['header'],
      resource_name: 'Minka',
    });
  });

  router.post('/', async (req, res) => {
    const jeton = jetonDeLaRequete(req.get('authorization'));

    let payload;
    try {
      payload = await verifier(jeton);
    } catch (erreur) {
      if (!(erreur instanceof JetonRefuse)) throw erreur;

      // Le premier appel de Claude arrive toujours sans jeton : c'est la
      // poignée de main, pas un incident, et rien ne mérite d'être noté.
      if (jeton) console.warn(`[mcp] jeton refusé : ${erreur.message}`);

      const parametres =
        erreur.statut === 403
          ? `error="insufficient_scope", scope="${portee}", resource_metadata="${documentDeDecouverte}"`
          : `error="invalid_token", resource_metadata="${documentDeDecouverte}", scope="${portee}"`;

      res
        .status(erreur.statut)
        .set('WWW-Authenticate', `Bearer ${parametres}`)
        .json({ error: erreur.statut === 403 ? 'insufficient_scope' : 'invalid_token', error_description: erreur.message });
      return;
    }

    const identifiant = configuration.comptes.get(payload.sub);
    const compte = identifiant
      ? stmt('SELECT id, username, display_name FROM users WHERE username = ?').get(identifiant)
      : null;

    if (!compte) {
      // C'est ainsi qu'on apprend son `sub` à la mise en service, sans le
      // chercher dans Pocket-ID.
      console.warn(
        identifiant
          ? `[mcp] MCP_USERS désigne « ${identifiant} », qui n'est pas un compte Minka.`
          : `[mcp] sujet inconnu « ${payload.sub} » : ajoute-le à MCP_USERS pour lui ouvrir Minka.`,
      );
      // Un 403 sans `insufficient_scope` est définitif pour Claude : se
      // reconnecter ne changerait rien, et il l'affiche comme une erreur.
      res.status(403).json({
        error: { code: 'MCP_FORBIDDEN', message: "Ce compte Pocket-ID n'a pas accès à Minka." },
      });
      return;
    }

    const reponse = await mcp.fetch(requeteWeb(req, configuration.ressource), {
      parsedBody: req.body,
      authInfo: {
        token: jeton,
        clientId: payload.azp ?? payload.client_id ?? '',
        scopes: permissionsDu(payload),
        expiresAt: payload.exp,
        extra: { compte },
      },
    });
    await repondre(reponse, res);
  });

  // Sans état, il n'y a ni flux à ouvrir ni session à fermer.
  router.all('/', (req, res) => {
    res.set('Allow', 'POST').status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Le connecteur ne répond qu’en POST.' },
    });
  });

  return router;
}
