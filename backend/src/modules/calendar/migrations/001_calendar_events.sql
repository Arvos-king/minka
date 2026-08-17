-- Calendrier partagé du foyer.
--
-- Date et heure sont séparées volontairement : un événement sur la journée
-- entière n'a pas d'heure du tout, et le représenter par un horodatage à
-- minuit obligerait ensuite à deviner s'il s'agit d'un vrai rendez-vous ou
-- d'une convention. `starts_at` à NULL signifie « toute la journée ».
--
-- `ends_on` couvre les séjours et week-ends : NULL signifie que l'événement
-- tient sur la seule journée de `starts_on`.
--
-- `owner_id` désigne la personne concernée ; NULL signifie « tout le monde ».

CREATE TABLE calendar_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  starts_on  TEXT    NOT NULL,   -- AAAA-MM-JJ
  starts_at  TEXT,               -- HH:MM, NULL = journée entière
  ends_on    TEXT,               -- AAAA-MM-JJ, NULL = même jour
  ends_at    TEXT,               -- HH:MM
  owner_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note       TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- L'agenda interroge toujours une plage de dates, triée chronologiquement.
CREATE INDEX idx_calendar_events_period ON calendar_events (starts_on, starts_at);
