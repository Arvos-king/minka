import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LANGUES } from '../../lib/langue.js';
import { INSTRUCTIONS_PAR_LANGUE } from './instructions.js';
import { TEXTES } from './textes.js';

const nomsDesOutils = (langue) => Object.values(TEXTES[langue].outils).map((outil) => outil.nom);

describe('les noms des outils', () => {
  it('restent en français ceux qu’un projet Claude connaît déjà', () => {
    // Les renommer couperait le connecteur des conversations et des
    // instructions de projet qui les citent.
    assert.deepEqual(nomsDesOutils('fr'), [
      'lire_planning',
      'lister_recettes',
      'lire_recette',
      'lire_frigo',
      'poser_repas',
      'enregistrer_recette',
      'modifier_recette',
    ]);
  });

  it('sont anglais sur une instance anglaise', () => {
    assert.deepEqual(nomsDesOutils('en'), [
      'read_meal_plan',
      'list_recipes',
      'read_recipe',
      'read_fridge',
      'plan_meals',
      'save_recipe',
      'edit_recipe',
    ]);
  });
});

describe('les instructions', () => {
  for (const langue of LANGUES) {
    it(`citent les outils de leur langue, et seulement eux (${langue})`, () => {
      const instructions = INSTRUCTIONS_PAR_LANGUE[langue];

      for (const nom of nomsDesOutils(langue)) {
        assert.ok(instructions.includes(nom), `${nom} n’est pas cité`);
      }
      for (const autre of LANGUES.filter((l) => l !== langue)) {
        for (const nom of nomsDesOutils(autre)) {
          assert.ok(!instructions.includes(nom), `${nom} (${autre}) est cité en ${langue}`);
        }
      }
    });
  }

  it('renvoient aux outils de leur langue dans les descriptions aussi', () => {
    // poser_repas renvoie à lire_recette, enregistrer_recette à poser_repas.
    for (const langue of LANGUES) {
      const descriptions = Object.values(TEXTES[langue].outils)
        .map((outil) => outil.description)
        .join(' ');
      for (const autre of LANGUES.filter((l) => l !== langue)) {
        for (const nom of nomsDesOutils(autre)) {
          assert.ok(!descriptions.includes(nom), `${nom} (${autre}) est cité en ${langue}`);
        }
      }
    }
  });
});
