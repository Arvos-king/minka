import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleTitre, memePlat } from './titres.js';

describe('cleTitre', () => {
  it('ignore la casse, les accents et la ponctuation', () => {
    assert.equal(cleTitre('Gratin dauphinois'), cleTitre('GRATIN  Dauphinois.'));
    assert.equal(cleTitre('Pâtes à la crème'), cleTitre('pates a la creme'));
    assert.equal(cleTitre('Chili sin carne'), cleTitre('Chili-sin-carne'));
  });

  it('confond les deux apostrophes', () => {
    // L'une se tape au clavier d'un ordinateur, l'autre sort d'un téléphone ou
    // d'une réponse de Claude.
    assert.equal(cleTitre("Gratin d'aubergines"), cleTitre('Gratin d’aubergines'));
  });

  it('ignore le pluriel', () => {
    // Sans cela, une proposition écrite au singulier dédoublait le répertoire.
    assert.equal(cleTitre('Gratin de courgette'), cleTitre('Gratin de courgettes'));
    assert.equal(cleTitre('Soupe de poireau'), cleTitre('Soupe de poireaux'));
  });

  it('laisse les mots courts tels quels', () => {
    assert.equal(cleTitre('Tarte aux pommes'), 'tarte aux pomme');
    assert.equal(cleTitre('Riz'), 'riz');
  });

  it('défait les ligatures', () => {
    assert.equal(cleTitre('Bœuf bourguignon'), cleTitre('Boeuf bourguignon'));
  });

  it('ne confond pas deux plats différents', () => {
    assert.notEqual(cleTitre('Tarte aux pommes'), cleTitre('Tarte aux pommes de terre'));
    assert.notEqual(cleTitre('Gratin de courgettes'), cleTitre('Gratin d’aubergines'));
  });

  it('rend une clé vide pour un titre vide', () => {
    assert.equal(cleTitre(''), '');
    assert.equal(cleTitre(null), '');
    assert.equal(cleTitre(' — '), '');
  });
});

describe('memePlat', () => {
  it('reconnaît le même plat écrit autrement', () => {
    assert.equal(memePlat('Soupe de potirons', 'Soupe de potiron'), true);
    assert.equal(memePlat('Soupe de potiron', 'Velouté de potiron'), false);
  });

  it('ne confond pas deux titres vides', () => {
    assert.equal(memePlat('', ' — '), false);
  });
});

describe('en anglais', () => {
  const meme = (a, b) => memePlat(a, b, 'en');

  it('réunit le singulier et le pluriel, même irréguliers', () => {
    // Ôter un « s » ne suffit pas : « tomatoes », « berries », « peaches ».
    assert.equal(meme('Roast potatoes', 'Roast potato'), true);
    assert.equal(meme('Berries crumble', 'Berry crumble'), true);
    assert.equal(meme('Peach cobbler', 'Peaches cobbler'), true);
    assert.equal(meme('Chocolate chip cookies', 'Chocolate chip cookie'), true);
    assert.equal(meme('Fish pie', 'Fish pies'), true);
  });

  it('garde les mots déjà au singulier', () => {
    assert.equal(meme('Hummus', 'Hummu'), false);
    assert.equal(cleTitre('Hummus', 'en'), 'hummus');
  });

  it('ne confond pas deux plats différents', () => {
    assert.equal(meme('Apple pie', 'Apple tart'), false);
    assert.equal(meme('Fish pie', 'Fish'), false);
  });

  it('laisse la règle française intacte', () => {
    // La règle anglaise n'est appliquée qu'aux instances anglaises.
    assert.equal(cleTitre('Gratin de courgettes'), 'gratin de courgette');
  });
});
