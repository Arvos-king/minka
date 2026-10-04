/**
 * Lecture des échéances, côté client : c'est la date du téléphone qui fait foi.
 */

import { aujourdhui, joursEntre } from '../../lib/dates.js';
import { LANGUE, formateurDate, textes } from '../../lib/langue.js';
import { TEXTES } from './textes.js';

const FORMAT_COURT = { day: 'numeric', month: 'short' };
const FORMAT_AVEC_ANNEE = { day: 'numeric', month: 'short', year: 'numeric' };

/**
 * L'année n'apparaît que si elle diffère de l'année en cours.
 *
 * Sans cela, une tâche annuelle replanifiée affiche « 17 août » alors qu'elle
 * tombe l'an prochain — et se lit comme si elle était due aujourd'hui.
 */
export function formaterDate(date, langue = LANGUE) {
  const objet = new Date(`${date}T12:00:00`);
  const memeAnnee = objet.getFullYear() === new Date().getFullYear();
  return formateurDate(memeAnnee ? FORMAT_COURT : FORMAT_AVEC_ANNEE, langue).format(objet);
}

/**
 * @returns {{ niveau: 'aucune'|'retard'|'aujourdhui'|'bientot'|'plusTard', libelle: string|null }}
 */
export function statutEcheance(dueOn, langue = LANGUE) {
  if (!dueOn) return { niveau: 'aucune', libelle: null };

  const t = textes(TEXTES, langue).echeance;
  const jours = joursEntre(aujourdhui(), dueOn);

  if (jours < 0) {
    return {
      niveau: 'retard',
      libelle: jours === -1 ? t.hier : t.enRetard(Math.abs(jours)),
    };
  }
  if (jours === 0) return { niveau: 'aujourdhui', libelle: t.aujourdhui };
  if (jours === 1) return { niveau: 'bientot', libelle: t.demain };
  if (jours <= 7) return { niveau: 'bientot', libelle: t.dans(jours) };

  return { niveau: 'plusTard', libelle: formaterDate(dueOn, langue) };
}

export const STYLES_ECHEANCE = {
  retard: 'bg-red-100 text-danger',
  aujourdhui: 'bg-orange-100 text-orange-800',
  bientot: 'bg-amber-100 text-amber-800',
  plusTard: 'bg-sand-200 text-sand-600',
  aucune: '',
};

/** Les rythmes proposés, dans l'ordre de l'interface. `null` : une seule fois. */
const VALEURS_RYTHMES = [null, 'daily', 'weekly', 'monthly', 'quarterly', 'biannual', 'yearly'];

/** Libellés des rythmes, tels qu'ils apparaissent dans l'interface. */
export function rythmes(langue = LANGUE) {
  const t = textes(TEXTES, langue).rythmes;
  return VALEURS_RYTHMES.map((valeur) => ({ valeur, libelle: t[valeur ?? 'unique'] }));
}

export const RYTHMES = rythmes();

export function libelleRythme(recurrence, langue = LANGUE) {
  return rythmes(langue).find((r) => r.valeur === recurrence)?.libelle ?? null;
}
