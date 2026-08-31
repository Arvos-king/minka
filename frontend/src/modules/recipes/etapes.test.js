import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decouperEtapes, recoudreEtapes } from './etapes.js';

const textes = (texte) => decouperEtapes(texte).map((etape) => etape.text);

describe('decouperEtapes', () => {
  it('fait une étape par ligne', () => {
    assert.deepEqual(textes('Préchauffer le four\nÉmincer les oignons'), [
      'Préchauffer le four',
      'Émincer les oignons',
    ]);
  });

  it('ne rend rien d’un texte vide', () => {
    assert.deepEqual(decouperEtapes(''), []);
    assert.deepEqual(decouperEtapes(null), []);
    assert.deepEqual(decouperEtapes('   \n\n  '), []);
  });

  it('ignore les lignes vides, qui ne servent qu’à aérer', () => {
    assert.deepEqual(textes('Une\n\n\nDeux\n'), ['Une', 'Deux']);
  });

  it('absorbe les retours chariot d’un texte collé depuis Windows', () => {
    assert.deepEqual(textes('Une\r\nDeux'), ['Une', 'Deux']);
  });

  it('retire la numérotation, que l’affichage refait lui-même', () => {
    assert.deepEqual(textes('1. Une\n2) Deux\n- Trois\n• Quatre\n* Cinq'), [
      'Une',
      'Deux',
      'Trois',
      'Quatre',
      'Cinq',
    ]);
  });

  it('laisse un nombre qui commence vraiment l’étape', () => {
    // « 2 œufs à ajouter » n'est pas une puce : rien ne suit le nombre.
    assert.deepEqual(textes('2 œufs à ajouter\n180 °C pendant 30 min'), [
      '2 œufs à ajouter',
      '180 °C pendant 30 min',
    ]);
  });

  it('ne retire qu’un seul niveau de numérotation', () => {
    // Sinon « 1. 2 gousses d'ail » perdrait sa quantité.
    assert.deepEqual(textes("1. 2 gousses d'ail"), ["2 gousses d'ail"]);
  });
});

describe('recoudreEtapes', () => {
  it('refait le texte du champ de saisie', () => {
    assert.equal(recoudreEtapes([{ text: 'Une' }, { text: 'Deux' }]), 'Une\nDeux');
    assert.equal(recoudreEtapes([]), '');
    assert.equal(recoudreEtapes(undefined), '');
  });

  it('fait l’aller-retour sans rien perdre', () => {
    const etapes = [{ text: 'Préchauffer le four' }, { text: 'Émincer les oignons' }];
    assert.deepEqual(decouperEtapes(recoudreEtapes(etapes)), etapes);
  });
});
