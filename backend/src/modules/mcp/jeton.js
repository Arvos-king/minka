/**
 * Vérification des jetons que Claude présente.
 *
 * Minka ne délivre rien : c'est Pocket-ID qui authentifie la personne (par
 * passkey) et signe un jeton destiné à Minka. Il ne reste ici qu'à le relire,
 * sans jamais rappeler Pocket-ID pour chaque requête — la signature suffit,
 * vérifiée avec les clés publiques qu'il publie.
 *
 * Quatre contrôles, tous nécessaires :
 *   — la **signature**, avec les clés de Pocket-ID ;
 *   — l'**émetteur** : un jeton signé ailleurs ne vaut rien ici ;
 *   — l'**audience** : un jeton délivré pour une autre application du foyer,
 *     par le même Pocket-ID, ne doit pas ouvrir Minka. C'est le contrôle qui
 *     empêche une application compromise de rejouer ses jetons ici ;
 *   — l'**échéance**.
 *
 * Le jeu de clés est injecté : en service, celui que publie Pocket-ID ; dans
 * les tests, un jeu local. C'est ce qui permet de vérifier tout ceci sans
 * réseau.
 */

import { errors, jwtVerify } from 'jose';

/** Refus d'un jeton : `statut` dit si l'on redemande une connexion (401) ou une permission (403). */
export class JetonRefuse extends Error {
  constructor(statut, raison) {
    super(raison);
    this.name = 'JetonRefuse';
    this.statut = statut;
  }
}

/**
 * Les permissions qu'un jeton porte.
 *
 * Leur emplacement varie d'un fournisseur à l'autre — `scope` en chaîne
 * (RFC 9068), `scp` en tableau, `permissions` en tableau —, et la
 * documentation de Pocket-ID ne le précise pas. Les trois sont lus : c'est
 * plus sûr que de parier sur un seul et de refuser tout le monde.
 */
export function permissionsDu(payload) {
  const lues = [];
  for (const champ of ['scope', 'scp', 'permissions']) {
    const valeur = payload?.[champ];
    if (typeof valeur === 'string') lues.push(...valeur.split(/\s+/));
    else if (Array.isArray(valeur)) lues.push(...valeur.filter((p) => typeof p === 'string'));
  }
  return [...new Set(lues.filter(Boolean))];
}

/**
 * Une tolérance d'horloge d'une demi-minute : l'unRAID et Pocket-ID ne sont
 * pas forcément réglés à la seconde près, et un jeton tout juste émis ne doit
 * pas être refusé pour « pas encore valide ».
 */
const TOLERANCE_HORLOGE = 30;

/**
 * @param {object} p
 * @param {string} p.emetteur
 * @param {string} p.ressource      l'adresse du connecteur, attendue en audience
 * @param {string|null} p.permission
 * @param {Function} p.cles         un jeu de clés au sens de `jose`
 * @returns {(jeton: string) => Promise<object>} le contenu du jeton vérifié.
 */
export function creerVerificateur({ emetteur, ressource, permission, cles }) {
  return async function verifier(jeton) {
    if (!jeton) throw new JetonRefuse(401, 'jeton absent');

    let payload;
    try {
      ({ payload } = await jwtVerify(jeton, cles, {
        issuer: emetteur,
        audience: ressource,
        clockTolerance: TOLERANCE_HORLOGE,
      }));
    } catch (erreur) {
      throw new JetonRefuse(401, raisonDuRefus(erreur));
    }

    if (typeof payload.sub !== 'string' || payload.sub === '') {
      throw new JetonRefuse(401, 'jeton sans sujet');
    }
    if (permission && !permissionsDu(payload).includes(permission)) {
      throw new JetonRefuse(403, `permission « ${permission} » absente`);
    }

    return payload;
  };
}

/**
 * Une raison lisible dans le journal — c'est elle qu'on lit à la mise en
 * service, quand l'audience ne correspond pas à la lettre près.
 */
function raisonDuRefus(erreur) {
  if (erreur instanceof errors.JWTExpired) return 'jeton expiré';
  if (erreur instanceof errors.JWTClaimValidationFailed) {
    return `réclamation « ${erreur.claim} » refusée (${erreur.reason})`;
  }
  if (erreur instanceof errors.JWSSignatureVerificationFailed) return 'signature invalide';
  if (erreur instanceof errors.JWKSNoMatchingKey) return 'clé de signature inconnue';
  if (erreur instanceof errors.JOSEError) return `jeton illisible (${erreur.code})`;
  // Clés injoignables, réponse de Pocket-ID mal formée : ce n'est pas la faute
  // du jeton, mais il ne peut pas être accepté pour autant.
  return `vérification impossible (${erreur.message})`;
}

/** `Authorization: Bearer <jeton>` → le jeton, ou `null`. */
export function jetonDeLaRequete(enTete) {
  const trouve = /^Bearer\s+(\S+)\s*$/i.exec(enTete ?? '');
  return trouve ? trouve[1] : null;
}
