/**
 * Lecture des échéances d'entretien, côté client : c'est la date du téléphone
 * qui fait foi, comme pour le frigo et les tâches.
 */

import { aujourdhui, joursEntre } from '../../lib/dates.js';
import { LANGUE, formateurDate, textes } from '../../lib/langue.js';
import { TEXTES } from './textes.js';

/** Les rythmes proposés. Pas de « chaque jour » : ce serait du ménage courant. */
const VALEURS_RYTHMES = ['weekly', 'monthly', 'quarterly', 'biannual', 'yearly'];

export function rythmes(langue = LANGUE) {
  const t = textes(TEXTES, langue).rythmes;
  return VALEURS_RYTHMES.map((valeur) => ({ valeur, libelle: t[valeur] }));
}

export const RYTHMES = rythmes();

export function libelleRythme(recurrence, langue = LANGUE) {
  return rythmes(langue).find((r) => r.valeur === recurrence)?.libelle ?? null;
}

const FORMAT_COURT = { day: 'numeric', month: 'short' };
const FORMAT_AVEC_ANNEE = { ...FORMAT_COURT, year: 'numeric' };

/**
 * Un retard d'entretien se compte en semaines et en mois, pas en jours.
 *
 * « En retard de 87 j » ne dit rien à personne ; « en retard de 3 mois » se
 * comprend tout de suite, et c'est bien l'ordre de grandeur qui compte pour
 * décider si l'on s'en occupe aujourd'hui.
 */
function libelleRetard(jours, t) {
  if (jours === 1) return t.hier;
  if (jours < 14) return t.retardJours(jours);
  if (jours < 60) return t.retardSemaines(Math.round(jours / 7));
  return t.retardMois(Math.round(jours / 30));
}

/**
 * @returns {{ niveau: 'retard'|'aujourdhui'|'bientot'|'plusTard', libelle: string, jours: number }}
 */
export function statutEcheance(dueOn, leJour = aujourdhui(), langue = LANGUE) {
  const t = textes(TEXTES, langue).echeance;
  const jours = joursEntre(leJour, dueOn);

  if (jours < 0) return { niveau: 'retard', libelle: libelleRetard(-jours, t), jours };
  if (jours === 0) return { niveau: 'aujourdhui', libelle: t.aujourdhui, jours };
  if (jours === 1) return { niveau: 'bientot', libelle: t.demain, jours };
  if (jours <= 7) return { niveau: 'bientot', libelle: t.dans(jours), jours };

  const objet = new Date(`${dueOn}T12:00:00`);
  const memeAnnee = objet.getFullYear() === new Date(`${leJour}T12:00:00`).getFullYear();
  return {
    niveau: 'plusTard',
    libelle: formateurDate(memeAnnee ? FORMAT_COURT : FORMAT_AVEC_ANNEE, langue).format(objet),
    jours,
  };
}

export const STYLES_ECHEANCE = {
  retard: 'bg-red-100 text-danger',
  aujourdhui: 'bg-orange-100 text-orange-800',
  bientot: 'bg-amber-100 text-amber-800',
  plusTard: 'bg-sand-200 text-sand-600',
};

/**
 * Répartit le planning en trois temps.
 *
 * Ce qu'on vient chercher en ouvrant le module, c'est « qu'est-ce qui traîne »
 * puis « qu'est-ce qui vient » — d'où l'urgence comme premier classement, la
 * pièce n'arrivant qu'en filtre.
 */
export function grouperParUrgence(taches, leJour = aujourdhui()) {
  const groupes = { enRetard: [], bientot: [], plusTard: [] };

  for (const tache of taches) {
    const { niveau } = statutEcheance(tache.dueOn, leJour);
    if (niveau === 'retard') groupes.enRetard.push(tache);
    else if (niveau === 'plusTard') groupes.plusTard.push(tache);
    else groupes.bientot.push(tache);
  }

  return groupes;
}
