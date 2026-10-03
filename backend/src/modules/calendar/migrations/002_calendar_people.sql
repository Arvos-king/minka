-- Découple les participants du calendrier des comptes de connexion.
--
-- Jusqu'ici, seuls les titulaires d'un compte pouvaient se voir attribuer un
-- événement. Or un foyer compte des membres qui n'ont pas à se connecter —
-- enfants, animaux — et à qui l'on veut pourtant rattacher un rendez-vous.
-- Leur créer un compte serait le mauvais remède : ils hériteraient d'un mot de
-- passe et d'un accès à l'application.

CREATE TABLE calendar_people (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT    NOT NULL,
  -- Renseigné pour les participants qui ont un compte : ceux-là sont
  -- synchronisés automatiquement au démarrage et ne peuvent pas être supprimés
  -- depuis l'application.
  user_id      INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  sort_order   INTEGER NOT NULL DEFAULT 100,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Reprise des comptes existants **en conservant leur identifiant** : les
-- événements déjà attribués continuent ainsi de désigner la bonne personne,
-- sans avoir à retraduire quoi que ce soit.
INSERT INTO calendar_people (id, display_name, user_id, sort_order)
SELECT id, display_name, id, id FROM users;

-- Les membres du foyer sans compte s'ajoutent depuis l'application. Cette
-- migration en semait deux, propres au premier foyer qui l'a déployée :
-- retirés depuis qu'une autre instance peut naître de ce dépôt. Les bases où
-- elle est déjà passée les gardent — `schema_migrations` ne retient que le
-- nom du fichier, elle n'y sera jamais rejouée.

-- SQLite ne sait pas modifier une contrainte de clé étrangère : il faut
-- recréer la table, recopier les données, puis la renommer. `owner_id` désigne
-- désormais un participant et non plus un compte.
CREATE TABLE calendar_events_v2 (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  starts_on  TEXT    NOT NULL,
  starts_at  TEXT,
  ends_on    TEXT,
  ends_at    TEXT,
  owner_id   INTEGER REFERENCES calendar_people(id) ON DELETE SET NULL,
  note       TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO calendar_events_v2
  (id, title, starts_on, starts_at, ends_on, ends_at, owner_id, note, created_at, created_by)
SELECT
   id, title, starts_on, starts_at, ends_on, ends_at, owner_id, note, created_at, created_by
FROM calendar_events;

DROP TABLE calendar_events;
ALTER TABLE calendar_events_v2 RENAME TO calendar_events;

CREATE INDEX idx_calendar_events_period ON calendar_events (starts_on, starts_at);
