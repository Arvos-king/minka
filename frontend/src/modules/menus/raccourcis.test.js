import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { completerRaccourcis } from './raccourcis.js';

describe('completerRaccourcis', () => {
  it('propose « Restes » et « Resto » à un foyer qui n’a encore rien écrit', () => {
    assert.deepEqual(completerRaccourcis([]), ['Restes', 'Resto']);
  });

  it('place les habitudes du foyer d’abord, dans l’ordre du serveur', () => {
    assert.deepEqual(completerRaccourcis(['Chez mes parents', 'Pâtes']), [
      'Chez mes parents',
      'Pâtes',
      'Restes',
      'Resto',
    ]);
  });

  it('ne double pas une habitude écrite dans une autre casse', () => {
    assert.deepEqual(completerRaccourcis(['resto', 'Pizza']), ['resto', 'Pizza', 'Restes']);
  });

  it('s’arrête à cinq', () => {
    assert.deepEqual(completerRaccourcis(['Un', 'Deux', 'Trois', 'Quatre', 'Cinq']), [
      'Un',
      'Deux',
      'Trois',
      'Quatre',
      'Cinq',
    ]);
    assert.equal(completerRaccourcis(['Un', 'Deux', 'Trois', 'Quatre']).length, 5);
  });
});
