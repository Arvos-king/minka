import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { libelleCourse } from './courses.js';

describe('libelleCourse', () => {
  it('laisse le nom seul quand aucune quantité n’est connue', () => {
    assert.equal(libelleCourse({ name: 'Courgettes', quantities: [] }), 'Courgettes');
    assert.equal(libelleCourse({ name: 'Courgettes' }), 'Courgettes');
  });

  it('ajoute la quantité entre parenthèses', () => {
    assert.equal(
      libelleCourse({ name: 'Courgettes', quantities: ['200 g'] }),
      'Courgettes (200 g)',
    );
  });

  it('juxtapose les quantités de plusieurs recettes', () => {
    // Volontairement pas additionnées : « 2 gousses » et « un peu » n'ont pas
    // de somme, et c'est le détail qu'on veut lire au rayon.
    assert.equal(
      libelleCourse({ name: 'Ail', quantities: ['2 gousses', 'un peu'] }),
      'Ail (2 gousses + un peu)',
    );
  });

  it('ignore les quantités vides', () => {
    assert.equal(
      libelleCourse({ name: 'Sel', quantities: ['', '   ', 'une pincée'] }),
      'Sel (une pincée)',
    );
    assert.equal(libelleCourse({ name: 'Sel', quantities: ['', '  '] }), 'Sel');
  });

  it('ne dépasse jamais la limite du champ des courses', () => {
    const quantites = Array.from({ length: 30 }, (_, i) => `${i} cuillères à soupe rases`);
    const resultat = libelleCourse({ name: 'Farine de blé complète', quantities: quantites });

    assert.ok(resultat.length <= 120, `longueur ${resultat.length}`);
    assert.ok(resultat.startsWith('Farine de blé complète ('), resultat);
    assert.ok(resultat.endsWith('…)'), resultat);
  });

  it('sacrifie la quantité plutôt que le nom', () => {
    // Un nom amputé rendrait l'article méconnaissable dans le rayon ; une
    // quantité tronquée reste exploitable.
    const nomLong = 'A'.repeat(118);
    const resultat = libelleCourse({ name: nomLong, quantities: ['200 g'] });

    assert.ok(resultat.length <= 120);
    assert.ok(resultat.startsWith(nomLong), 'le nom est intact');
  });

  it('tronque un nom qui dépasse à lui seul', () => {
    const resultat = libelleCourse({ name: 'B'.repeat(200), quantities: ['200 g'] });

    assert.equal(resultat.length, 120);
    assert.ok(resultat.endsWith('…'));
  });
});
