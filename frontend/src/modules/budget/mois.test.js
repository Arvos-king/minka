import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { debutMois, decalerMois, finMois, libelleMois } from './mois.js';

describe('debutMois', () => {
  it('ramène au premier du mois', () => {
    assert.equal(debutMois('2026-08-18'), '2026-08-01');
    assert.equal(debutMois('2026-08-01'), '2026-08-01');
  });
});

describe('finMois', () => {
  it('connaît la longueur de chaque mois', () => {
    assert.equal(finMois('2026-08-01'), '2026-08-31');
    assert.equal(finMois('2026-04-01'), '2026-04-30');
    assert.equal(finMois('2026-02-01'), '2026-02-28');
  });

  it('tient compte des années bissextiles', () => {
    assert.equal(finMois('2024-02-01'), '2024-02-29');
  });

  it('ferme décembre au 31', () => {
    assert.equal(finMois('2026-12-01'), '2026-12-31');
  });
});

describe('decalerMois', () => {
  it('avance et recule d’un mois', () => {
    assert.equal(decalerMois('2026-08-01', 1), '2026-09-01');
    assert.equal(decalerMois('2026-08-01', -1), '2026-07-01');
  });

  it('franchit les années', () => {
    assert.equal(decalerMois('2026-12-01', 1), '2027-01-01');
    assert.equal(decalerMois('2026-01-01', -1), '2025-12-01');
  });

  it('ne dérive pas sur les mois courts', () => {
    // Passer par janvier puis février ne doit pas raccourcir la suite : les
    // bornes se calculent, elles ne s'additionnent pas.
    assert.equal(decalerMois('2026-01-01', 1), '2026-02-01');
    assert.equal(decalerMois('2026-01-01', 2), '2026-03-01');
    assert.equal(finMois(decalerMois('2026-01-01', 2)), '2026-03-31');
  });

  it('revient à son point de départ', () => {
    assert.equal(decalerMois(decalerMois('2026-08-01', 7), -7), '2026-08-01');
  });
});

describe('libelleMois', () => {
  const MAINTENANT = Date.parse('2026-08-18T12:00:00Z');

  it('tait l’année en cours', () => {
    assert.equal(libelleMois('2026-08-01', MAINTENANT), 'août');
    assert.equal(libelleMois('2026-01-01', MAINTENANT), 'janvier');
  });

  it('affiche une autre année', () => {
    // En feuilletant les mois passés, on doit voir qu'on a changé d'exercice.
    assert.match(libelleMois('2025-12-01', MAINTENANT), /décembre\s+2025/);
  });

  it('parle anglais quand on le lui demande', () => {
    assert.equal(libelleMois('2026-08-01', MAINTENANT, 'en'), 'August');
    assert.equal(libelleMois('2025-12-01', MAINTENANT, 'en'), 'December 2025');
  });
});
