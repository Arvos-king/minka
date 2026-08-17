-- Liste de courses partagée par toute la maison : il n'y a qu'une liste, pas
-- une par personne. `created_by` sert uniquement à savoir qui a ajouté quoi.

CREATE TABLE shopping_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  completed    INTEGER NOT NULL DEFAULT 0, -- 0 = à acheter, 1 = déjà pris
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  -- ON DELETE SET NULL : supprimer un compte ne doit pas emporter la liste
  -- de courses avec lui.
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- L'écran principal demande toujours « les articles à acheter, dans l'ordre
-- d'ajout » : cet index couvre exactement cette requête.
CREATE INDEX idx_shopping_items_completed ON shopping_items (completed, created_at);
