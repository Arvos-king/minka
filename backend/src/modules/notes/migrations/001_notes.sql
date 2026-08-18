-- Notes partagées du foyer.
--
-- Le filet qui rattrape ce que les modules structurés ne prennent pas : codes,
-- mesures, idées de cadeaux, consignes pour la nounou.
--
-- `version` sert à détecter l'édition simultanée. Un horodatage n'y suffirait
-- pas : `datetime('now')` a la seconde pour résolution, et deux enregistrements
-- séparés par moins d'une seconde — ce que produit une sauvegarde automatique
-- pendant que l'autre tape — porteraient la même valeur. Le conflit passerait
-- alors inaperçu, et le texte de l'un écraserait celui de l'autre en silence.
-- Un entier qui s'incrémente ne connaît pas ce problème.

CREATE TABLE notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT,                          -- NULL = titre déduit du corps
  body       TEXT    NOT NULL DEFAULT '',
  pinned     INTEGER NOT NULL DEFAULT 0,
  version    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  -- Qui a touché la note en dernier : « modifiée par Bastien » dit tout de
  -- suite s'il faut relire ou non.
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- L'écran principal demande « les épinglées d'abord, puis les plus récentes ».
CREATE INDEX idx_notes_pinned_updated ON notes (pinned DESC, updated_at DESC);
