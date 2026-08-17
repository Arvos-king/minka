import { Router } from 'express';

import { prochainCreneau } from './scheduler.js';
import { creerSauvegarde, listerSauvegardes, reglages } from './service.js';

export const router = Router();

/**
 * État des sauvegardes.
 *
 * Aucune interface ne consomme ces routes : elles servent au diagnostic, pour
 * vérifier d'un `curl` que la mécanique tourne. Une tuile « Sauvegardes » sur
 * le tableau de bord n'aurait rien à y faire.
 */
router.get('/', (req, res) => {
  res.json({
    actif: reglages.actif,
    dossier: reglages.dossier,
    conserver: reglages.conserver,
    prochaine: reglages.actif ? prochainCreneau().toISOString() : null,
    sauvegardes: listerSauvegardes().reverse(), // la plus récente en tête
  });
});

/** Déclenche une sauvegarde immédiate — avant une manipulation risquée. */
router.post('/', (req, res) => {
  res.status(201).json(creerSauvegarde());
});
