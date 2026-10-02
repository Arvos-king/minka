import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aujourdhuiLocal,
  decaler,
  frigoLisible,
  joursCouverts,
  lundiDe,
  nomDuJour,
  periodeParDefaut,
  planningLisible,
  recetteLisible,
  repertoireLisible,
} from './traduction.js';

describe('les dates', () => {
  it('nomme le jour', () => {
    assert.equal(nomDuJour('2026-10-05'), 'lundi');
    assert.equal(nomDuJour('2026-10-11'), 'dimanche');
  });

  it('retrouve le lundi de la semaine', () => {
    assert.equal(lundiDe('2026-10-05'), '2026-10-05');
    assert.equal(lundiDe('2026-10-03'), '2026-09-28');
    // Le dimanche ferme la semaine, il n'ouvre pas la suivante.
    assert.equal(lundiDe('2026-10-11'), '2026-10-05');
  });

  it('traverse les fins de mois et le changement d’heure', () => {
    assert.equal(decaler('2026-10-24', 2), '2026-10-26');
    assert.equal(decaler('2026-03-01', -1), '2026-02-28');
  });

  it('compte les jours, bornes comprises', () => {
    assert.equal(joursCouverts('2026-10-05', '2026-10-11'), 7);
    assert.equal(joursCouverts('2026-10-05', '2026-10-05'), 1);
  });

  it('prend la date dans le fuseau du conteneur', () => {
    const maintenant = new Date();
    const attendu = [
      maintenant.getFullYear(),
      String(maintenant.getMonth() + 1).padStart(2, '0'),
      String(maintenant.getDate()).padStart(2, '0'),
    ].join('-');

    assert.equal(aujourdhuiLocal(maintenant), attendu);
  });
});

describe('periodeParDefaut', () => {
  it('couvre quatre semaines passées, la semaine en cours et la suivante', () => {
    // Un samedi, jour où l'on prépare d'ordinaire la semaine d'après.
    assert.deepEqual(periodeParDefaut('2026-10-03'), { du: '2026-08-31', au: '2026-10-11' });
    assert.equal(joursCouverts('2026-08-31', '2026-10-11'), 42);
  });
});

describe('planningLisible', () => {
  it('rend chaque jour, cases vides comprises', () => {
    const lu = planningLisible({
      du: '2026-10-05',
      au: '2026-10-06',
      aujourdhui: '2026-10-03',
      entrees: [
        { id: 1, onDate: '2026-10-05', slot: 'soir', recipeId: 4, title: 'Gratin de courgettes' },
        { id: 2, onDate: '2026-10-06', slot: 'midi', recipeId: null, title: 'Restes' },
      ],
    });

    assert.deepEqual(lu, {
      aujourdhui: '2026-10-03',
      du: '2026-10-05',
      au: '2026-10-06',
      jours: [
        { date: '2026-10-05', jour: 'lundi', midi: null, soir: { plat: 'Gratin de courgettes', recetteId: 4 } },
        { date: '2026-10-06', jour: 'mardi', midi: { plat: 'Restes', recetteId: null }, soir: null },
      ],
    });
  });
});

describe('repertoireLisible', () => {
  it('dit si une recette a sa préparation', () => {
    const lu = repertoireLisible([
      { id: 1, title: 'Chili', servings: 4, tags: ['végétarien'], ingredients: ['Haricots'], stepCount: 5, notes: 'x', createdBy: 1 },
      { id: 2, title: 'Gratin', servings: null, tags: [], ingredients: [], stepCount: 0 },
    ]);

    assert.deepEqual(lu, [
      { id: 1, titre: 'Chili', parts: 4, etiquettes: ['végétarien'], ingredients: ['Haricots'], aPreparation: true },
      { id: 2, titre: 'Gratin', parts: null, etiquettes: [], ingredients: [], aPreparation: false },
    ]);
  });
});

describe('recetteLisible', () => {
  it('rend une recette entière, sans ses identifiants internes', () => {
    const lu = recetteLisible({
      id: 4,
      title: 'Gratin',
      servings: 3,
      notes: 'Se congèle',
      tags: ['four'],
      createdAt: '2026-10-01',
      ingredients: [{ id: 9, name: 'Courgettes', quantity: '600 g' }],
      steps: [{ id: 12, text: 'Préchauffer le four' }],
    });

    assert.deepEqual(lu, {
      id: 4,
      titre: 'Gratin',
      parts: 3,
      etiquettes: ['four'],
      remarques: 'Se congèle',
      ingredients: [{ nom: 'Courgettes', quantite: '600 g' }],
      etapes: ['Préchauffer le four'],
    });
  });
});

describe('frigoLisible', () => {
  it('rend le nom, la quantité et la date limite', () => {
    assert.deepEqual(
      frigoLisible([{ id: 1, name: 'Crème', quantity: 1, expiresOn: '2026-10-04', createdBy: 1 }]),
      [{ nom: 'Crème', quantite: 1, avant: '2026-10-04' }],
    );
  });
});
