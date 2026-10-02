/**
 * Réglages du connecteur, lus dans l'environnement.
 *
 * Le connecteur est **facultatif** : sans aucune variable `MCP_*`, il reste
 * éteint, et son adresse répond 503 en le disant. Une installation qui ne
 * s'en sert pas n'a rien à renseigner.
 *
 * Une configuration **à moitié** remplie, en revanche, arrête le démarrage —
 * même principe que le socle (`config/index.js`). Un connecteur exposé sur
 * Internet qui vérifierait mal ses jetons serait la pire des trappes, et une
 * variable oubliée doit se voir au lancement, pas au premier appel de Claude.
 *
 * Fonction pure, l'environnement en paramètre : c'est ce qui la rend testable.
 */

const OBLIGATOIRES = ['MCP_RESOURCE_URL', 'MCP_ISSUER', 'MCP_USERS'];
const FACULTATIVES = ['MCP_JWKS_URL', 'MCP_PERMISSION'];

/**
 * Une adresse HTTPS — ou HTTP sur la machine elle-même, pour le développement.
 *
 * La barre oblique finale est retirée : Pocket-ID l'ôte de l'identifiant de
 * ressource qu'il inscrit dans le jeton, et l'audience se compare à la lettre.
 */
function lireAdresse(nom, brut) {
  let adresse;
  try {
    adresse = new URL(brut);
  } catch {
    throw new Error(`${nom} n'est pas une adresse valide (reçu : "${brut}").`);
  }

  const locale = ['localhost', '127.0.0.1', '[::1]'].includes(adresse.hostname);
  if (adresse.protocol !== 'https:' && !(adresse.protocol === 'http:' && locale)) {
    throw new Error(`${nom} doit être une adresse HTTPS (reçu : "${brut}").`);
  }

  return adresse.href.replace(/\/+$/, '');
}

/**
 * `MCP_USERS` : à quel compte Minka correspond chaque personne de Pocket-ID.
 *
 * « <sub>=<identifiant>[,<sub>=<identifiant>] ». Le `sub` est l'identifiant
 * stable que Pocket-ID inscrit dans ses jetons ; inutile de le chercher, le
 * journal le donne à la première connexion refusée.
 *
 * C'est aussi la liste de qui a le droit d'entrer : un jeton valide pour
 * quelqu'un d'autre est refusé.
 */
function lireComptes(brut) {
  const comptes = new Map();

  for (const entree of brut.split(',').map((morceau) => morceau.trim()).filter(Boolean)) {
    const egal = entree.indexOf('=');
    const sujet = egal === -1 ? '' : entree.slice(0, egal).trim();
    const identifiant = egal === -1 ? '' : entree.slice(egal + 1).trim().toLowerCase();

    if (sujet === '' || identifiant === '') {
      throw new Error(`MCP_USERS : « ${entree} » n'a pas la forme <sub>=<identifiant>.`);
    }
    comptes.set(sujet, identifiant);
  }

  if (comptes.size === 0) throw new Error('MCP_USERS ne désigne aucun compte.');
  return comptes;
}

/**
 * @param {Record<string, string|undefined>} env
 * @returns {{actif: false} | {actif: true, ressource: string, emetteur: string,
 *   jwks: string|null, permission: string|null, comptes: Map<string, string>}}
 * @throws {Error} si la configuration n'est remplie qu'à moitié, ou mal.
 */
export function lireConfiguration(env) {
  const valeur = (nom) => (env[nom] ?? '').trim();
  const renseignees = [...OBLIGATOIRES, ...FACULTATIVES].filter((nom) => valeur(nom) !== '');

  if (renseignees.length === 0) return { actif: false };

  const manquantes = OBLIGATOIRES.filter((nom) => valeur(nom) === '');
  if (manquantes.length > 0) {
    throw new Error(
      `connecteur Claude à moitié configuré : ${manquantes.join(', ')} ` +
        `manque${manquantes.length > 1 ? 'nt' : ''} (voir .env.example).`,
    );
  }

  const permission = valeur('MCP_PERMISSION');
  if (/\s/.test(permission)) {
    throw new Error(`MCP_PERMISSION est une seule permission, sans espace (reçu : "${permission}").`);
  }

  return {
    actif: true,
    ressource: lireAdresse('MCP_RESOURCE_URL', valeur('MCP_RESOURCE_URL')),
    emetteur: lireAdresse('MCP_ISSUER', valeur('MCP_ISSUER')),
    jwks: valeur('MCP_JWKS_URL') === '' ? null : lireAdresse('MCP_JWKS_URL', valeur('MCP_JWKS_URL')),
    permission: permission === '' ? null : permission,
    comptes: lireComptes(valeur('MCP_USERS')),
  };
}

/**
 * Les permissions que Claude doit demander à Pocket-ID.
 *
 * `openid` toujours, la permission de l'API quand il y en a une : c'est elle
 * qui fait inscrire Minka dans l'audience du jeton.
 */
export const porteeDemandee = (configuration) =>
  ['openid', configuration.permission].filter(Boolean).join(' ');
