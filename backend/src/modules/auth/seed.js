/**
 * Création des comptes déclarés dans l'environnement.
 *
 * Appelée à chaque démarrage, via le hook `init` du module. L'opération est
 * idempotente : un compte déjà présent n'est jamais réécrit. C'est délibéré —
 * si l'un de vous change son mot de passe depuis l'application, un
 * redémarrage du conteneur ne doit pas le remettre à la valeur du fichier
 * `.env`, qui serait alors devenue obsolète.
 */

import { config } from '../../config/index.js';
import { countUsers, createUser, findByUsername } from './service.js';
import { T } from './textes.js';

export async function seedUsers() {
  if (config.seedUsers.length === 0) {
    if (countUsers() === 0) {
      console.warn(T.journal.aucunCompte);
    }
    return;
  }

  for (const { username, password, displayName } of config.seedUsers) {
    if (findByUsername(username)) continue;

    await createUser({ username, password, displayName });
    // Le mot de passe n'apparaît évidemment jamais dans les journaux.
    console.log(T.journal.compteCree(username, displayName));
  }
}
