-- Déplace les participants du calendrier vers les membres du foyer du socle.
--
-- La notion servait déjà au calendrier, puis aux tâches : la garder chez l'un
-- des deux aurait obligé l'autre à en dépendre. Elle remonte donc dans le
-- socle, et chaque module s'y réfère sans se connaître.
--
-- Les identifiants sont conservés à l'identique : les événements déjà
-- attribués continuent de désigner la bonne personne, sans retraduction.

INSERT INTO people (id, display_name, user_id, sort_order, created_at)
SELECT id, display_name, user_id, sort_order, created_at FROM calendar_people;

-- SQLite ne sait pas modifier une contrainte de clé étrangère : `owner_id`
-- doit désormais pointer vers `people`, d'où la recréation de la table.
CREATE TABLE calendar_events_v3 (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  starts_on  TEXT    NOT NULL,
  starts_at  TEXT,
  ends_on    TEXT,
  ends_at    TEXT,
  owner_id   INTEGER REFERENCES people(id) ON DELETE SET NULL,
  note       TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO calendar_events_v3
  (id, title, starts_on, starts_at, ends_on, ends_at, owner_id, note, created_at, created_by)
SELECT
   id, title, starts_on, starts_at, ends_on, ends_at, owner_id, note, created_at, created_by
FROM calendar_events;

-- L'ancienne table part avant celle qu'elle référence.
DROP TABLE calendar_events;
ALTER TABLE calendar_events_v3 RENAME TO calendar_events;

CREATE INDEX idx_calendar_events_period ON calendar_events (starts_on, starts_at);

DROP TABLE calendar_people;
