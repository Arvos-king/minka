-- Membres du foyer.
--
-- Cette notion est née dans le module calendrier, puis a servi aux tâches :
-- elle appartient donc au socle, au même titre que les comptes. Les deux
-- restent bien distincts — un membre du foyer n'a pas forcément de compte
-- (enfants, animaux), et n'a pas à pouvoir se connecter pour autant.
--
-- La table est créée vide ici : les données existantes sont reprises par la
-- migration `calendar:003`, qui s'exécute après celles du socle.

CREATE TABLE people (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT    NOT NULL,
  -- Renseigné pour les membres qui ont un compte. Ceux-là sont synchronisés au
  -- démarrage et protégés contre la suppression.
  user_id      INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  sort_order   INTEGER NOT NULL DEFAULT 100,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
