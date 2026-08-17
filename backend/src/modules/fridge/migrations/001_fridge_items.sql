-- Contenu du frigo, partagé comme la liste de courses.
--
-- `expires_on` est une date nue (AAAA-MM-JJ) et non un instant : une date de
-- péremption désigne un jour, pas une heure. Le caractère « périmé » est
-- calculé côté interface, à partir de la date locale du téléphone — c'est elle
-- qui fait foi pour celui qui ouvre le frigo.

CREATE TABLE fridge_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1,
  expires_on TEXT,                          -- NULL = produit sans date
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- L'écran principal trie systématiquement par date d'échéance.
CREATE INDEX idx_fridge_items_expires ON fridge_items (expires_on);
