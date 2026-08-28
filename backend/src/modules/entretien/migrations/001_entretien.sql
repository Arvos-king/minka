-- Planning d'entretien de la maison.
--
-- Proche des tâches, mais pas la même chose, et la différence tient en une
-- phrase : **une tâche se replanifie depuis son échéance, un entretien depuis
-- le jour où on l'a fait**.
--
-- « Sortir les poubelles chaque semaine » vise le mardi : si on coche avec
-- trois jours de retard, la prochaine reste le mardi suivant. « Détartrer la
-- machine tous les mois » vise un intervalle depuis le dernier détartrage : le
-- faire avec trois semaines de retard décale d'autant la fois suivante, sinon
-- on redétartrerait une semaine après.
--
-- D'où une table à part, et `last_done_on` qui porte la mémoire du geste.

CREATE TABLE maintenance_zones (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  label      TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_maintenance_zones_label ON maintenance_zones (label COLLATE NOCASE);

CREATE TABLE maintenance_tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Une intervention sans pièce reste valable : « laver toutes les vitres » ne
  -- se range nulle part en particulier.
  zone_id     INTEGER REFERENCES maintenance_zones(id) ON DELETE SET NULL,
  label       TEXT    NOT NULL,
  -- Toujours un rythme : sans lui, ce serait une tâche, pas un entretien.
  recurrence  TEXT    NOT NULL CHECK (
                recurrence IN ('weekly', 'monthly', 'quarterly', 'biannual', 'yearly')
              ),
  due_on      TEXT    NOT NULL,          -- AAAA-MM-JJ, prochaine échéance
  last_done_on TEXT,                     -- NULL = jamais fait depuis la mise en place
  assignee_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- L'écran principal demande « ce qui est en retard, puis ce qui vient ».
CREATE INDEX idx_maintenance_tasks_due ON maintenance_tasks (due_on);
CREATE INDEX idx_maintenance_tasks_zone ON maintenance_tasks (zone_id);
