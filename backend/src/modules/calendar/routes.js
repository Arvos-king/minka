import { Router } from 'express';

import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import {
  createEventSchema,
  eventParamsSchema,
  listQuerySchema,
  personSchema,
  updateEventSchema,
} from './schemas.js';
import {
  createEvent,
  createPerson,
  deleteEvent,
  deletePerson,
  getEvent,
  getPerson,
  listEvents,
  listPeople,
  personExists,
  updateEvent,
  updatePerson,
} from './service.js';

export const router = Router();

const eventNotFound = () => new AppError(404, 'EVENT_NOT_FOUND', "Cet événement n'existe plus.");
const personNotFound = () => new AppError(404, 'PERSON_NOT_FOUND', "Ce participant n'existe plus.");

/** Décale une date AAAA-MM-JJ d'un nombre de jours, en restant en UTC. */
function decalerJours(date, jours) {
  const [annee, mois, jour] = date.split('-').map(Number);
  return new Date(Date.UTC(annee, mois - 1, jour) + jours * 86_400_000).toISOString().slice(0, 10);
}

function aujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

/** Refuse un participant inconnu, plutôt que d'enregistrer une attribution fantôme. */
function verifierPersonne(ownerId) {
  if (ownerId !== undefined && ownerId !== null && !personExists(ownerId)) {
    throw new AppError(400, 'UNKNOWN_PERSON', "Ce participant n'existe pas.");
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

router.post('/people', validate({ body: personSchema }), (req, res) => {
  res.status(201).json({ person: createPerson(req.valid.body.displayName) });
});

router.patch(
  '/people/:id',
  validate({ params: eventParamsSchema, body: personSchema }),
  (req, res) => {
    const { id } = req.valid.params;
    if (!getPerson(id)) throw personNotFound();

    res.json({ person: updatePerson(id, req.valid.body.displayName) });
  },
);

router.delete('/people/:id', validate({ params: eventParamsSchema }), (req, res) => {
  const personne = getPerson(req.valid.params.id);
  if (!personne) throw personNotFound();

  // Un participant adossé à un compte est recréé au démarrage suivant : le
  // supprimer donnerait l'illusion d'un effet, puis le ferait réapparaître.
  if (personne.hasAccount) {
    throw new AppError(
      409,
      'PERSON_HAS_ACCOUNT',
      'Ce participant correspond à un compte de connexion et ne peut pas être retiré.',
    );
  }

  deletePerson(personne.id);
  res.json({ ok: true });
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
