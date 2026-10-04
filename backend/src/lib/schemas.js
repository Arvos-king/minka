/**
 * Briques de validation partagées par les modules.
 */

import { z } from 'zod';

import { T } from '../textes.js';

/**
 * Date nue au format AAAA-MM-JJ.
 *
 * Le contrôle ne s'arrête pas au format : il vérifie que le jour existe
 * réellement, sans quoi un 31 février serait accepté puis réinterprété
 * silencieusement par JavaScript comme le 3 mars.
 */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, T.schemas.dateFormat)
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00Z`);
      // Le test de validité vient en premier, et pas seulement par prudence :
      // zod exécute ce contrôle même lorsque le format a déjà échoué plus
      // haut, et `toISOString()` sur une date invalide lève une exception —
      // qui ressortirait en erreur 500 au lieu d'un message de validation.
      if (Number.isNaN(date.getTime())) return false;
      return date.toISOString().slice(0, 10) === value;
    },
    { message: T.schemas.dateInexistante },
  );

/** Heure du jour au format HH:MM, sur 24 heures. */
export const isoTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, T.schemas.heureFormat);
