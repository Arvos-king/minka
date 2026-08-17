-- Liste de tâches du foyer.
--
-- `recurrence` décrit une tâche qui revient : cocher une tâche récurrente ne la
-- termine pas, elle se replanifie à l'échéance suivante. Une seule ligne suffit
-- donc pour « sortir les poubelles chaque semaine », là où un calendrier
-- devrait déplier chaque occurrence.
--
-- `assignee_id` désigne un membre du foyer ; NULL signifie « à faire par
-- n'importe qui ».

CREATE TABLE tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  done         INTEGER NOT NULL DEFAULT 0,
  due_on       TEXT,                          -- AAAA-MM-JJ, NULL = sans échéance
  recurrence   TEXT,                          -- NULL | daily | weekly | monthly | yearly
  assignee_id  INTEGER REFERENCES people(id) ON DELETE SET NULL,
  note         TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  -- Date du dernier achèvement : pour une tâche récurrente, c'est la seule
  -- trace de son passage, puisque la ligne repart pour un tour.
  completed_at TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- L'écran principal demande « ce qui reste à faire, par échéance ».
CREATE INDEX idx_tasks_done_due ON tasks (done, due_on);
