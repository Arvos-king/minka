import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { champsACompleter, choisirRecette, sortDuPlat } from './resolution.js';

/** Un plat tel que le rend le schéma : les listes toujours présentes. */
const plat = (champs = {}) => ({
  title: 'Gratin',
  servings: null,
  notes: null,
  ingredients: [],
  steps: [],
  tags: [],
  ...champs,
});

const INGREDIENT = { name: 'Courgettes', quantity: '600 g' };
const ETAPE = { text: 'Préchauffer le four' };

describe('choisirRecette', () => {
  const repertoire = [
    { id: 4, title: 'Gratin de courgettes' },
    { id: 9, title: 'Chili sin carne' },
  ];

  it('retrouve une recette écrite autrement', () => {
    assert.equal(choisirRecette('gratin de courgette', repertoire)?.id, 4);
  });

  it('ne retrouve rien quand rien ne correspond', () => {
    assert.equal(choisirRecette('Restes', repertoire), null);
    assert.equal(choisirRecette('', repertoire), null);
  });

  it('préfère, parmi des doublons, celle qu’on a écrite exactement ainsi', () => {
    const doublons = [
      { id: 2, title: 'Gratin de courgette' },
      { id: 7, title: 'Gratin de courgettes' },
    ];
    assert.equal(choisirRecette('Gratin de courgettes', doublons)?.id, 7);
    assert.equal(choisirRecette('gratin de courgette', doublons)?.id, 2);
  });

  it('prend sinon la plus ancienne', () => {
    const doublons = [
      { id: 7, title: 'Gratin de courgettes' },
      { id: 2, title: 'Gratin de courgette' },
    ];
    assert.equal(choisirRecette('GRATIN DE COURGETTES !', doublons)?.id, 2);
  });
});

describe('sortDuPlat', () => {
  const existante = { id: 4, title: 'Gratin' };

  it('crée une recette inconnue qui arrive avec son contenu', () => {
    assert.equal(sortDuPlat({ existante: null, aPreparation: false, plat: plat({ ingredients: [INGREDIENT] }) }), 'creer');
    assert.equal(sortDuPlat({ existante: null, aPreparation: false, plat: plat({ steps: [ETAPE] }) }), 'creer');
  });

  it('laisse en texte libre un titre seul que rien ne désigne', () => {
    assert.equal(sortDuPlat({ existante: null, aPreparation: false, plat: plat() }), 'libre');
  });

  it('ne fait pas une recette d’étiquettes seules', () => {
    // « Restes » étiqueté reste des restes.
    assert.equal(
      sortDuPlat({ existante: null, aPreparation: false, plat: plat({ tags: ['rapide'], servings: 3 }) }),
      'libre',
    );
  });

  it('réutilise une recette connue désignée par son seul titre', () => {
    assert.equal(sortDuPlat({ existante, aPreparation: true, plat: plat() }), 'reutiliser');
    assert.equal(sortDuPlat({ existante, aPreparation: false, plat: plat() }), 'reutiliser');
  });

  it('complète une ébauche', () => {
    assert.equal(
      sortDuPlat({ existante, aPreparation: false, plat: plat({ ingredients: [INGREDIENT], steps: [ETAPE] }) }),
      'completer',
    );
  });

  it('ne touche pas une recette qui a sa préparation', () => {
    // La recette du foyer fait foi, même face à une version plus fournie.
    assert.equal(
      sortDuPlat({ existante, aPreparation: true, plat: plat({ ingredients: [INGREDIENT], steps: [ETAPE] }) }),
      'conserver',
    );
  });
});

describe('champsACompleter', () => {
  const ebauche = {
    id: 4,
    title: 'Gratin',
    servings: null,
    notes: null,
    tags: ['les enfants aiment'],
  };

  it('remplace les ingrédients et les étapes fournis', () => {
    const champs = champsACompleter(ebauche, plat({ ingredients: [INGREDIENT], steps: [ETAPE] }));

    assert.deepEqual(champs.ingredients, [INGREDIENT]);
    assert.deepEqual(champs.steps, [ETAPE]);
  });

  it('ne vide pas une liste que la proposition ne fournit pas', () => {
    const champs = champsACompleter(ebauche, plat({ steps: [ETAPE] }));

    assert.equal('ingredients' in champs, false);
    assert.equal('tags' in champs, false);
  });

  it('pose les parts et la remarque seulement si elles manquaient', () => {
    assert.deepEqual(
      champsACompleter(ebauche, plat({ steps: [ETAPE], servings: 3, notes: 'Se congèle' })),
      { steps: [ETAPE], servings: 3, notes: 'Se congèle' },
    );

    const remplie = { ...ebauche, servings: 4, notes: 'Recette de ma mère' };
    assert.deepEqual(
      champsACompleter(remplie, plat({ steps: [ETAPE], servings: 3, notes: 'Se congèle' })),
      { steps: [ETAPE] },
    );
  });

  it('ajoute les étiquettes à celles du foyer', () => {
    const champs = champsACompleter(ebauche, plat({ steps: [ETAPE], tags: ['végétarien'] }));

    assert.deepEqual(champs.tags, ['les enfants aiment', 'végétarien']);
  });
});
