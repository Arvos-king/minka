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

/*
 * Participants du calendrier.
 *
 * Ils sont distincts des comptes : le foyer compte des membres qui n'ont pas à
 * se connecter — enfants, animaux — mais à qui l'on rattache des rendez-vous.
 * Ceux qui ont un compte sont repérés par `user_id` et protégés contre la
 * suppression.
 */

function toPublicPerson(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    hasAccount: row.user_id !== null,
  };
}

/**
 * Participants, dans un ordre stable et prévisible : les titulaires d'un
 * compte d'abord, dans leur ordre de création, puis les autres par ordre
 * alphabétique — un participant ajouté ensuite trouve ainsi sa place tout seul.
 */
export function listPeople() {
  return stmt(`
    SELECT * FROM calendar_people
    ORDER BY user_id IS NULL, sort_order, display_name COLLATE NOCASE
  `)
    .all()
    .map(toPublicPerson);
}

export function getPerson(id) {
  return toPublicPerson(stmt('SELECT * FROM calendar_people WHERE id = ?').get(id));
}

export function personExists(id) {
  return stmt('SELECT 1 FROM calendar_people WHERE id = ?').get(id) !== undefined;
}

export function createPerson(displayName) {
  // Placé en fin de liste : les comptes, créés en premier, gardent la tête.
  const result = stmt(
    'INSERT INTO calendar_people (display_name, sort_order) VALUES (?, 100)',
  ).run(displayName);
  return getPerson(result.lastInsertRowid);
}

export function updatePerson(id, displayName) {
  stmt('UPDATE calendar_people SET display_name = ? WHERE id = ?').run(displayName, id);
  return getPerson(id);
}

export function deletePerson(id) {
  // Les événements qui lui étaient attribués basculent sur « tout le monde »,
  // par le ON DELETE SET NULL de la contrainte : ils ne disparaissent pas.
  return stmt('DELETE FROM calendar_people WHERE id = ?').run(id).changes;
}

/**
 * Ajoute les comptes qui n'ont pas encore de participant associé.
 *
 * Appelée à chaque démarrage : un compte créé plus tard depuis l'environnement
 * apparaît ainsi dans le calendrier sans intervention. Les noms déjà présents
 * ne sont jamais réécrits — un participant peut avoir été renommé depuis
 * l'application.
 */
export function syncAccountsAsPeople() {
  const ajoutes = stmt(`
    INSERT INTO calendar_people (display_name, user_id, sort_order)
    SELECT u.display_name, u.id, u.id
    FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM calendar_people p WHERE p.user_id = u.id)
  `).run().changes;

  if (ajoutes > 0) {
    console.log(`[calendar] ${ajoutes} compte(s) ajouté(s) aux participants.`);
  }
}
