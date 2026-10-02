/**
 * La règle qui réorganise le planning : « insérer et pousser ».
 *
 *   1. La case de départ se libère.
 *   2. Le repas prend la case d'arrivée.
 *   3. Celui qui l'occupait glisse d'un jour sur le même créneau, celui qu'il
 *      déloge à son tour aussi, et ainsi de suite jusqu'à la première case
 *      libre.
 *
 * Glisser un repas, le poser par « Déplacer… » et « Décaler d'un jour » ne
 * sont que trois chemins vers cette règle — le dernier vise simplement le
 * lendemain, au même moment.
 *
 * Le créneau d'arrivée est le seul suivi : un dîner délogé devient le dîner
 * du lendemain, jamais un déjeuner. La poussée peut franchir le dimanche, et
 * c'est voulu : le repas qui arrive en bout de chaîne passe à la semaine
 * suivante plutôt que de disparaître.
 *
 * Fonction pure, sans base de données : elle reçoit l'état des cases dont elle
 * a besoin et rend celles qu'il faut réécrire. Le service l'enrobe d'une
 * transaction, `node --test` la vérifie seule.
 *
 * Elle est recopiée dans l'interface (`frontend/src/modules/menus/
 * reorganisation.js`), qui s'en sert pour afficher le résultat avant la
 * réponse : l'API et l'interface ne partagent aucun code. Si l'une change,
 * l'autre doit suivre — les deux fichiers de test déroulent les mêmes
 * scénarios.
 */

import { avancerDe } from '../../lib/recurrence.js';

const lendemain = (date) => avancerDe(date, 'daily', 1);

/** Le rang d'un créneau dans la journée, pour trier comme le fait `listPlan`. */
const RANG = { midi: 0, soir: 1 };

/** Ce que porte une case, sans son identifiant ni sa position ; `null` si elle est vide. */
export function contenuDe(repas) {
  return repas ? { recipeId: repas.recipeId ?? null, title: repas.title } : null;
}

/** Deux contenus identiques ? Une case vide n'égale qu'une case vide. */
export function memeContenu(a, b) {
  if (a === null || b === null) return a === b;
  return (a.recipeId ?? null) === (b.recipeId ?? null) && a.title === b.title;
}

/**
 * Les cases que réécrit le déplacement d'un repas.
 *
 * @param {object} p
 * @param {{date: string, slot: string}} p.de    la case de départ
 * @param {{recipeId: number|null, title: string}} p.contenu  ce qu'elle porte
 * @param {{date: string, slot: string}} p.vers  la case d'arrivée
 * @param {Array<{onDate: string, recipeId: number|null, title: string}>} p.suite
 *   les repas du créneau d'arrivée, de son jour en avant, dans n'importe quel
 *   ordre. Ce qui manque est tenu pour libre.
 * @returns {Array<{onDate: string, slot: string, avant: object|null, apres: object|null}>}
 *   les cases touchées, du plus tôt au plus tard ; `avant` et `apres` sont des
 *   contenus, `null` pour une case vide.
 */
export function planifierDeplacement({ de, contenu, vers, suite }) {
  const occupees = new Map(suite.map((repas) => [repas.onDate, contenuDe(repas)]));

  // La case quittée est libre. Si la poussée la rencontre — un repas qu'on
  // remonte de deux jours sur son propre créneau —, elle s'y arrête : la
  // chaîne tourne, sans rien envoyer à la semaine suivante.
  if (de.slot === vers.slot) occupees.delete(de.date);

  const touchees = new Map();
  const toucher = (date, slot, avant, apres) => {
    const cle = `${date}|${slot}`;
    // Une case touchée deux fois ne peut être que la case quittée, rattrapée
    // par la poussée : son état d'avant reste celui d'origine.
    const origine = touchees.has(cle) ? touchees.get(cle).avant : avant;
    touchees.set(cle, { onDate: date, slot, avant: origine, apres });
  };

  toucher(de.date, de.slot, contenu, null);

  let date = vers.date;
  let enMain = contenu;
  while (enMain) {
    const occupant = occupees.get(date) ?? null;
    toucher(date, vers.slot, occupant, enMain);
    enMain = occupant;
    date = lendemain(date);
  }

  return [...touchees.values()].sort(
    (a, b) => a.onDate.localeCompare(b.onDate) || RANG[a.slot] - RANG[b.slot],
  );
}
