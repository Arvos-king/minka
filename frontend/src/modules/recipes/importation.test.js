import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyserRecette, lireIngredient } from './importation.js';

const textes = (etapes) => etapes.map((e) => e.text);

describe('lireIngredient', () => {
  it('lit le format de Minka, sans ambiguïté', () => {
    assert.deepEqual(lireIngredient('Courgettes : 600 g'), {
      name: 'Courgettes',
      quantity: '600 g',
    });
    assert.deepEqual(lireIngredient('- Sel : '), { name: 'Sel', quantity: null });
  });

  it('lit la quantité écrite devant, comme dans tous les livres', () => {
    assert.deepEqual(lireIngredient('- 600 g de courgettes'), {
      name: 'Courgettes',
      quantity: '600 g',
    });
    assert.deepEqual(lireIngredient("- 2 gousses d'ail"), { name: 'Ail', quantity: '2 gousses' });
    assert.deepEqual(lireIngredient('- 20 cl de crème fraîche'), {
      name: 'Crème fraîche',
      quantity: '20 cl',
    });
  });

  it('accepte les quantités écrites en toutes lettres', () => {
    assert.deepEqual(lireIngredient('Une pincée de sel'), { name: 'Sel', quantity: 'Une pincée' });
    assert.deepEqual(lireIngredient('Quelques feuilles de basilic'), {
      name: 'Basilic',
      quantity: 'Quelques feuilles',
    });
  });

  it('accepte les décimales et les fractions', () => {
    assert.deepEqual(lireIngredient('1,5 kg de pommes de terre'), {
      name: 'Pommes de terre',
      quantity: '1,5 kg',
    });
    assert.deepEqual(lireIngredient('1/2 citron'), { name: 'Citron', quantity: '1/2' });
  });

  it('garde un nombre sans unité comme quantité', () => {
    assert.deepEqual(lireIngredient('3 œufs'), { name: 'Œufs', quantity: '3' });
  });

  it('laisse entier un ingrédient sans quantité', () => {
    assert.deepEqual(lireIngredient('- Muscade'), { name: 'Muscade', quantity: null });
    assert.deepEqual(lireIngredient('Huile d’olive'), { name: 'Huile d’olive', quantity: null });
  });

  it('ne rend rien d’une ligne vide', () => {
    assert.equal(lireIngredient('   '), null);
    assert.equal(lireIngredient('-'), null);
  });
});

describe('analyserRecette', () => {
  const COMPLETE = `# Gratin de courgettes
Pour 4 personnes
Étiquettes : végétarien, four

## Ingrédients
- 600 g de courgettes
- Crème fraîche : 20 cl
- 2 gousses d'ail
- Sel

## Préparation
1. Préchauffer le four à 180 °C
2. Émincer les courgettes
3. Enfourner 35 minutes`;

  it('lit une recette complète', () => {
    const { recette, avertissements } = analyserRecette(COMPLETE);

    assert.equal(recette.title, 'Gratin de courgettes');
    assert.equal(recette.servings, 4);
    assert.deepEqual(recette.tags, ['végétarien', 'four']);
    assert.deepEqual(recette.ingredients, [
      { name: 'Courgettes', quantity: '600 g' },
      { name: 'Crème fraîche', quantity: '20 cl' },
      { name: 'Ail', quantity: '2 gousses' },
      { name: 'Sel', quantity: null },
    ]);
    assert.deepEqual(textes(recette.steps), [
      'Préchauffer le four à 180 °C',
      'Émincer les courgettes',
      'Enfourner 35 minutes',
    ]);
    assert.deepEqual(avertissements, []);
  });

  it('se passe des en-têtes : la forme des lignes suffit', () => {
    // Le cas le plus fréquent — on colle ce qu'on a trouvé, on ne le remet pas
    // en forme d'abord.
    const { recette, avertissements } = analyserRecette(`Soupe de potiron
- 1 kg de potiron
- 1 oignon
1. Éplucher le potiron
2. Cuire 20 min`);

    assert.equal(recette.title, 'Soupe de potiron');
    assert.deepEqual(recette.ingredients, [
      { name: 'Potiron', quantity: '1 kg' },
      { name: 'Oignon', quantity: '1' },
    ]);
    assert.deepEqual(textes(recette.steps), ['Éplucher le potiron', 'Cuire 20 min']);
    assert.deepEqual(avertissements, []);
  });

  it('rattache à l’étape précédente une ligne qui perd sa numérotation', () => {
    const { recette } = analyserRecette(`Tarte
- Pâte
1. Étaler la pâte
Piquer le fond à la fourchette`);

    assert.deepEqual(textes(recette.steps), ['Étaler la pâte', 'Piquer le fond à la fourchette']);
  });

  it('ne prend pas une quantité pour un nombre de parts', () => {
    // « 2 gousses d'ail » au milieu des ingrédients n'annonce pas une recette
    // pour deux : le nombre de parts ne se lit qu'en tête.
    const { recette } = analyserRecette(`Aïoli
Ingrédients
- 2 gousses d'ail
- 4 personnes autour de la table`);

    assert.equal(recette.servings, null);
    assert.equal(recette.ingredients.length, 2);
  });

  it('reconnaît les autres façons d’annoncer les parts', () => {
    assert.equal(analyserRecette('Tarte\n6 parts\n- Pâte').recette.servings, 6);
    assert.equal(analyserRecette('Tarte\nPortions : 2\n- Pâte').recette.servings, 2);
    assert.equal(analyserRecette('Tarte\nPour 8\n- Pâte').recette.servings, 8);
  });

  it('ne prend pas une puce pour un titre', () => {
    const { recette, avertissements } = analyserRecette('- 600 g de courgettes');

    assert.equal(recette.title, '');
    assert.equal(recette.ingredients.length, 1);
    assert.ok(avertissements.some((m) => m.includes('titre')));
  });

  it('signale une prose qu’il n’a pas su placer', () => {
    const { avertissements } = analyserRecette(`Gratin
Un plat de saison que toute la famille aime.
- Courgettes`);

    assert.ok(avertissements.some((m) => m.includes('Ligne ignorée')));
  });

  it('signale l’absence d’ingrédients', () => {
    const { avertissements } = analyserRecette('Gratin de courgettes\n1. Enfourner');
    assert.ok(avertissements.some((m) => m.includes('ingrédient')));
  });

  it('ne se plaint de rien sur un texte vide', () => {
    const { recette, avertissements } = analyserRecette('');
    assert.deepEqual(avertissements, []);
    assert.equal(recette.title, '');
    assert.deepEqual(recette.ingredients, []);
  });

  it('accepte les en-têtes sans accents ni majuscules', () => {
    const { recette } = analyserRecette(`Riz
ingredients:
- Riz
etapes:
Faire bouillir`);

    assert.equal(recette.ingredients.length, 1);
    assert.deepEqual(textes(recette.steps), ['Faire bouillir']);
  });
});
