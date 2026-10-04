import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { DEVISE, LANGUE, LANGUES, formateurDate, localeDe, textes } from './langue.js';

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Tous les dictionnaires de l'interface : celui du socle et ceux des modules. */
function fichiersDeTextes(dossier = srcDir) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersDeTextes(chemin);
    return entree.name === 'textes.js' ? [chemin] : [];
  });
}

/**
 * Forme d'un dictionnaire : chaque clé, avec la nature de sa valeur — et pour
 * une fonction, son nombre de paramètres. Une traduction qui oublie une clé,
 * ou qui attend un argument de moins, se voit ainsi avant d'arriver à l'écran.
 */
function forme(valeur, prefixe = '') {
  if (typeof valeur === 'function') return [`${prefixe} : fonction(${valeur.length})`];
  if (Array.isArray(valeur)) return [`${prefixe} : liste`];
  if (valeur !== null && typeof valeur === 'object') {
    return Object.keys(valeur)
      .sort()
      .flatMap((cle) => forme(valeur[cle], prefixe ? `${prefixe}.${cle}` : cle));
  }
  return [`${prefixe} : ${typeof valeur}`];
}

describe('langue de l’instance', () => {
  it('est le français hors de Vite', () => {
    // Sous `node --test`, la constante posée par Vite n'existe pas : les tests
    // ne dépendent d'aucune variable du poste.
    assert.equal(LANGUE, 'fr');
    assert.equal(DEVISE, 'EUR');
  });

  it('écrit les dates anglaises à la britannique', () => {
    assert.equal(localeDe('en'), 'en-GB');
    assert.equal(
      formateurDate({ weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }, 'en').format(
        new Date('2026-10-05T00:00:00Z'),
      ),
      'Monday 5 October',
    );
  });

  it('réutilise le même formateur pour les mêmes options', () => {
    const options = { day: 'numeric', timeZone: 'UTC' };
    assert.equal(formateurDate(options, 'fr'), formateurDate({ ...options }, 'fr'));
    assert.notEqual(formateurDate(options, 'fr'), formateurDate(options, 'en'));
  });
});

describe('textes', () => {
  const dictionnaires = { fr: { bonjour: 'Bonjour' }, en: { bonjour: 'Hello' } };

  it('rend le dictionnaire de la langue demandée', () => {
    assert.equal(textes(dictionnaires, 'en').bonjour, 'Hello');
    assert.equal(textes(dictionnaires).bonjour, 'Bonjour');
  });

  it('retombe sur le français pour une langue absente', () => {
    assert.equal(textes(dictionnaires, 'de').bonjour, 'Bonjour');
  });
});

describe('dictionnaires de l’interface', () => {
  const fichiers = fichiersDeTextes();

  it('sont trouvés', () => {
    assert.ok(fichiers.length > 0);
  });

  for (const fichier of fichiers) {
    const nom = path.relative(srcDir, fichier).split(path.sep).join('/');

    it(`${nom} : les mêmes clés dans chaque langue`, async () => {
      const { TEXTES } = await import(pathToFileURL(fichier).href);

      assert.deepEqual(Object.keys(TEXTES).sort(), [...LANGUES].sort());
      for (const langue of LANGUES) {
        assert.deepEqual(forme(TEXTES[langue]), forme(TEXTES.fr), `${nom}, ${langue}`);
      }
    });
  }
});
