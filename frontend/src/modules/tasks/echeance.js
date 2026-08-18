/**
 * Lecture des échéances, côté client : c'est la date du téléphone qui fait foi.
 */

import { aujourdhui, joursEntre } from '../../lib/dates.js';

const formatCourt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const formatAvecAnnee = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * L'année n'apparaît que si elle diffère de l'année en cours.
 *
 * Sans cela, une tâche annuelle replanifiée affiche « 17 août » alors qu'elle
 * tombe l'an prochain — et se lit comme si elle était due aujourd'hui.
 */
export function formaterDate(date) {
  const objet = new Date(`${date}T12:00:00`);
  const memeAnnee = objet.getFullYear() === new Date().getFullYear();
  return (memeAnnee ? formatCourt : formatAvecAnnee).format(objet);
}

/**
 * @returns {{ niveau: 'aucune'|'retard'|'aujourdhui'|'bientot'|'plusTard', libelle: string|null }}
 */
export function statutEcheance(dueOn) {
  if (!dueOn) return { niveau: 'aucune', libelle: null };

  const jours = joursEntre(aujourdhui(), dueOn);

  if (jours < 0) {
    return {
      niveau: 'retard',
      libelle: jours === -1 ? 'Hier' : `En retard de ${Math.abs(jours)} j`,
    };
  }
  if (jours === 0) return { niveau: 'aujourdhui', libelle: "Aujourd'hui" };
  if (jours === 1) return { niveau: 'bientot', libelle: 'Demain' };
  if (jours <= 7) return { niveau: 'bientot', libelle: `Dans ${jours} j` };

  return { niveau: 'plusTard', libelle: formaterDate(dueOn) };
}

export const STYLES_ECHEANCE = {
  retard: 'bg-red-100 text-danger',
  aujourdhui: 'bg-orange-100 text-orange-800',
  bientot: 'bg-amber-100 text-amber-800',
  plusTard: 'bg-sand-200 text-sand-600',
  aucune: '',
};

/** Libellés des rythmes, tels qu'ils apparaissent dans l'interface. */
export const RYTHMES = [
  { valeur: null, libelle: 'Une seule fois' },
  { valeur: 'daily', libelle: 'Chaque jour' },
  { valeur: 'weekly', libelle: 'Chaque semaine' },
  { valeur: 'monthly', libelle: 'Chaque mois' },
  { valeur: 'yearly', libelle: 'Chaque année' },
];

export function libelleRythme(recurrence) {
  return RYTHMES.find((r) => r.valeur === recurrence)?.libelle ?? null;
}
