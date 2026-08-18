import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalize, verifierCollisions } from './loader.js';

/** Définition minimale valide, à laquelle chaque test apporte sa variation. */
function definition(champs = {}) {
  return { basePath: '/api/budget', router: () => {}, ...champs };
}

describe('normalize — contrat du module', () => {
  it('accepte une définition minimale', () => {
    const module = normalize(definition(), 'budget');

    assert.equal(module.name, 'budget', 'le nom retombe sur celui du dossier');
    assert.equal(module.basePath, '/api/budget');
    assert.equal(module.folder, 'budget');
  });

  it('protège le module par défaut', () => {
    // L'oubli doit fermer l'accès, jamais l'ouvrir.
    assert.equal(normalize(definition(), 'budget').requiresAuth, true);
    assert.equal(normalize(definition({ requiresAuth: undefined }), 'x').requiresAuth, true);
    assert.equal(normalize(definition({ requiresAuth: 'non' }), 'x').requiresAuth, true);
    assert.equal(normalize(definition({ requiresAuth: false }), 'x').requiresAuth, false);
  });

  it('exige un export par défaut objet', () => {
    assert.throws(() => normalize(undefined, 'budget'), /export par défaut/);
    assert.throws(() => normalize('budget', 'budget'), /export par défaut/);
  });

  it('exige un router', () => {
    assert.throws(() => normalize({ basePath: '/api/budget' }, 'budget'), /router Express/);
  });

  it('refuse un init qui n’est pas une fonction', () => {
    assert.throws(() => normalize(definition({ init: 'seed' }), 'budget'), /init/);
  });

  describe('basePath', () => {
    it('refuse la racine de l’API', () => {
      // `/api/` passerait un simple test de préfixe, et intercepterait les
      // routes de tous les modules chargés après lui.
      assert.throws(() => normalize(definition({ basePath: '/api/' }), 'budget'), /\/api\/<nom>/);
    });

    it('refuse un chemin hors /api', () => {
      assert.throws(() => normalize(definition({ basePath: '/budget' }), 'budget'), /\/api\/<nom>/);
    });

    it('refuse un sous-chemin', () => {
      assert.throws(
        () => normalize(definition({ basePath: '/api/budget/depenses' }), 'budget'),
        /\/api\/<nom>/,
      );
    });

    it('refuse les majuscules', () => {
      assert.throws(() => normalize(definition({ basePath: '/api/Budget' }), 'x'), /\/api\/<nom>/);
    });

    it('accepte un tiret', () => {
      assert.equal(normalize(definition({ basePath: '/api/menus-semaine' }), 'x').basePath, '/api/menus-semaine');
    });

    it('refuse un chemin déjà occupé par le socle', () => {
      assert.throws(
        () => normalize(definition({ basePath: '/api/health' }), 'sonde'),
        /déjà occupé par le socle/,
      );
    });
  });
});

describe('verifierCollisions', () => {
  const module = (folder, name, basePath) => ({ folder, name, basePath });

  it('laisse passer des modules distincts', () => {
    const modules = [
      module('shopping', 'shopping', '/api/shopping'),
      module('tasks', 'tasks', '/api/tasks'),
    ];

    assert.equal(verifierCollisions(modules), modules);
  });

  it('refuse deux modules de même nom', () => {
    // Le cas qui touche aux données : les migrations partagent l'espace de
    // noms `nom:fichier`, donc le 001_init.sql du second passerait pour
    // appliqué et sa table ne serait jamais créée.
    assert.throws(
      () =>
        verifierCollisions([
          module('courses', 'shopping', '/api/courses'),
          module('shopping', 'shopping', '/api/shopping'),
        ]),
      /migrations se confondraient/,
    );
  });

  it('refuse deux modules sur le même basePath', () => {
    assert.throws(
      () =>
        verifierCollisions([
          module('courses', 'courses', '/api/shopping'),
          module('shopping', 'shopping', '/api/shopping'),
        ]),
      /jamais atteintes/,
    );
  });

  it('nomme les deux dossiers fautifs', () => {
    // Un message qui ne dirait pas lesquels obligerait à fouiller à la main.
    assert.throws(
      () =>
        verifierCollisions([
          module('courses', 'courses', '/api/shopping'),
          module('shopping', 'shopping', '/api/shopping'),
        ]),
      (erreur) => erreur.message.includes('courses') && erreur.message.includes('shopping'),
    );
  });
});
