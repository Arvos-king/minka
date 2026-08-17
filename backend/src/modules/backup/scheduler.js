/**
 * Planification de la sauvegarde nocturne.
 *
 * Pas de dépendance de planification : viser une heure fixe puis se
 * reprogrammer après chaque passage tient en quelques lignes, et se comporte
 * correctement au changement d'heure — le prochain créneau est recalculé à
 * partir de l'heure locale du moment, jamais par addition de 24 heures.
 */

import { creerSauvegarde, listerSauvegardes, reglages } from './service.js';

let minuteur = null;

/** Prochain passage à l'heure dite, aujourd'hui si elle est encore devant nous. */
export function prochainCreneau(depuis = new Date()) {
  const cible = new Date(depuis);
  cible.setHours(reglages.heure, 0, 0, 0);
  if (cible <= depuis) cible.setDate(cible.getDate() + 1);
  return cible;
}

function programmer() {
  const cible = prochainCreneau();
  const delai = cible.getTime() - Date.now();

  minuteur = setTimeout(() => {
    try {
      creerSauvegarde();
    } catch (error) {
      // Une sauvegarde ratée ne doit pas emporter le serveur, ni empêcher la
      // tentative du lendemain.
      console.error('[backup] échec de la sauvegarde :', error.message);
    }
    programmer();
  }, delai);

  // Le minuteur ne doit pas retenir le processus au moment de l'arrêt.
  minuteur.unref?.();

  console.log(`[backup] prochaine sauvegarde le ${cible.toLocaleString('fr-FR')}`);
}

export function demarrerPlanificateur() {
  if (!reglages.actif) {
    console.log('[backup] désactivé (BACKUP_ENABLED=false).');
    return;
  }

  /*
   * Sauvegarde de rattrapage au démarrage, s'il n'y en a aucune pour
   * aujourd'hui. Un conteneur redémarré chaque soir avant l'heure dite ne
   * serait jamais sauvegardé autrement — et c'est justement après un
   * déploiement qu'une image récente est la plus utile.
   */
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (!listerSauvegardes().some((s) => s.date === aujourdhui)) {
    try {
      creerSauvegarde();
    } catch (error) {
      console.error('[backup] échec de la sauvegarde initiale :', error.message);
    }
  }

  programmer();
}

export function arreterPlanificateur() {
  if (minuteur) clearTimeout(minuteur);
  minuteur = null;
}
