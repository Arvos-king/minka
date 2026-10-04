/**
 * Langue de l'instance, côté interface.
 *
 * Figée à la compilation : `vite.config.js` lit MINKA_LANG — la variable que
 * l'API lit aussi, dans le même `.env` — et la pose sous le nom
 * `__MINKA_LANG__`. Le manifeste de la PWA et `<html lang>` naissent au même
 * moment. Une langue lue à l'exécution ferait clignoter l'interface au
 * démarrage, et dépendrait du réseau, que l'application doit savoir perdre.
 *
 * Hors de Vite — sous `node --test` —, la constante n'existe pas et c'est le
 * français : les tests ne dépendent ainsi d'aucune variable du poste. Ceux qui
 * vérifient l'anglais le demandent explicitement, par le paramètre `langue`
 * des fonctions qui produisent du texte.
 */

export const LANGUES = ['fr', 'en'];

/**
 * Locale des formats de date et de nombre. L'anglais de Minka est britannique :
 * le jour avant le mois (« Monday 5 October »), comme en français.
 */
const LOCALES = { fr: 'fr-FR', en: 'en-GB' };

export const LANGUE =
  // eslint-disable-next-line no-undef -- remplacée par Vite à la compilation.
  typeof __MINKA_LANG__ === 'string' && LANGUES.includes(__MINKA_LANG__) ? __MINKA_LANG__ : 'fr';

export const LOCALE = LOCALES[LANGUE];

/** Monnaie du budget, code ISO 4217 (MINKA_CURRENCY) : l'euro par défaut. */
export const DEVISE =
  // eslint-disable-next-line no-undef -- remplacée par Vite à la compilation.
  typeof __MINKA_CURRENCY__ === 'string' ? __MINKA_CURRENCY__ : 'EUR';

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

const formateursDate = new Map();

/**
 * `Intl.DateTimeFormat` de la langue, mis en cache par options : en construire
 * un coûte, et un planning en formate des dizaines à chaque rendu.
 */
export function formateurDate(options, langue = LANGUE) {
  const cle = `${langue}|${JSON.stringify(options)}`;
  let formateur = formateursDate.get(cle);
  if (!formateur) {
    formateur = new Intl.DateTimeFormat(localeDe(langue), options);
    formateursDate.set(cle, formateur);
  }
  return formateur;
}
