import { z } from 'zod';

import { isoDate, isoTime } from '../../lib/schemas.js';

const title = z
  .string()
  .trim()
  .min(1, "L'intitulé est requis.")
  .max(120, "L'intitulé est trop long.");

const note = z.string().trim().max(500, 'La note est trop longue.').nullable();

/** `null` = événement qui concerne tout le monde. */
const ownerId = z.number().int().positive().nullable();

const champs = {
  title,
  startsOn: isoDate,
  startsAt: isoTime.nullable(),
  endsOn: isoDate.nullable(),
  endsAt: isoTime.nullable(),
  ownerId,
  note,
};

/**
 * Cohérence interne d'un événement.
 *
 * Appliquée aussi bien à la création qu'à la modification, sur l'objet
 * complet : vérifier ces règles champ par champ ne dirait rien, puisqu'elles
 * portent précisément sur la relation entre eux.
 */
function verifierCoherence(valeur, ctx) {
  const { startsOn, startsAt, endsOn, endsAt } = valeur;

  if (endsOn && startsOn && endsOn < startsOn) {
    ctx.addIssue({
      code: 'custom',
      path: ['endsOn'],
      message: 'La fin ne peut pas précéder le début.',
    });
  }

  // Heure de fin sur un événement d'une seule journée : elle doit suivre
  // l'heure de début. Sur plusieurs jours, une fin « plus tôt » est normale.
  const memeJour = !endsOn || endsOn === startsOn;
  if (memeJour && startsAt && endsAt && endsAt <= startsAt) {
    ctx.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: "L'heure de fin doit suivre l'heure de début.",
    });
  }

  // Une heure de fin sans heure de début n'a pas de sens : l'événement est
  // alors déclaré sur la journée entière.
  if (endsAt && !startsAt) {
    ctx.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: "Indique une heure de début, ou retire l'heure de fin.",
    });
  }
}

export const createEventSchema = z
  .object({
    ...champs,
    startsAt: champs.startsAt.default(null),
    endsOn: champs.endsOn.default(null),
    endsAt: champs.endsAt.default(null),
    ownerId: champs.ownerId.default(null),
    note: champs.note.default(null),
  })
  .superRefine(verifierCoherence);

export const updateEventSchema = z
  .object({
    title: title.optional(),
    startsOn: isoDate.optional(),
    startsAt: champs.startsAt.optional(),
    endsOn: champs.endsOn.optional(),
    endsAt: champs.endsAt.optional(),
    ownerId: champs.ownerId.optional(),
    note: champs.note.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune modification fournie.',
  });

export const listQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export const eventParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const personSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Le nom est requis.')
    .max(60, 'Le nom est trop long.'),
});
