/**
 * Réorganiser le planning : la règle, et ce que la page en fait.
 *
 * `planifierDeplacement` et `contenuDe` sont la copie de
 * `backend/src/modules/menus/reorganisation.js`, qui fait foi : c'est le
 * serveur qui applique la règle, sur l'état réel du planning et au-delà du
 * dimanche. La page s'en sert pour afficher le résultat avant la réponse,
 * comme pour toute action optimiste, et la réponse corrige ce qu'elle n'a pas
 * pu voir. Si l'une change, l'autre doit suivre : les deux fichiers de test
 * déroulent les mêmes scénarios. Seule différence, l'arithmétique des jours,
 * qui vient ici de `lib/dates.js`.
 *
 * Le reste est propre à l'interface : appliquer des cases réécrites à la
 * liste affichée, préparer l'annulation, résumer le geste en une phrase.
 *
 * Logique pure, sans React ni DOM : `node --test` la vérifie seule.
 */

import { identifiantProvisoire } from '../../lib/collection.js';
import { decalerJours } from '../../lib/dates.js';
import { LANGUE, textes } from '../../lib/langue.js';
import { creneaux, libelleJour } from './semaine.js';
import { TEXTES } from './textes.js';

const lendemain = (date) => decalerJours(date, 1);

/** Le rang d'un créneau dans la journée, pour trier comme le fait `GET /plan`. */
const RANG = { midi: 0, soir: 1 };

// --- Copie de la règle du serveur ------------------------------------------

/** Ce que porte une case, sans son identifiant ni sa position ; `null` si elle est vide. */
export function contenuDe(repas) {
  return repas ? { recipeId: repas.recipeId ?? null, title: repas.title } : null;
}

/**
 * Les cases que réécrit le déplacement d'un repas : « insérer et pousser ».
 *
 * La case de départ se libère, le repas prend la case d'arrivée, et celui
 * qu'il déloge glisse d'un jour sur le même créneau, jusqu'à la première case
 * libre — qui peut être la case quittée.
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

// --- Propre à l'interface ----------------------------------------------------

const memeCase = (a, b) => a.onDate === b.onDate && a.slot === b.slot;

/**
 * Un contenu posé dans une case, en attente de confirmation : identifiant
 * provisoire et `pending`, comme ce que pose `useCollection`. La page estompe
 * ces repas-là et ne les laisse pas saisir — le serveur ne les connaît pas
 * encore sous cette forme.
 */
const enAttente = (onDate, slot, contenu) =>
  contenu ? { id: identifiantProvisoire(), onDate, slot, ...contenu, pending: true } : null;

/**
 * Ce que la page affiche en attendant la réponse : la règle appliquée aux
 * seuls repas chargés.
 *
 * Au-delà du dimanche, rien n'est chargé et tout passe pour libre : la
 * prédiction y arrête la poussée là où le serveur, lui, la poursuivra. Sans
 * conséquence — `appliquerCases` ne garde rien hors de la semaine affichée.
 *
 * @returns des cases au format de la réponse du serveur, `apres` en attente.
 */
export function predireDeplacement(entries, de, contenu, vers) {
  const suite = entries.filter((repas) => repas.slot === vers.slot && repas.onDate >= vers.date);

  return planifierDeplacement({ de, contenu, vers, suite }).map(({ onDate, slot, avant, apres }) => ({
    onDate,
    slot,
    avant,
    apres: enAttente(onDate, slot, apres),
  }));
}

/** Ce que la page affiche en attendant que l'annulation soit confirmée. */
export function predireAnnulation(cases) {
  return cases.map(({ onDate, slot, avant }) => ({ onDate, slot, apres: enAttente(onDate, slot, avant) }));
}

/** Les repas que portent ces cases à l'instant : de quoi revenir en arrière si le serveur refuse. */
export function releverCases(entries, cases) {
  return cases.map(({ onDate, slot }) => ({
    onDate,
    slot,
    apres: entries.find((repas) => memeCase(repas, { onDate, slot })) ?? null,
  }));
}

