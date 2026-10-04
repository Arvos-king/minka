/**
 * Ce qu'une note montre d'elle-même dans la liste.
 *
 * Le titre est facultatif : on note souvent trois lignes sans penser à en
 * donner un. Plutôt que d'imposer un champ de plus avant de pouvoir écrire, on
 * le déduit de la première ligne — c'est ce que fait n'importe quelle
 * application de notes, et c'est presque toujours le bon choix.
 */

import { LANGUE, formateurDate, textes } from '../../lib/langue.js';
import { TEXTES } from './textes.js';

const LONGUEUR_TITRE = 60;
const LONGUEUR_EXTRAIT = 120;

const premiereLigne = (texte) =>
  (texte ?? '').split('\n').find((ligne) => ligne.trim() !== '')?.trim() ?? '';

function tronquer(texte, maximum) {
  return texte.length <= maximum ? texte : `${texte.slice(0, maximum - 1).trimEnd()}…`;
}

/** Le titre saisi, à défaut la première ligne du corps, à défaut rien. */
export function titreAffiche(note) {
  const saisi = (note?.title ?? '').trim();
  if (saisi !== '') return tronquer(saisi, LONGUEUR_TITRE);

  const deduit = premiereLigne(note?.body);
  return deduit === '' ? '' : tronquer(deduit, LONGUEUR_TITRE);
}

/**
 * Aperçu du contenu, sur une ligne.
 *
 * Quand le titre vient du corps, la première ligne est sautée : la répéter
 * juste en dessous ne dirait rien de plus.
 */
export function extrait(note) {
  const lignes = (note?.body ?? '').split('\n');
  const sansTitre = (note?.title ?? '').trim() === '';

  const restantes = sansTitre
    ? lignes.slice(lignes.findIndex((ligne) => ligne.trim() !== '') + 1)
    : lignes;

  const texte = restantes.join(' ').replace(/\s+/g, ' ').trim();
  return tronquer(texte, LONGUEUR_EXTRAIT);
}

/** Une note sans titre saisi ni corps : elle existe, mais ne dit rien encore. */
export function estVide(note) {
  return (note?.title ?? '').trim() === '' && (note?.body ?? '').trim() === '';
}

const FORMAT_DATE = { day: 'numeric', month: 'long' };
const FORMAT_DATE_AVEC_ANNEE = { ...FORMAT_DATE, year: 'numeric' };

/**
 * « à l'instant », « il y a 5 min », « il y a 3 h », « hier », « le 12 août ».
 *
 * Au-delà d'une journée on donne la date plutôt qu'un décompte : « il y a
 * 23 j » demande un calcul mental que « le 26 juillet » épargne.
 */
export function libelleModification(instant, maintenant = Date.now(), langue = LANGUE) {
  if (!instant) return null;

  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return null;

  const t = textes(TEXTES, langue).modification;

  const minutes = Math.floor((maintenant - date.getTime()) / 60_000);
  if (minutes < 2) return t.instant;
  if (minutes < 60) return t.minutes(minutes);

  const heures = Math.floor(minutes / 60);
  if (heures < 24) return t.heures(heures);
  if (heures < 48) return t.hier;

  const memeAnnee = date.getFullYear() === new Date(maintenant).getFullYear();
  return t.le(formateurDate(memeAnnee ? FORMAT_DATE : FORMAT_DATE_AVEC_ANNEE, langue).format(date));
}
