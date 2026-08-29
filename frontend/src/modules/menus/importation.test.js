import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyserMenus } from './importation.js';

const LUNDI = '2026-08-31';

describe('analyserMenus', () => {
  it('lit une semaine simple', () => {
    const { repas, avertissements } = analyserMenus(
      ['Lundi', 'Midi : Salade', 'Soir : Soupe', 'Mardi', 'Soir : Pâtes'].join('\n'),
      LUNDI,
    );

    assert.deepEqual(avertissements, []);
    assert.deepEqual(repas, [
      { onDate: '2026-08-31', slot: 'midi', title: 'Salade', ingredients: [] },
      { onDate: '2026-08-31', slot: 'soir', title: 'Soupe', ingredients: [] },
      { onDate: '2026-09-01', slot: 'soir', title: 'Pâtes', ingredients: [] },
    ]);
  });

  it('rattache les ingrédients au plat au-dessus', () => {
    const { repas } = analyserMenus(
      ['Lundi', 'Soir : Gratin', '  - Courgettes : 600 g', '  - Crème : 20 cl', '  - Sel'].join('\n'),
      LUNDI,
    );

    assert.deepEqual(repas[0].ingredients, [
      { name: 'Courgettes', quantity: '600 g' },
      { name: 'Crème', quantity: '20 cl' },
      { name: 'Sel', quantity: null },
    ]);
  });

  it('couvre les sept jours', () => {
    const texte = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
      .map((j) => `${j}\nSoir : Repas`)
      .join('\n');

    assert.deepEqual(
      analyserMenus(texte, LUNDI).repas.map((r) => r.onDate),
      ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'],
    );
  });

  it('accepte les abréviations, la casse et les accents', () => {
    const { repas, avertissements } = analyserMenus(
      ['LUN', 'déjeuner : Un', 'Dîner : Deux', 'mer.', 'DEJEUNER : Trois'].join('\n'),
      LUNDI,
    );

    assert.deepEqual(avertissements, []);
    assert.deepEqual(
      repas.map((r) => `${r.onDate} ${r.slot} ${r.title}`),
      ['2026-08-31 midi Un', '2026-08-31 soir Deux', '2026-09-02 midi Trois'],
    );
  });

  it('tolère la décoration Markdown et les puces', () => {
    // Une réponse copiée depuis une conversation en traîne toujours.
    const { repas, avertissements } = analyserMenus(
      ['## Lundi', '- **Midi** : Salade', '  * Tomates : 4'].join('\n'),
      LUNDI,
    );

    assert.deepEqual(avertissements, []);
    assert.equal(repas[0].title, 'Salade');
    assert.deepEqual(repas[0].ingredients, [{ name: 'Tomates', quantity: '4' }]);
  });

  it('accepte le tiret long comme séparateur', () => {
    const { repas } = analyserMenus(['Lundi', 'Soir — Tarte', '  - Pâte — 1'].join('\n'), LUNDI);

    assert.equal(repas[0].title, 'Tarte');
    assert.deepEqual(repas[0].ingredients, [{ name: 'Pâte', quantity: '1' }]);
  });

  it('ignore le quantième qui suit le nom du jour', () => {
    const { repas, avertissements } = analyserMenus(
      ['Lundi 31 août', 'Soir : Poulet'].join('\n'),
      LUNDI,
    );

    assert.deepEqual(avertissements, []);
    assert.equal(repas[0].onDate, '2026-08-31');
  });

  describe('ce qui ne se comprend pas', () => {
    it('signale un repas annoncé avant tout jour', () => {
      const { repas, avertissements } = analyserMenus('Midi : Salade', LUNDI);

      assert.deepEqual(repas, []);
      assert.match(avertissements[0], /aucun jour/);
    });

    it('signale un créneau sans plat', () => {
      const { avertissements } = analyserMenus(['Lundi', 'Midi :'].join('\n'), LUNDI);

      assert.match(avertissements[0], /aucun plat/);
    });

    it('signale une ligne qui ne ressemble à rien', () => {
      const { avertissements } = analyserMenus(['Lundi', 'blabla'].join('\n'), LUNDI);

      assert.match(avertissements[0], /ignorée/);
    });

    it('garde le dernier quand un créneau est donné deux fois', () => {
      const { repas, avertissements } = analyserMenus(
        ['Lundi', 'Soir : Premier', 'Soir : Second'].join('\n'),
        LUNDI,
      );

      assert.equal(repas.length, 1);
      assert.equal(repas[0].title, 'Second');
      assert.match(avertissements[0], /deux fois/);
    });

    it('le dit quand rien n’est reconnu', () => {
      const { avertissements } = analyserMenus('n’importe quoi', LUNDI);

      assert.match(avertissements.at(-1), /Aucun repas reconnu/);
    });

    it('ne dit rien sur un texte vide', () => {
      assert.deepEqual(analyserMenus('', LUNDI), { repas: [], avertissements: [] });
      assert.deepEqual(analyserMenus(null, LUNDI), { repas: [], avertissements: [] });
    });
  });
});
