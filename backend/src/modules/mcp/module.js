import { stmt } from '../../db/index.js';
import { lireConfiguration } from './config.js';
import { routeurConnecteur, routeurEteint } from './routes.js';
import { T } from './textes.js';

/**
 * Le connecteur Claude : un serveur MCP qui laisse Claude lire le planning, le
 * répertoire et le frigo, et poser la semaine qu'on a préparée ensemble.
 *
 * Module sans interface, comme la sauvegarde. Il est **public** au sens du
 * socle (`requiresAuth: false`) parce qu'il ne reconnaît pas le cookie de
 * session : il vérifie lui-même les jetons que Pocket-ID délivre à Claude.
 *
 * La configuration est lue au chargement, mais une erreur n'est levée qu'à
 * `init` : c'est là que le socle attend qu'un module refuse de démarrer, avec
 * un message qui dit quoi corriger.
 */

let configuration;
let erreur = null;
try {
  configuration = lireConfiguration(process.env);
} catch (probleme) {
  configuration = { actif: false };
  erreur = probleme;
}

function init() {
  if (erreur) throw new Error(`[mcp] ${erreur.message}`);

  if (!configuration.actif) {
    console.log(T.journal.eteint);
    return;
  }

  // Un identifiant mal tapé dans MCP_USERS ne se verrait qu'à la première
  // connexion de Claude, refusée sans qu'on comprenne pourquoi.
  for (const identifiant of configuration.comptes.values()) {
    if (!stmt('SELECT 1 FROM users WHERE username = ?').get(identifiant)) {
      console.warn(T.journal.compteInconnu(identifiant));
    }
  }

  console.log(T.journal.actif(configuration.ressource, configuration.emetteur, configuration.comptes.size));
}

export default {
  name: 'mcp',
  basePath: '/api/mcp',
  requiresAuth: false,
  router: configuration.actif ? routeurConnecteur(configuration) : routeurEteint(),
  init,
};
