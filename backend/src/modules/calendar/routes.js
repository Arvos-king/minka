import { Router } from 'express';

import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import {
  createEventSchema,
  eventParamsSchema,
  listQuerySchema,
  updateEventSchema,
} from './schemas.js';
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  listPeople,
  personExists,
  updateEvent,
} from './service.js';

export const router = Router();

const eventNotFound = () => new AppError(404, 'EVENT_NOT_FOUND', "Cet événement n'existe plus.");

/** Décale une date AAAA-MM-JJ d'un nombre de jours, en restant en UTC. */
function decalerJours(date, jours) {
  const [annee, mois, jour] = date.split('-').map(Number);
  return new Date(Date.UTC(annee, mois - 1, jour) + jours * 86_400_000).toISOString().slice(0, 10);
}

function aujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

/** Refuse une personne inconnue, plutôt que d'enregistrer une attribution fantôme. */
function verifierPersonne(ownerId) {
  if (ownerId !== undefined && ownerId !== null && !personExists(ownerId)) {
    throw new AppError(400, 'UNKNOWN_PERSON', "Cette personne n'existe pas.");
  }
}

router.get('/events', validate({ query: listQuerySchema }), (req, res) => {
  // Par défaut, l'agenda part d'aujourd'hui et couvre l'année à venir : assez
  // large pour ne rien manquer, assez borné pour que la réponse reste petite.
  const from = req.valid.query.from ?? aujourdhui();
  const to = req.valid.query.to ?? decalerJours(from, 365);

  res.json({ events: listEvents({ from, to }), from, to });
});

router.get('/people', (req, res) => {
  res.json({ people: listPeople() });
});

router.post('/events', validate({ body: createEventSchema }), (req, res) => {
  verifierPersonne(req.valid.body.ownerId);
  res.status(201).json({ event: createEvent(req.valid.body, req.user.id) });
});

router.patch(
  '/events/:id',
  validate({ params: eventParamsSchema, body: updateEventSchema }),
  (req, res) => {
    const { id } = req.valid.params;
    const existant = getEvent(id);
    if (!existant) throw eventNotFound();

    verifierPersonne(req.valid.body.ownerId);

    /*
     * Les règles de cohérence (fin après début, heure de fin sans heure de
     * début…) portent sur les champs pris ensemble. Une modification partielle
     * ne peut donc pas être validée seule : on la fusionne avec l'événement
     * existant et on soumet le résultat au schéma complet. Sans cela, un simple
     * PATCH de la date de fin pourrait la placer avant le début.
     */
    const resultat = createEventSchema.safeParse({ ...existant, ...req.valid.body });
    if (!resultat.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Données invalides.',
        resultat.error.issues.map((issue) => ({
          champ: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }

    res.json({ event: updateEvent(id, req.valid.body) });
  },
);

router.delete('/events/:id', validate({ params: eventParamsSchema }), (req, res) => {
  if (deleteEvent(req.valid.params.id) === 0) throw eventNotFound();

  res.json({ ok: true });
});
