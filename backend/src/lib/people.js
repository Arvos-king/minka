/**
 * Membres du foyer.
 *
 * Fait partie du socle : plusieurs modules attribuent leurs objets à une
 * personne — un événement au calendrier, une tâche à faire — et doivent
 * pouvoir lire cette liste sans dépendre les uns des autres. Les routes qui
 * l'exposent vivent dans le module `people`.
 */

import { stmt } from '../db/index.js';
import { T } from '../textes.js';

function toPublicPerson(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    hasAccount: row.user_id !== null,
  };
}

/**
 * Ordre stable et prévisible : les titulaires d'un compte d'abord, dans leur
 * ordre de création, puis les autres par ordre alphabétique — un membre ajouté
 * ensuite trouve ainsi sa place tout seul.
 */
export function listPeople() {
  return stmt(`
    SELECT * FROM people
    ORDER BY user_id IS NULL, sort_order, display_name COLLATE NOCASE
  `)
    .all()
    .map(toPublicPerson);
}

export function getPerson(id) {
  return toPublicPerson(stmt('SELECT * FROM people WHERE id = ?').get(id));
}

export function personExists(id) {
  return stmt('SELECT 1 FROM people WHERE id = ?').get(id) !== undefined;
}

export function createPerson(displayName) {
  // Rang par défaut : les comptes, dont le rang suit leur identifiant, gardent
  // la tête de liste.
  const result = stmt('INSERT INTO people (display_name) VALUES (?)').run(displayName);
  return getPerson(result.lastInsertRowid);
}

export function updatePerson(id, displayName) {
  stmt('UPDATE people SET display_name = ? WHERE id = ?').run(displayName, id);
  return getPerson(id);
}

export function deletePerson(id) {
  // Les objets qui lui étaient attribués ne disparaissent pas : leurs
  // références passent à NULL, par le ON DELETE SET NULL de chaque module.
  return stmt('DELETE FROM people WHERE id = ?').run(id).changes;
}

/**
 * Ajoute les comptes qui n'ont pas encore de membre associé.
 *
 * Appelée à chaque démarrage : un compte créé plus tard depuis l'environnement
 * apparaît ainsi partout sans intervention. Les noms déjà présents ne sont
 * jamais réécrits — un membre peut avoir été renommé depuis l'application.
 */
export function syncAccountsAsPeople() {
  const ajoutes = stmt(`
    INSERT INTO people (display_name, user_id, sort_order)
    SELECT u.display_name, u.id, u.id
    FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM people p WHERE p.user_id = u.id)
  `).run().changes;

  if (ajoutes > 0) {
    console.log(T.membres.comptesAjoutes(ajoutes));
  }
}
