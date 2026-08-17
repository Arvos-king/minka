/**
 * Accès aux comptes et vérification des mots de passe.
 */

import { compare, hash } from 'bcryptjs';

import { stmt } from '../../db/index.js';

/**
 * Coût du hachage bcrypt. 12 tours représentent quelques centaines de
 * millisecondes par tentative : imperceptible à la connexion, mais assez lent
 * pour rendre une attaque par force brute inintéressante — d'autant que le
 * nombre de tentatives est déjà limité.
 */
const BCRYPT_ROUNDS = 12;

/** Ne laisse jamais sortir le hachage du mot de passe hors de ce module. */
export function toPublicUser(row) {
  if (!row) return null;
  return { id: row.id, username: row.username, displayName: row.display_name };
}

export function findByUsername(username) {
  return stmt('SELECT * FROM users WHERE username = ?').get(username);
}

export function countUsers() {
  return stmt('SELECT COUNT(*) AS total FROM users').get().total;
}

export async function createUser({ username, password, displayName }) {
  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const result = stmt(
    'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)',
  ).run(username, displayName, passwordHash);
  return stmt('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
}

/**
 * Vérifie un couple identifiant / mot de passe.
 *
 * @returns {Promise<object|null>} la ligne utilisateur, ou null si l'un des deux est faux.
 */
export async function verifyCredentials(username, password) {
  const user = findByUsername(username);

  if (!user) {
    // On hache tout de même le mot de passe fourni, uniquement pour consommer
    // le même temps qu'une vérification réelle : une réponse immédiate
    // révélerait qu'aucun compte ne porte cet identifiant.
    await hash(password, BCRYPT_ROUNDS);
    return null;
  }

  const valid = await compare(password, user.password_hash);
  return valid ? user : null;
}

export async function updatePassword(userId, newPassword) {
  const passwordHash = await hash(newPassword, BCRYPT_ROUNDS);
  stmt("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
    passwordHash,
    userId,
  );
}
