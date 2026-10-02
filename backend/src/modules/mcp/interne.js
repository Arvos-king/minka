/**
 * Les appels du connecteur aux autres modules de Minka.
 *
 * Le connecteur ne lit ni n'écrit aucune table qui ne soit à lui : il passe par
 * les mêmes routes HTTP que l'interface, en boucle locale, avec une session au
 * nom de la personne que Pocket-ID a reconnue. C'est la règle de « Faire
 * dialoguer deux modules » (README), appliquée côté serveur :
 *
 *   — les modules restent maîtres de leurs données et de leurs règles — la
 *     validation, la « recette du foyer fait foi », la condition `attendu` qui
 *     empêche d'écraser le geste de l'autre ;
 *   — un module absent fait simplement disparaître ses outils ;
 *   — ce que Claude écrit porte le nom de la personne, comme si elle l'avait
 *     tapé elle-même.
 *
 * Le prix est un aller-retour local par appel, sans conséquence à cette échelle.
 */

import { config } from '../../config/index.js';
import { signSessionToken } from '../../lib/tokens.js';

const BASE = `http://127.0.0.1:${config.port}/api`;

/** Un refus de Minka, à rendre tel quel à Claude : il est rédigé pour être lu. */
export class ErreurMinka extends Error {
  constructor(statut, message) {
    super(message);
    this.name = 'ErreurMinka';
    this.statut = statut;
  }
}

/**
 * Le message d'erreur de Minka, détails de validation compris : « Données
 * invalides » seul ne dirait pas à Claude quelle étape est trop longue.
 */
function messageDErreur(statut, corps) {
  const erreur = corps?.error;
  if (!erreur) return `Minka a répondu ${statut}.`;

  const details = Array.isArray(erreur.details)
    ? erreur.details.map((detail) => `${detail.champ} : ${detail.message}`)
    : [];
  return [erreur.message, ...details].join(' — ');
}

/**
 * Appelle une route de Minka au nom d'un compte.
 *
 * La session est signée à chaque appel et ne quitte jamais le processus : elle
 * part vers 127.0.0.1, et n'est écrite nulle part.
 *
 * @param {{id: number, username: string}} compte
 * @param {string} methode
 * @param {string} chemin   sous `/api`, par exemple `/menus/plan?from=…`
 * @param {unknown} [corps]
 */
export async function appelerMinka(compte, methode, chemin, corps) {
  const reponse = await fetch(BASE + chemin, {
    method: methode,
    headers: {
      cookie: `${config.session.cookieName}=${signSessionToken(compte)}`,
      ...(corps === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });

  const donnees = await reponse.json().catch(() => null);
  if (!reponse.ok) throw new ErreurMinka(reponse.status, messageDErreur(reponse.status, donnees));
  return donnees;
}

/**
 * Les modules montés, d'après `/api/health` — la même source que l'interface
 * (`useServerModule`).
 *
 * La liste ne change pas tant que le processus vit : elle est lue une fois, et
 * relue seulement si la première lecture a échoué.
 */
let modules = null;

export function modulesPresents() {
  modules ??= fetch(`${BASE}/health`)
    .then((reponse) => reponse.json())
    .then((donnees) => donnees.modules ?? [])
    .catch((erreur) => {
      modules = null;
      throw erreur;
    });
  return modules;
}
