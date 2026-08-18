/**
 * Échéances de péremption.
 *
 * Le calcul se fait ici, côté client : la date qui compte est celle du
 * téléphone de la personne qui ouvre le frigo.
 */

import { aujourdhui, decalerJours, joursEntre } from '../../lib/dates.js';

/** Nombre de jours en deçà duquel un produit est signalé comme urgent. */
const SEUIL_BIENTOT = 3;

export function joursRestants(expiresOn) {
  return joursEntre(aujourdhui(), expiresOn);
}

const formatCourt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/**
 * @returns {{ niveau: 'aucun'|'perime'|'aujourdhui'|'bientot'|'ok', libelle: string|null, jours: number|null }}
 */
export function statutPeremption(expiresOn) {
  if (!expiresOn) return { niveau: 'aucun', libelle: null, jours: null };

  const jours = joursRestants(expiresOn);

  if (jours < 0) {
    return {
      niveau: 'perime',
      libelle: jours === -1 ? 'Périmé hier' : `Périmé depuis ${Math.abs(jours)} j`,
      jours,
    };
  }
  if (jours === 0) return { niveau: 'aujourdhui', libelle: "Aujourd'hui", jours };
  if (jours === 1) return { niveau: 'bientot', libelle: 'Demain', jours };
  if (jours <= SEUIL_BIENTOT) return { niveau: 'bientot', libelle: `Dans ${jours} j`, jours };

  return {
    niveau: 'ok',
    libelle: formatCourt.format(new Date(`${expiresOn}T12:00:00`)),
    jours,
  };
}

/** Classes d'affichage du badge, par niveau. */
export const STYLES_BADGE = {
  perime: 'bg-red-100 text-danger',
  aujourdhui: 'bg-orange-100 text-orange-800',
  bientot: 'bg-amber-100 text-amber-800',
  ok: 'bg-sand-200 text-sand-600',
  aucun: '',
};

/** Date située dans N jours, au format attendu par l'API. */
export function dansNJours(n) {
  return decalerJours(aujourdhui(), n);
}
