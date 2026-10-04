import { Router } from 'express';
import { z } from 'zod';

import {
  createPerson,
  deletePerson,
  getPerson,
  listPeople,
  updatePerson,
} from '../../lib/people.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { T } from './textes.js';

export const router = Router();

const personSchema = z.object({
  displayName: z.string().trim().min(1, T.nomRequis).max(60, T.nomTropLong),
});

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

const notFound = () => new AppError(404, 'PERSON_NOT_FOUND', T.introuvable);

router.get('/', (req, res) => {
  res.json({ people: listPeople() });
});

router.post('/', validate({ body: personSchema }), (req, res) => {
  res.status(201).json({ person: createPerson(req.valid.body.displayName) });
});

router.patch('/:id', validate({ params: paramsSchema, body: personSchema }), (req, res) => {
  if (!getPerson(req.valid.params.id)) throw notFound();

  res.json({ person: updatePerson(req.valid.params.id, req.valid.body.displayName) });
});

router.delete('/:id', validate({ params: paramsSchema }), (req, res) => {
  const personne = getPerson(req.valid.params.id);
  if (!personne) throw notFound();

  // Un membre adossé à un compte est recréé au démarrage suivant : le
  // supprimer donnerait l'illusion d'un effet, puis le ferait réapparaître.
  if (personne.hasAccount) {
    throw new AppError(409, 'PERSON_HAS_ACCOUNT', T.aUnCompte);
  }

  deletePerson(personne.id);
  res.json({ ok: true });
});
