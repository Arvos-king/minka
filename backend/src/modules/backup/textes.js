import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    reglageIgnore: (nom, brut, min, max) =>
      `[backup] ${nom}="${brut}" ignoré (attendu : entier entre ${min} et ${max}).`,
    sauvegarde: (nom, ko, purgees) =>
      `[backup] ${nom} (${ko} Ko)` +
      (purgees > 0 ? ` — ${purgees} ancienne(s) sauvegarde(s) retirée(s)` : ''),
    echec: '[backup] échec de la sauvegarde :',
    echecInitiale: '[backup] échec de la sauvegarde initiale :',
    prochaine: (date) => `[backup] prochaine sauvegarde le ${date}`,
    desactive: '[backup] désactivé (BACKUP_ENABLED=false).',
  },

  en: {
    reglageIgnore: (nom, brut, min, max) =>
      `[backup] ${nom}="${brut}" ignored (expected an integer between ${min} and ${max}).`,
    sauvegarde: (nom, ko, purgees) =>
      `[backup] ${nom} (${ko} KB)` +
      (purgees > 0 ? ` — ${purgees} old backup${purgees > 1 ? 's' : ''} removed` : ''),
    echec: '[backup] backup failed:',
    echecInitiale: '[backup] initial backup failed:',
    prochaine: (date) => `[backup] next backup on ${date}`,
    desactive: '[backup] disabled (BACKUP_ENABLED=false).',
  },
};

export const T = textes(TEXTES);
