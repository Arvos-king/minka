import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { etapesRetenues } from './progression.js';

const HEURE = 60 * 60 * 1000;
const MAINTENANT = Date.parse('2026-08-31T19:00:00Z');

const ETAPES = [{ id: 10 }, { id: 11 }, { id: 12 }];
const retenues = (enregistree, steps = ETAPES) =>
  etapesRetenues(enregistree, steps, MAINTENANT);

describe('etapesRetenues', () => {
  it('ne retient rien sans progression enregistrée', () => {
    assert.deepEqual(retenues(null), []);
    assert.deepEqual(retenues(undefined), []);
    assert.deepEqual(retenues({}), []);
    assert.deepEqual(retenues({ etapes: 'abc', le: MAINTENANT }), []);
  });

  it('reprend une progression récente', () => {
    assert.deepEqual(retenues({ etapes: [10, 11], le: MAINTENANT - HEURE }), [10, 11]);
  });

  it('reprend encore après une longue pause dans la journée', () => {
    // Une préparation entamée le matin et reprise le soir doit se retrouver.
    assert.deepEqual(retenues({ etapes: [10], le: MAINTENANT - 11 * HEURE }), [10]);
  });

  it('oublie une progression trop ancienne', () => {
    // Sinon la recette rouverte la semaine suivante s'ouvrirait à moitié
    // cochée, et l'on sauterait des étapes sans s'en apercevoir.
    assert.deepEqual(retenues({ etapes: [10, 11], le: MAINTENANT - 13 * HEURE }), []);
  });

  it('garde une progression datée du futur', () => {
    // L'horloge a reculé : la progression est plus récente que ce que la
    // machine croit, pas plus vieille.
    assert.deepEqual(retenues({ etapes: [10], le: MAINTENANT + 3 * HEURE }), [10]);
  });

  it('écarte les étapes que la recette ne connaît plus', () => {
    assert.deepEqual(retenues({ etapes: [10, 99], le: MAINTENANT }), [10]);
  });

  it('repart de zéro quand la recette a été réenregistrée', () => {
    // Les identifiants changent à chaque enregistrement : plus aucun ne
    // correspond, et la marche à suivre a changé.
    assert.deepEqual(retenues({ etapes: [10, 11], le: MAINTENANT }, [{ id: 20 }, { id: 21 }]), []);
  });

  it('ne retient rien d’une recette devenue sans étapes', () => {
    assert.deepEqual(retenues({ etapes: [10], le: MAINTENANT }, []), []);
  });

  it('ignore un horodatage illisible', () => {
    assert.deepEqual(retenues({ etapes: [10], le: 'hier' }), []);
    assert.deepEqual(retenues({ etapes: [10] }), []);
  });
});