/**
 * Applique des cases réécrites à la liste des repas affichés : chacune porte
 * désormais son `apres`, ou plus rien.
 *
 * Bornée à la période affichée. Une poussée qui déborde sur la semaine
 * suivante y écrit des cases que la page ne montre pas, et les ajouter à la
 * liste gonflerait le compteur « Semaine vide » et l'envoi aux courses
 * jusqu'au prochain rechargement.
 *
 * Triée jour puis créneau, l'ordre que rend `GET /plan` : c'est dans cet ordre
 * que les recettes de la semaine partent au module recettes pour les courses.
 */
export function appliquerCases(entries, cases, { from, to }) {
  const visibles = cases.filter(({ onDate }) => onDate >= from && onDate <= to);

  return [
    ...entries.filter((repas) => !visibles.some((touchee) => memeCase(touchee, repas))),
    ...visibles.filter(({ apres }) => apres).map(({ apres }) => apres),
  ].sort((a, b) => a.onDate.localeCompare(b.onDate) || RANG[a.slot] - RANG[b.slot]);
}

/**
 * Le corps qui annule une réorganisation : chaque case revient à son état
 * d'avant, à condition de porter encore celui d'après — sans quoi le serveur
 * refuse tout, plutôt que d'effacer un geste de l'autre.
 */
export function casesDAnnulation(cases) {
  return cases.map(({ onDate, slot, avant, apres }) => ({
    onDate,
    slot,
    repas: avant,
    attendu: contenuDe(apres),
  }));
}

/** « jeudi 20 soir », « dinner on Thursday 20 ». */
function libelleCase({ onDate, slot }, langue) {
  const creneau = creneaux(langue).find((c) => c.valeur === slot)?.libelle ?? slot;
  return textes(TEXTES, langue).deplacement.caseDuPlan(
    libelleJour(onDate, langue),
    creneau.toLocaleLowerCase(langue),
  );
}

/**
 * Le geste en une phrase, pour le bandeau d'annulation et le panneau :
 *
 *   « Gratin » passe au jeudi 20 soir.
 *   « Gratin » passe au jeudi 20 soir, et pousse « Chili » d'un jour.
 *   « Gratin » passe au jeudi 20 soir, et pousse 3 repas d'un jour.
 *
 * Un repas poussé est un repas arrivé dans une case autre que celle visée — la
 * case quittée comprise, quand la chaîne tourne.
 *
 * @param {Array} cases  les cases rendues par le serveur
 * @param {{date: string, slot: string}} vers  la case visée
 * @param {(contenu: object) => string} titre  l'intitulé à afficher : la page
 *   préfère celui du répertoire à la copie que porte la case.
 */
export function resumerDeplacement(cases, vers, titre, langue = LANGUE) {
  const t = textes(TEXTES, langue).deplacement;
  const visee = { onDate: vers.date, slot: vers.slot };
  const arrivee = cases.find((touchee) => memeCase(touchee, visee));
  const pousses = cases.filter((touchee) => touchee.apres && !memeCase(touchee, visee));

  const deplace = titre(arrivee.apres);
  const ou = libelleCase(visee, langue);
  if (pousses.length === 0) return t.seul(deplace, ou);
  if (pousses.length === 1) return t.pousseUn(deplace, ou, titre(arrivee.avant));
  return t.pousseN(deplace, ou, pousses.length);
}

/**
 * Ce qu'annonce le repas qu'on glisse, au-dessus du doigt : la case visée, et
 * le repas qu'on y délogerait. C'est avant de lâcher qu'on veut le savoir.
 *
 *   jeudi 8 soir
 *   jeudi 8 soir · pousse « Chili »
 *
 * @param {{date: string, slot: string}} vers
 * @param {string|null} occupant  l'intitulé du repas en place, s'il y en a un
 */
export function decrireDepot(vers, occupant, langue = LANGUE) {
  const ou = libelleCase({ onDate: vers.date, slot: vers.slot }, langue);
  return textes(TEXTES, langue).deplacement.depot(ou, occupant);
}
