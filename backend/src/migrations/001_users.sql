-- Comptes de la maison. Ils sont créés au démarrage à partir des variables
-- d'environnement (voir src/modules/auth/seed.js) : aucune inscription n'est
-- possible depuis l'application, la plateforme est strictement privée.

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  -- COLLATE NOCASE : « Bastien » et « bastien » désignent le même compte, on ne
  -- se connecte pas de travers parce que le clavier du téléphone a mis une
  -- majuscule automatique.
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
