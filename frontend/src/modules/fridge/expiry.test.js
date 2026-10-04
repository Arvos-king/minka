import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aujourdhui, decalerJours } from '../../lib/dates.js';
import { dansNJours, joursRestants, statutPeremption } from './expiry.js';

/**
 * Les dates sont construites par rapport à aujourd'hui plutôt que figées :
 * `statutPeremption` lit l'horloge elle-même, et un mock d'horloge rendrait ces
 * tests dépendants du fuseau de la machine qui les exécute.
 */
const dans = (jours) => decalerJours(aujourdhui(), jours);

describe('joursRestants', () => {
  it('compte les jours jusqu’à la péremption', () => {
    assert.equal(joursRestants(dans(0)), 0);
    assert.equal(joursRestants(dans(5)), 5);
    assert.equal(joursRestants(dans(-2)), -2);
  });
});

describe('statutPeremption', () => {
  it('reste muet sans date', () => {
    assert.deepEqual(statutPeremption(null), { niveau: 'aucun', libelle: null, jours: null });
    assert.deepEqual(statutPeremption(undefined), { niveau: 'aucun', libelle: null, jours: null });
  });

  it('signale ce qui est périmé', () => {
    assert.deepEqual(statutPeremption(dans(-1)), {
      niveau: 'perime',
      libelle: 'Périmé hier',
      jours: -1,
    });
    assert.deepEqual(statutPeremption(dans(-3)), {
      niveau: 'perime',
      libelle: 'Périmé depuis 3 j',
      jours: -3,
    });
  });

  it('distingue aujourd’hui de demain', () => {
    assert.deepEqual(statutPeremption(dans(0)), {
      niveau: 'aujourdhui',
      libelle: "Aujourd'hui",
      jours: 0,
    });
    assert.deepEqual(statutPeremption(dans(1)), {
      niveau: 'bientot',
      libelle: 'Demain',
      jours: 1,
    });
  });

  it('alerte jusqu’à trois jours inclus', () => {
    // La frontière du bandeau d'urgence : à 3 jours on alerte, à 4 non.
    assert.equal(statutPeremption(dans(2)).niveau, 'bientot');
    assert.equal(statutPeremption(dans(2)).libelle, 'Dans 2 j');
    assert.equal(statutPeremption(dans(3)).niveau, 'bientot');
    assert.equal(statutPeremption(dans(3)).libelle, 'Dans 3 j');
    assert.equal(statutPeremption(dans(4)).niveau, 'ok');
  });

  it('affiche une date au-delà du seuil', () => {
    const statut = statutPeremption(dans(10));

    assert.equal(statut.niveau, 'ok');
    assert.equal(statut.jours, 10);
    assert.match(statut.libelle, /^\d+ /, 'un libellé de la forme « 27 août »');
  });
});

describe('statutPeremption en anglais', () => {
  it('nomme les mêmes échéances', () => {
    assert.equal(statutPeremption(dans(-1), 'en').libelle, 'Expired yesterday');
    assert.equal(statutPeremption(dans(-3), 'en').libelle, 'Expired 3 days ago');
    assert.equal(statutPeremption(dans(0), 'en').libelle, 'Today');
    assert.equal(statutPeremption(dans(1), 'en').libelle, 'Tomorrow');
    assert.equal(statutPeremption(dans(2), 'en').libelle, 'In 2 days');
    assert.match(statutPeremption(dans(10), 'en').libelle, /^\d+ /);
  });

  it('garde les mêmes niveaux, qui ne dépendent pas de la langue', () => {
    for (const jours of [-3, 0, 2, 3, 4, 10]) {
      assert.equal(statutPeremption(dans(jours), 'en').niveau, statutPeremption(dans(jours)).niveau);
    }
  });
});

describe('dansNJours', () => {
  it('produit les dates des raccourcis du formulaire', () => {
    assert.equal(dansNJours(0), aujourdhui());
    assert.equal(dansNJours(3), dans(3));
    assert.equal(dansNJours(7), dans(7));
    assert.equal(dansNJours(30), dans(30));
  });
});
