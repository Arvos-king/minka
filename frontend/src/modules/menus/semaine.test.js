import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  debutSemaine,
  decalerSemaine,
  finSemaine,
  joursDeLaSemaine,
  libelleJour,
  libelleSemaine,
} from './semaine.js';

/* 2026-08-17 est un lundi ; 2026-08-23, le dimanche qui le suit. */

describe('debutSemaine', () => {
  it('renvoie le lundi lui-même', () => {
    assert.equal(debutSemaine('2026-08-17'), '2026-08-17');
  });

  it('remonte au lundi depuis le milieu de la semaine', () => {
    assert.equal(debutSemaine('2026-08-20'), '2026-08-17');
  });

  it('rattache le dimanche à la semaine qui s’achève', () => {
    // Le piège du calcul : `getUTCDay()` place dimanche à 0, et sans décalage
    // il ouvrirait la semaine au lieu de la fermer.
    assert.equal(debutSemaine('2026-08-23'), '2026-08-17');
  });

  it('bascule bien au lundi suivant', () => {
    assert.equal(debutSemaine('2026-08-24'), '2026-08-24');
  });

  it('franchit un changement de mois', () => {
    // 2026-09-01 est un mardi : sa semaine commence le 31 août.
    assert.equal(debutSemaine('2026-09-01'), '2026-08-31');
  });

  it('franchit un changement d’année', () => {
    // 2027-01-01 est un vendredi : sa semaine commence le 28 décembre 2026.
    assert.equal(debutSemaine('2027-01-01'), '2026-12-28');
  });

  it('reste juste au passage à l’heure d’été', () => {
    // 2026-03-29 est le dimanche du changement d'heure : il clôt la semaine
    // du 23. Un calcul en heure locale perdrait une journée ici.
    assert.equal(debutSemaine('2026-03-29'), '2026-03-23');
  });
});

describe('finSemaine', () => {
  it('donne le dimanche', () => {
    assert.equal(finSemaine('2026-08-17'), '2026-08-23');
  });
});

describe('joursDeLaSemaine', () => {
  it('donne sept jours consécutifs, du lundi au dimanche', () => {
    assert.deepEqual(joursDeLaSemaine('2026-08-17'), [
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ]);
  });

  it('reste à sept jours à cheval sur deux mois', () => {
    const jours = joursDeLaSemaine('2026-08-31');

    assert.equal(jours.length, 7);
    assert.equal(jours[0], '2026-08-31');
    assert.equal(jours.at(-1), '2026-09-06');
  });
});

describe('decalerSemaine', () => {
  it('avance et recule d’une semaine', () => {
    assert.equal(decalerSemaine('2026-08-17', 1), '2026-08-24');
    assert.equal(decalerSemaine('2026-08-17', -1), '2026-08-10');
  });

  it('reste sur un lundi après plusieurs sauts', () => {
    assert.equal(debutSemaine(decalerSemaine('2026-08-17', 9)), decalerSemaine('2026-08-17', 9));
  });
});

describe('libelleSemaine', () => {
  const anneeCourante = new Date().getFullYear();

  it('ne répète pas le mois quand la semaine y tient', () => {
    assert.equal(libelleSemaine(`${anneeCourante}-08-17`), '17 – 23 août');
  });

  it('nomme les deux mois quand la semaine est à cheval', () => {
    assert.equal(libelleSemaine(`${anneeCourante}-08-31`), '31 août – 6 septembre');
  });

  it('ajoute l’année quand la semaine sort de l’année en cours', () => {
    // Une semaine de janvier consultée en décembre doit se distinguer.
    const suivante = anneeCourante + 1;
    const libelle = libelleSemaine(debutSemaine(`${suivante}-06-15`));

    assert.ok(libelle.includes(String(suivante)), libelle);
  });

  it('tait l’année de la semaine en cours', () => {
    assert.ok(!libelleSemaine(`${anneeCourante}-08-17`).includes(String(anneeCourante)));
  });
});

describe('libelleJour', () => {
  it('donne le jour de la semaine et le quantième', () => {
    assert.equal(libelleJour('2026-08-17'), 'lundi 17');
    assert.equal(libelleJour('2026-08-23'), 'dimanche 23');
  });
});
