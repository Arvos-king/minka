import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { libelleAnciennete } from './reseau.js';

const MINUTE = 60_000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

/* Point de référence fixe : le libellé ne doit dépendre que de l'écart. */
const MAINTENANT = Date.parse('2026-08-18T14:00:00Z');
const ilYA = (ecart) => libelleAnciennete(MAINTENANT - ecart, MAINTENANT);

describe('libelleAnciennete', () => {
  it('ne dit rien sans horodatage', () => {
    assert.equal(libelleAnciennete(null, MAINTENANT), null);
    assert.equal(libelleAnciennete(undefined, MAINTENANT), null);
  });

  it('reste vague sur les deux premières minutes', () => {
    assert.equal(ilYA(0), "à l'instant");
    assert.equal(ilYA(90_000), "à l'instant");
  });

  it('compte en minutes jusqu’à une heure', () => {
    assert.equal(ilYA(5 * MINUTE), 'il y a 5 min');
    assert.equal(ilYA(59 * MINUTE), 'il y a 59 min');
  });

  it('bascule en heures à partir de soixante minutes', () => {
    assert.equal(ilYA(HEURE), 'il y a 1 h');
    assert.equal(ilYA(23 * HEURE), 'il y a 23 h');
  });

  it('dit « hier » au-delà de vingt-quatre heures', () => {
    assert.equal(ilYA(JOUR), 'hier');
    assert.equal(ilYA(JOUR + 5 * HEURE), 'hier');
  });

  it('compte en jours ensuite', () => {
    assert.equal(ilYA(2 * JOUR), 'il y a 2 j');
    assert.equal(ilYA(9 * JOUR), 'il y a 9 j');
  });

  it('ne produit rien d’absurde si l’horloge a reculé', () => {
    // Un téléphone qui remet son heure à jour peut placer la synchro dans le
    // futur. « il y a -3 min » serait plus inquiétant que faux.
    assert.equal(libelleAnciennete(MAINTENANT + 3 * MINUTE, MAINTENANT), "à l'instant");
  });

  describe('en anglais', () => {
    const ago = (ecart) => libelleAnciennete(MAINTENANT - ecart, MAINTENANT, 'en');

    it('suit les mêmes paliers', () => {
      assert.equal(ago(0), 'just now');
      assert.equal(ago(5 * MINUTE), '5 min ago');
      assert.equal(ago(2 * HEURE), '2 h ago');
      assert.equal(ago(JOUR), 'yesterday');
      assert.equal(ago(3 * JOUR), '3 days ago');
    });
  });
});
