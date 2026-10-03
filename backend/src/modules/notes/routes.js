import { Router } from 'express';

import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { createNote, deleteNote, getNote, listNotes, updateNote } from './service.js';
import { createNoteSchema, noteParamsSchema, updateNoteSchema } from './schemas.js';
import { T } from './textes.js';

export const router = Router();

const noteNotFound = () => new AppError(404, 'NOTE_NOT_FOUND', T.introuvable);

router.get('/items', (req, res) => {
  res.json({ notes: listNotes() });
});

router.post('/items', validate({ body: createNoteSchema }), (req, res) => {
  res.status(201).json({ note: createNote(req.valid.body, req.user.id) });
});

router.get('/items/:id', validate({ params: noteParamsSchema }), (req, res) => {
  const note = getNote(req.valid.params.id);
  if (!note) throw noteNotFound();

  res.json({ note });
});

router.patch(
  '/items/:id',
  validate({ params: noteParamsSchema, body: updateNoteSchema }),
  (req, res) => {
    const { id } = req.valid.params;
    const { expectedVersion, ...fields } = req.valid.body;

    const note = updateNote(id, fields, { userId: req.user.id, versionAttendue: expectedVersion });
    if (note) return res.json({ note });

    // Rien n'a été modifié : soit la note a disparu, soit l'autre est passé
    // avant. Deux situations très différentes pour qui est en train d'écrire.
    if (!getNote(id)) throw noteNotFound();

    /*
     * 409 plutôt qu'un écrasement silencieux. C'est le seul endroit de
     * l'application où deux personnes peuvent se marcher dessus sur le même
     * texte, et perdre trois lignes sans le savoir serait pire que de devoir
     * choisir.
     */
    throw new AppError(409, 'NOTE_CONFLICT', T.conflit);
  },
);

router.delete('/items/:id', validate({ params: noteParamsSchema }), (req, res) => {
  if (deleteNote(req.valid.params.id) === 0) throw noteNotFound();

  res.json({ ok: true });
});
