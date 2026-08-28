import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { grouperParUrgence, libelleRythme, statutEcheance } from './echeances.js';

const LE_JOUR = '2026-08-20';
const dans = (n) =>
  new Date(Date.parse(`${LE_JOUR}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

describe('statutEcheance', () => {
  it('signale ce qui est dû aujourd’hui et demain', () => {
    assert.deepEqual(statutEcheance(dans(0), LE_JOUR).niveau, 'aujourdhui');
    assert.equal(statutEcheance(dans(1), LE_JOUR).libelle, 'Demain');
  });

  it('reste « bientôt » jusqu’à sept jours', () => {
    assert.equal(statutEcheance(dans(7), LE_JOUR).niveau, 'bientot');
    assert.equal(statutEcheance(dans(7), LE_JOUR).libelle, 'Dans 7 j');
    assert.equal(statutEcheance(dans(8), LE_JOUR).niveau, 'plusTard');
  });

  it('affiche une date au-delà', () => {
    assert.match(statutEcheance(dans(40), LE_JOUR).libelle, /^\d+ /);
  });

  it('ajoute l’année quand l’échéance sort de l’année en cours', () => {
    assert.match(statutEcheance('2027-03-15', LE_JOUR).libelle, /2027/);
  });

  describe('retard', () => {
    it('compte en jours sur les deux premières semaines', () => {
      assert.equal(statutEcheance(dans(-1), LE_JOUR).libelle, 'Hier');
      assert.equal(statutEcheance(dans(-5), LE_JOUR).libelle, 'En retard de 5 j');
      assert.equal(statutEcheance(dans(-13), LE_JOUR).libelle, 'En retard de 13 j');
    });

    it('passe aux semaines, puis aux mois', () => {
      // « En retard de 87 j » ne dit rien ; « de 3 mois » se comprend.
      assert.equal(statutEcheance(dans(-21), LE_JOUR).libelle, 'En retard de 3 sem.');
      assert.equal(statutEcheance(dans(-87), LE_JOUR).libelle, 'En retard de 3 mois');
      assert.equal(statutEcheance(dans(-365), LE_JOUR).libelle, 'En retard de 12 mois');
    });

    it('classe bien tout retard, si petit soit-il', () => {
      assert.equal(statutEcheance(dans(-1), LE_JOUR).niveau, 'retard');
      assert.equal(statutEcheance(dans(-400), LE_JOUR).niveau, 'retard');
    });
  });
});

describe('grouperParUrgence', () => {
  const tache = (id, jours) => ({ id, dueOn: dans(jours) });

  it('sépare le retard, le proche et le lointain', () => {
    const groupes = grouperParUrgence(
      [tache(1, -30), tache(2, 0), tache(3, 3), tache(4, 45), tache(5, -1)],
      LE_JOUR,
    );

    assert.deepEqual(groupes.enRetard.map((t) => t.id), [1, 5]);
    assert.deepEqual(groupes.bientot.map((t) => t.id), [2, 3]);
    assert.deepEqual(groupes.plusTard.map((t) => t.id), [4]);
  });

  it('range aujourd’hui avec le proche, pas avec le retard', () => {
    // Ce qui est dû aujourd'hui n'a rien à se reprocher.
    const groupes = grouperParUrgence([tache(1, 0)], LE_JOUR);

    assert.equal(groupes.enRetard.length, 0);
    assert.equal(groupes.bientot.length, 1);
  });

  it('accepte un planning vide', () => {
    assert.deepEqual(grouperParUrgence([], LE_JOUR), { enRetard: [], bientot: [], plusTard: [] });
  });
});

describe('libelleRythme', () => {
  it('nomme les rythmes de l’entretien', () => {
    assert.equal(libelleRythme('quarterly'), 'Tous les trois mois');
    assert.equal(libelleRythme('biannual'), 'Tous les six mois');
    assert.equal(libelleRythme('yearly'), 'Chaque année');
  });

  it('ne connaît pas le quotidien', () => {
    // Un geste refait chaque jour est du ménage courant, pas de l'entretien.
    assert.equal(libelleRythme('daily'), null);
  });
});
