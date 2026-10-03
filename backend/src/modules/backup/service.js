/**
 * Sauvegardes de la base.
 *
 * `VACUUM INTO` plutôt qu'une copie de fichier : la base tourne en mode WAL, et
 * les écritures récentes vivent dans le journal `minka.db-wal`. Copier le seul
 * `.db` donnerait une image tronquée — et l'opération est cohérente même
 * pendant que l'application écrit, ce qui évite d'avoir à l'interrompre.
 */

import fs from 'node:fs';
import path from 'node:path';

import { config } from '../../config/index.js';
import { db } from '../../db/index.js';
import { T } from './textes.js';

/**
 * Réglages du module.
 *
 * Ils sont lus ici plutôt que dans la configuration du socle : un module doit
 * pouvoir être déposé sans toucher aux fichiers communs. Une valeur aberrante
 * n'empêche pas l'application de démarrer — contrairement à un secret de
 * session manquant, une heure de sauvegarde farfelue n'est pas fatale, elle
 * mérite un avertissement et une valeur de repli.
 */
function lireEntier(nom, defaut, { min, max }) {
  const brut = (process.env[nom] ?? '').trim();
  if (brut === '') return defaut;

  const valeur = Number(brut);
  if (!Number.isInteger(valeur) || valeur < min || valeur > max) {
    console.warn(T.reglageIgnore(nom, brut, min, max));
    return defaut;
  }
  return valeur;
}

export const reglages = {
  actif: (process.env.BACKUP_ENABLED ?? 'true').trim().toLowerCase() !== 'false',
  dossier: path.resolve(process.env.BACKUP_DIR ?? path.join(config.dataDir, 'backups')),
  heure: lireEntier('BACKUP_HOUR', 3, { min: 0, max: 23 }),
  conserver: lireEntier('BACKUP_KEEP', 14, { min: 1, max: 365 }),
};

const MOTIF = /^minka-(\d{4}-\d{2}-\d{2})\.db$/;

/** Date du jour au format AAAA-MM-JJ, dans le fuseau du conteneur. */
function aujourdhui() {
  const maintenant = new Date();
  const decalage = maintenant.getTimezoneOffset() * 60_000;
  return new Date(maintenant.getTime() - decalage).toISOString().slice(0, 10);
}

export function listerSauvegardes() {
  if (!fs.existsSync(reglages.dossier)) return [];

  return fs
    .readdirSync(reglages.dossier)
    .filter((nom) => MOTIF.test(nom))
    // Le nom porte une date ISO : l'ordre alphabétique est l'ordre chronologique.
    .sort()
    .map((nom) => ({
      nom,
      date: MOTIF.exec(nom)[1],
      taille: fs.statSync(path.join(reglages.dossier, nom)).size,
    }));
}

/**
 * Supprime les sauvegardes excédentaires, les plus anciennes d'abord.
 * @returns {number} nombre de fichiers retirés
 */
export function purgerAnciennes() {
  const sauvegardes = listerSauvegardes();
  const excedent = sauvegardes.slice(0, Math.max(0, sauvegardes.length - reglages.conserver));

  for (const { nom } of excedent) {
    fs.rmSync(path.join(reglages.dossier, nom), { force: true });
  }
  return excedent.length;
}

export function creerSauvegarde() {
  fs.mkdirSync(reglages.dossier, { recursive: true });

  const nom = `minka-${aujourdhui()}.db`;
  const destination = path.join(reglages.dossier, nom);

  // VACUUM INTO refuse d'écrire sur un fichier existant : une seconde
  // sauvegarde le même jour remplace la précédente.
  fs.rmSync(destination, { force: true });
  db.exec(`VACUUM INTO '${destination.replaceAll("'", "''")}'`);

  const taille = fs.statSync(destination).size;
  const purgees = purgerAnciennes();

  console.log(T.sauvegarde(nom, Math.round(taille / 1024), purgees));

  return { nom, taille, purgees };
}
