import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aujourdhui, decalerJours } from '../../lib/dates.js';
import { formaterDate, libelleRythme, statutEcheance } from './echeance.js';

const dans = (jours) => decalerJours(aujourdhui(), jours);

describe('statutEcheance', () => {
  it('reste muet sans échéance', () => {
    assert.deepEqual(statutEcheance(null), { niveau: 'aucune', libelle: null });
    assert.deepEqual(statutEcheance(undefined), { niveau: 'aucune', libelle: null });
  });

  it('signale le retard', () => {
    assert.deepEqual(statutEcheance(dans(-1)), { niveau: 'retard', libelle: 'Hier' });
    assert.deepEqual(statutEcheance(dans(-4)), {
      niveau: 'retard',
      libelle: 'En retard de 4 j',
    });
  });

  it('distingue aujourd’hui de demain', () => {
    assert.deepEqual(statutEcheance(dans(0)), { niveau: 'aujourdhui', libelle: "Aujourd'hui" });
    assert.deepEqual(statutEcheance(dans(1)), { niveau: 'bientot', libelle: 'Demain' });
  });

  it('reste « bientôt » jusqu’à sept jours inclus', () => {
    assert.deepEqual(statutEcheance(dans(2)), { niveau: 'bientot', libelle: 'Dans 2 j' });
    assert.deepEqual(statutEcheance(dans(7)), { niveau: 'bientot', libelle: 'Dans 7 j' });
    assert.equal(statutEcheance(dans(8)).niveau, 'plusTard');
  });

  it('affiche une date au-delà de la semaine', () => {
    const statut = statutEcheance(dans(20));

    assert.equal(statut.niveau, 'plusTard');
    assert.match(statut.libelle, /^\d+ /, 'un libellé de la forme « 6 sept. »');
  });
});

describe('formaterDate', () => {
  const anneeCourante = new Date().getFullYear();

  it('tait l’année en cours', () => {
    assert.ok(!formaterDate(`${anneeCourante}-06-15`).includes(String(anneeCourante)));
  });

  it('affiche une autre année', () => {
    // Sans cela, une tâche annuelle replanifiée afficherait « 17 août » et se
    // lirait comme due aujourd'hui.
    const suivante = String(anneeCourante + 1);

    assert.ok(formaterDate(`${suivante}-06-15`).includes(suivante));
  });
});

describe('libelleRythme', () => {
  it('nomme chaque rythme proposé', () => {
    assert.equal(libelleRythme(null), 'Une seule fois');
    assert.equal(libelleRythme('daily'), 'Chaque jour');
    assert.equal(libelleRythme('weekly'), 'Chaque semaine');
    assert.equal(libelleRythme('monthly'), 'Chaque mois');
    assert.equal(libelleRythme('quarterly'), 'Tous les trois mois');
    assert.equal(libelleRythme('biannual'), 'Tous les six mois');
    assert.equal(libelleRythme('yearly'), 'Chaque année');
  });

  it('renvoie null pour un rythme inconnu', () => {
    assert.equal(libelleRythme('hourly'), null);
  });
});
