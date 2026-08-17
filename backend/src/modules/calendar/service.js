/**
 * Accès aux événements du calendrier.
 */

import { stmt } from '../../db/index.js';

function toPublicEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    startsOn: row.starts_on,
    startsAt: row.starts_at,
    endsOn: row.ends_on,
    endsAt: row.ends_at,
    ownerId: row.owner_id,
    note: row.note,
    createdBy: row.created_by,
  };
}

/**
 * Événements chevauchant la période demandée.
 *
 * Le test porte sur le chevauchement et non sur la seule date de début : un
 * séjour commencé la semaine dernière et qui se termine demain doit apparaître
 * dans l'agenda d'aujourd'hui. `COALESCE(ends_on, starts_on)` traite les
 * événements d'une seule journée comme se terminant le jour même.
 *
 * Le tri place les événements sur la journée entière en tête de chaque jour :
 * `starts_at IS NULL` vaut 1 pour eux, et l'ordre décroissant les fait remonter.
 */
export function listEvents({ from, to }) {
  return stmt(`
    SELECT * FROM calendar_events
    WHERE starts_on <= :to AND COALESCE(ends_on, starts_on) >= :from
    ORDER BY starts_on, starts_at IS NULL DESC, starts_at, title COLLATE NOCASE
  `)
    .all({ from, to })
    .map(toPublicEvent);
}

export function getEvent(id) {
  return toPublicEvent(stmt('SELECT * FROM calendar_events WHERE id = ?').get(id));
}

export function createEvent(event, userId) {
  const result = stmt(`
    INSERT INTO calendar_events (title, starts_on, starts_at, ends_on, ends_at, owner_id, note, created_by)
    VALUES (:title, :startsOn, :startsAt, :endsOn, :endsAt, :ownerId, :note, :createdBy)
  `).run({ ...event, createdBy: userId });

  return getEvent(result.lastInsertRowid);
}

const COLONNES = {
  title: 'title',
  startsOn: 'starts_on',
  startsAt: 'starts_at',
  endsOn: 'ends_on',
  endsAt: 'ends_at',
  ownerId: 'owner_id',
  note: 'note',
};

export function updateEvent(id, fields) {
  const assignments = [];
  const values = [];

  for (const [champ, colonne] of Object.entries(COLONNES)) {
    // `undefined` signifie « ne touche pas à ce champ », `null` signifie
    // « vide-le » : les deux cas sont bien distincts.
    if (fields[champ] !== undefined) {
      assignments.push(`${colonne} = ?`);
      values.push(fields[champ]);
    }
  }

  values.push(id);
  stmt(`UPDATE calendar_events SET ${assignments.join(', ')} WHERE id = ?`).run(...values);

  return getEvent(id);
}

export function deleteEvent(id) {
  return stmt('DELETE FROM calendar_events WHERE id = ?').run(id).changes;
}

/**
 * Personnes du foyer, pour l'attribution des événements.
 *
 * La table `users` appartient au socle : la lire ici ne crée aucune dépendance
 * envers le module d'authentification, qui gère les sessions et non l'annuaire.
 */
export function listPeople() {
  return stmt('SELECT id, display_name FROM users ORDER BY id')
    .all()
    .map((row) => ({ id: row.id, displayName: row.display_name }));
}

export function personExists(id) {
  return stmt('SELECT 1 FROM users WHERE id = ?').get(id) !== undefined;
}
