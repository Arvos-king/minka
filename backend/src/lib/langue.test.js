import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { LANGUES, lireLangue, localeDe, textes } from './langue.js';

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Tous les dictionnaires de l'API : celui du socle et ceux des modules. */
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

describe('lireLangue', () => {
  it('parle français quand rien n’est demandé', () => {
    assert.equal(lireLangue(undefined), 'fr');
    assert.equal(lireLangue(''), 'fr');
    assert.equal(lireLangue('  '), 'fr');
  });

  it('reconnaît les langues prévues, sans égard à la casse ni aux espaces', () => {
    assert.equal(lireLangue('en'), 'en');
    assert.equal(lireLangue(' EN '), 'en');
    assert.equal(lireLangue('fr'), 'fr');
  });

  it('refuse une langue inconnue plutôt que de la deviner', () => {
    // `null` et non le français : c'est la configuration qui doit arrêter le
    // démarrage, sans quoi une faute de frappe passerait inaperçue.
    assert.equal(lireLangue('de'), null);
    assert.equal(lireLangue('english'), null);
  });
});

describe('textes', () => {
  const dictionnaires = { fr: { bonjour: 'Bonjour' }, en: { bonjour: 'Hello' } };

  it('rend le dictionnaire de la langue demandée', () => {
    assert.equal(textes(dictionnaires, 'en').bonjour, 'Hello');
    assert.equal(textes(dictionnaires, 'fr').bonjour, 'Bonjour');
  });

  it('retombe sur le français pour une langue absente', () => {
    assert.equal(textes(dictionnaires, 'de').bonjour, 'Bonjour');
  });
});

describe('localeDe', () => {
  it('écrit les dates anglaises à la britannique', () => {
    // Le jour avant le mois, comme en français : « Monday 5 October ».
    assert.equal(localeDe('en'), 'en-GB');
    assert.equal(localeDe('fr'), 'fr-FR');
  });
});

describe('dictionnaires de l’API', () => {
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
