/**
 * État du réseau, et fraîcheur des données affichées.
 *
 * Le service worker sert les lectures de l'API depuis son cache quand le réseau
 * manque (voir `vite.config.js`). L'appel réussit donc, et rien dans la réponse
 * ne dit qu'elle vient du cache : c'est l'application qui doit prévenir, sans
 * quoi une liste de courses vieille de deux jours se lirait comme à jour.
 *
 * On retient donc l'heure de la dernière lecture **faite en ligne**, et on
 * l'affiche quand la connexion est perdue.
 */

import { useEffect, useState } from 'react';

const CLE = 'minka:derniere-synchro';

/**
 * `navigator.onLine` ment dans un sens : il est vrai dès qu'une carte réseau
 * est active, même sans accès à Internet. Il ne ment pas dans l'autre — faux
 * signifie bien « pas de réseau ». On ne s'en sert donc que pour ça.
 */
export const enLigne = () => navigator.onLine !== false;

/** Note l'heure d'une lecture réussie, si elle vient bien du réseau. */
export function marquerSynchro(maintenant = Date.now()) {
  if (!enLigne()) return;
  try {
    localStorage.setItem(CLE, String(maintenant));
  } catch {
    // Navigation privée, quota plein : l'indicateur disparaît, rien de plus.
  }
}

/** @returns {number|null} horodatage de la dernière lecture en ligne. */
export function derniereSynchro() {
  try {
    const brut = localStorage.getItem(CLE);
    const valeur = brut === null ? Number.NaN : Number(brut);
    return Number.isFinite(valeur) ? valeur : null;
  } catch {
    return null;
  }
}

/**
 * « à l'instant », « il y a 5 min », « il y a 2 h », « hier », « il y a 3 j ».
 *
 * Volontairement approximatif : ce qu'on veut savoir dans un rayon, c'est si
 * l'information date de la matinée ou de la semaine dernière, pas à la minute
 * près.
 */
export function libelleAnciennete(horodatage, maintenant = Date.now()) {
  if (horodatage === null || horodatage === undefined) return null;

  const minutes = Math.floor((maintenant - horodatage) / 60_000);
  if (minutes < 0) return "à l'instant"; // horloge reculée : rien de mieux à dire
  if (minutes < 2) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;

  const jours = Math.floor(heures / 24);
  if (jours === 1) return 'hier';
  return `il y a ${jours} j`;
}

/** Suit l'état de la connexion, pour l'afficher. */
export function useEnLigne() {
  const [present, setPresent] = useState(enLigne);

  useEffect(() => {
    const majOnline = () => setPresent(true);
    const majOffline = () => setPresent(false);

    window.addEventListener('online', majOnline);
    window.addEventListener('offline', majOffline);
    return () => {
      window.removeEventListener('online', majOnline);
      window.removeEventListener('offline', majOffline);
    };
  }, []);

  return present;
}
