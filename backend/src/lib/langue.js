/**
 * Langue de l'instance.
 *
 * Minka parle une seule langue par instance, choisie au déploiement par
 * MINKA_LANG : un foyer l'installe dans la sienne, une fois pour toutes. Tout
 * ce que l'API dit — messages d'erreur, journaux, connecteur Claude — suit ce
 * réglage ; l'interface, compilée avec la même variable, parle la même.
 *
 * Ce fichier n'importe pas la configuration du socle, et c'est voulu : les
 * fonctions pures qui dépendent de la langue (rangement par rayon, clés de
 * titres…) et leurs tests ne doivent pas entraîner la création du dossier de
 * données ni le reste du démarrage. Une valeur inconnue retombe ici sur le
 * français ; c'est `config/index.js` qui arrête alors le démarrage, en le
 * disant.
 */

import { z } from 'zod';

export const LANGUES = ['fr', 'en'];

/**
 * Locale des formats de date et de nombre. L'anglais de Minka est britannique :
 * le jour avant le mois (« Monday 5 October »), comme en français.
 */
const LOCALES = { fr: 'fr-FR', en: 'en-GB' };

/**
 * @returns {'fr'|'en'|null} la langue demandée, le français si rien n'est
 *   demandé, `null` si la valeur n'est pas reconnue.
 */
export function lireLangue(brut = process.env.MINKA_LANG) {
  const valeur = (brut ?? '').trim().toLowerCase();
  if (valeur === '') return 'fr';
  return LANGUES.includes(valeur) ? valeur : null;
}

export const LANGUE = lireLangue() ?? 'fr';

export const LOCALE = LOCALES[LANGUE];

export function localeDe(langue = LANGUE) {
  return LOCALES[langue] ?? LOCALES.fr;
}

/**
 * Dictionnaire de la langue demandée.
 *
 * Chaque module tient le sien dans un `textes.js` — `{ fr: {…}, en: {…} }` —,
 * ce qui garde intact le contrat de module : ajouter une fonctionnalité ne
 * touche toujours à aucun fichier commun. Une entrée est une chaîne, ou une
 * fonction quand il faut accorder ou interpoler : pluriels et ordre des mots
 * restent ainsi l'affaire de chaque langue, sans syntaxe de gabarit à inventer.
 */
export function textes(dictionnaires, langue = LANGUE) {
  return dictionnaires[langue] ?? dictionnaires.fr;
}

/*
 * Messages par défaut de zod — type inattendu, champ manquant —, ceux que nos
 * schémas ne personnalisent pas. Sans ce réglage, zod répond en anglais, y
 * compris sur une instance française. Les messages écrits dans les schémas
 * gardent la priorité.
 */
z.config(z.locales[LANGUE]());
