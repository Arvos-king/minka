import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chercherRecettes, etiquettesDe, normaliser } from './recherche.js';

const REPERTOIRE = [
  {
    id: 1,
    title: 'Gratin de courgettes',
    ingredients: ['Courgettes', 'Crème fraîche', 'Gruyère'],
    tags: ['Végétarien', 'Four'],
  },
  {
    id: 2,
    title: 'Chili sin carne',
    ingredients: ['Haricots rouges', 'Tomates', 'Cumin'],
    tags: ['végétarien'],
  },
  { id: 3, title: 'Poulet basquaise', ingredients: ['Poulet', 'Poivrons'], tags: [] },
];

const titres = (resultats) => resultats.map((r) => r.recette.title);

describe('normaliser', () => {
  it('efface la casse et les accents', () => {
    assert.equal(normaliser('  CRÈME Fraîche '), 'creme fraiche');
    assert.equal(normaliser(null), '');
  });
});

describe('chercherRecettes', () => {
  it('rend tout le répertoire sans critère', () => {
    assert.equal(chercherRecettes(REPERTOIRE).length, 3);
  });

  it('cherche dans les titres', () => {
    assert.deepEqual(titres(chercherRecettes(REPERTOIRE, { terme: 'gratin' })), [
      'Gratin de courgettes',
    ]);
  });

  it('cherche aussi dans les ingrédients', () => {
    // « Qu'est-ce que je fais avec des poivrons ? » — la vraie question posée
    // à un répertoire, et elle n'a de réponse que si l'on cherche dedans.
    assert.deepEqual(titres(chercherRecettes(REPERTOIRE, { terme: 'poivrons' })), [
      'Poulet basquaise',
    ]);
  });

  it('ignore accents et casse des deux côtés', () => {
    assert.deepEqual(titres(chercherRecettes(REPERTOIRE, { terme: 'CREME' })), [
      'Gratin de courgettes',
    ]);
  });

  it('dit quel ingrédient a répondu, quand le titre ne le dit pas', () => {
    const [trouve] = chercherRecettes(REPERTOIRE, { terme: 'cumin' });
    assert.deepEqual(trouve.ingredientsTrouves, ['Cumin']);
  });

  it('se tait quand le titre explique déjà la présence', () => {
    // Inutile de rappeler que « Gratin de courgettes » contient des courgettes.
    const [trouve] = chercherRecettes(REPERTOIRE, { terme: 'courgettes' });
    assert.deepEqual(trouve.ingredientsTrouves, []);
  });

  it('filtre par étiquette', () => {
    assert.deepEqual(titres(chercherRecettes(REPERTOIRE, { etiquette: 'Végétarien' })), [
      'Gratin de courgettes',
      'Chili sin carne',
    ]);
  });

  it('rapproche deux orthographes d’une même étiquette', () => {
    assert.equal(chercherRecettes(REPERTOIRE, { etiquette: 'vegetarien' }).length, 2);
  });

  it('combine le terme et l’étiquette', () => {
    assert.deepEqual(
      titres(chercherRecettes(REPERTOIRE, { terme: 'tomates', etiquette: 'Végétarien' })),
      ['Chili sin carne'],
    );
    assert.deepEqual(
      chercherRecettes(REPERTOIRE, { terme: 'poulet', etiquette: 'Végétarien' }),
      [],
    );
  });

  it('supporte une recette sans ingrédients ni étiquettes', () => {
    const nue = [{ id: 9, title: 'Restes' }];
    assert.equal(chercherRecettes(nue, { terme: 'restes' }).length, 1);
    assert.equal(chercherRecettes(nue, { etiquette: 'rapide' }).length, 0);
  });
});

describe('etiquettesDe', () => {
  it('rassemble les orthographes et range par ordre alphabétique', () => {
    assert.deepEqual(etiquettesDe(REPERTOIRE), ['Four', 'Végétarien']);
  });

  it('ne rend rien d’un répertoire sans étiquette', () => {
    assert.deepEqual(etiquettesDe([{ id: 1, title: 'X' }]), []);
  });
});
