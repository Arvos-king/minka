/**
 * Lecture des échéances d'entretien, côté client : c'est la date du téléphone
 * qui fait foi, comme pour le frigo et les tâches.
 */

import { aujourdhui, joursEntre } from '../../lib/dates.js';

/** Les rythmes proposés. Pas de « chaque jour » : ce serait du ménage courant. */
export const RYTHMES = [
  { valeur: 'weekly', libelle: 'Chaque semaine' },
  { valeur: 'monthly', libelle: 'Chaque mois' },
  { valeur: 'quarterly', libelle: 'Tous les trois mois' },
  { valeur: 'biannual', libelle: 'Tous les six mois' },
  { valeur: 'yearly', libelle: 'Chaque année' },
];

export function libelleRythme(recurrence) {
  return RYTHMES.find((r) => r.valeur === recurrence)?.libelle ?? null;
}

const formatCourt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const formatAvecAnnee = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Un retard d'entretien se compte en semaines et en mois, pas en jours.
 *
 * « En retard de 87 j » ne dit rien à personne ; « en retard de 3 mois » se
 * comprend tout de suite, et c'est bien l'ordre de grandeur qui compte pour
 * décider si l'on s'en occupe aujourd'hui.
 */
function libelleRetard(jours) {
  if (jours === 1) return 'Hier';
  if (jours < 14) return `En retard de ${jours} j`;
  if (jours < 60) return `En retard de ${Math.round(jours / 7)} sem.`;
  return `En retard de ${Math.round(jours / 30)} mois`;
}

/**
 * @returns {{ niveau: 'retard'|'aujourdhui'|'bientot'|'plusTard', libelle: string, jours: number }}
 */
export function statutEcheance(dueOn, leJour = aujourdhui()) {
  const jours = joursEntre(leJour, dueOn);

  if (jours < 0) return { niveau: 'retard', libelle: libelleRetard(-jours), jours };
  if (jours === 0) return { niveau: 'aujourdhui', libelle: "Aujourd'hui", jours };
  if (jours === 1) return { niveau: 'bientot', libelle: 'Demain', jours };
  if (jours <= 7) return { niveau: 'bientot', libelle: `Dans ${jours} j`, jours };

  const objet = new Date(`${dueOn}T12:00:00`);
  const memeAnnee = objet.getFullYear() === new Date(`${leJour}T12:00:00`).getFullYear();
  return {
    niveau: 'plusTard',
    libelle: (memeAnnee ? formatCourt : formatAvecAnnee).format(objet),
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
