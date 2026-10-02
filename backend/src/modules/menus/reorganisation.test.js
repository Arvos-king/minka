import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { contenuDe, memeContenu, planifierDeplacement } from './reorganisation.js';

/*
 * Mêmes scénarios que `frontend/src/modules/menus/reorganisation.test.js` : la
 * règle est recopiée des deux côtés, et c'est ici qu'on s'assure qu'elles
 * disent la même chose.
 *
 * 2026-08-17 est un lundi ; 2026-08-23, le dimanche qui le suit.
 */

const repas = (onDate, title, recipeId = null) => ({ onDate, title, recipeId });
const plat = (title, recipeId = null) => ({ recipeId, title });

const GRATIN = plat('Gratin de courgettes', 4);
const CHILI = plat('Chili sin carne', 7);
const LASAGNES = plat('Lasagnes', 9);
const RESTES = plat('Restes');

describe('planifierDeplacement', () => {
  it('vers une case libre, ne déplace que le repas', () => {
    assert.deepEqual(
      planifierDeplacement({
        de: { date: '2026-08-18', slot: 'soir' },
        contenu: GRATIN,
        vers: { date: '2026-08-20', slot: 'soir' },
        suite: [repas('2026-08-21', 'Lasagnes', 9)],
      }),
      [
        { onDate: '2026-08-18', slot: 'soir', avant: GRATIN, apres: null },
        { onDate: '2026-08-20', slot: 'soir', avant: null, apres: GRATIN },
      ],
    );
  });

  it('sur une case occupée, pousse la suite jusqu’à la première case libre', () => {
    assert.deepEqual(
      planifierDeplacement({
        de: { date: '2026-08-17', slot: 'soir' },
        contenu: GRATIN,
        vers: { date: '2026-08-19', slot: 'soir' },
        // Dans le désordre : seule la date de chaque repas compte.
        suite: [repas('2026-08-20', 'Lasagnes', 9), repas('2026-08-19', 'Chili sin carne', 7)],
      }),
      [
        { onDate: '2026-08-17', slot: 'soir', avant: GRATIN, apres: null },
        { onDate: '2026-08-19', slot: 'soir', avant: CHILI, apres: GRATIN },
        { onDate: '2026-08-20', slot: 'soir', avant: LASAGNES, apres: CHILI },
        { onDate: '2026-08-21', slot: 'soir', avant: null, apres: LASAGNES },
      ],
    );
  });

  it('décale d’un jour en visant le lendemain : la case quittée reste vide', () => {
    // Le geste du « ce soir, resto » : le gratin passe au lendemain, et le
    // chili qui y était au surlendemain.
    assert.deepEqual(
      planifierDeplacement({
        de: { date: '2026-08-18', slot: 'soir' },
        contenu: GRATIN,
        vers: { date: '2026-08-19', slot: 'soir' },
        suite: [repas('2026-08-19', 'Chili sin carne', 7)],
      }),
      [
        { onDate: '2026-08-18', slot: 'soir', avant: GRATIN, apres: null },
        { onDate: '2026-08-19', slot: 'soir', avant: CHILI, apres: GRATIN },
        { onDate: '2026-08-20', slot: 'soir', avant: null, apres: CHILI },
      ],
    );
  });

  it('pousse sur le créneau d’arrivée, sans toucher à l’autre', () => {
    // Un dîner posé sur un midi occupé déloge ce midi-là vers le midi suivant :
    // les soirs ne bougent pas, hormis la case quittée.
    assert.deepEqual(
      planifierDeplacement({
        de: { date: '2026-08-18', slot: 'soir' },
        contenu: GRATIN,
        vers: { date: '2026-08-19', slot: 'midi' },
        suite: [repas('2026-08-19', 'Restes')],
      }),
      [
        { onDate: '2026-08-18', slot: 'soir', avant: GRATIN, apres: null },
        { onDate: '2026-08-19', slot: 'midi', avant: RESTES, apres: GRATIN },
        { onDate: '2026-08-20', slot: 'midi', avant: null, apres: RESTES },
      ],
    );
  });

  it('fait tourner la chaîne quand un repas y remonte : la case quittée arrête la poussée', () => {
    // Le jeudi remonte au mardi : mardi et mercredi glissent d'un jour, et le
    // mercredi vient combler le jeudi laissé libre. Vendredi ne bouge pas.
    assert.deepEqual(
      planifierDeplacement({
        de: { date: '2026-08-20', slot: 'soir' },
        contenu: LASAGNES,
        vers: { date: '2026-08-18', slot: 'soir' },
        suite: [
          repas('2026-08-18', 'Gratin de courgettes', 4),
          repas('2026-08-19', 'Chili sin carne', 7),
          repas('2026-08-20', 'Lasagnes', 9),
          repas('2026-08-21', 'Restes'),
        ],
      }),
      [
        { onDate: '2026-08-18', slot: 'soir', avant: GRATIN, apres: LASAGNES },
        { onDate: '2026-08-19', slot: 'soir', avant: CHILI, apres: GRATIN },
        { onDate: '2026-08-20', slot: 'soir', avant: LASAGNES, apres: CHILI },
      ],
    );
  });

  it('déborde sur la semaine suivante plutôt que de perdre un repas', () => {
    assert.deepEqual(
      planifierDeplacement({
        de: { date: '2026-08-21', slot: 'soir' },
        contenu: GRATIN,
        vers: { date: '2026-08-22', slot: 'soir' },
        suite: [repas('2026-08-22', 'Chili sin carne', 7), repas('2026-08-23', 'Lasagnes', 9)],
      }),
      [
        { onDate: '2026-08-21', slot: 'soir', avant: GRATIN, apres: null },
        { onDate: '2026-08-22', slot: 'soir', avant: CHILI, apres: GRATIN },
        { onDate: '2026-08-23', slot: 'soir', avant: LASAGNES, apres: CHILI },
        // Le lundi qui suit.
        { onDate: '2026-08-24', slot: 'soir', avant: null, apres: LASAGNES },
      ],
    );
  });

  it('franchit une fin de mois', () => {
    const cases = planifierDeplacement({
      de: { date: '2026-08-30', slot: 'midi' },
      contenu: GRATIN,
      vers: { date: '2026-08-31', slot: 'midi' },
      suite: [repas('2026-08-31', 'Chili sin carne', 7)],
    });

    assert.deepEqual(cases.at(-1), { onDate: '2026-09-01', slot: 'midi', avant: null, apres: CHILI });
  });

  it('rend les cases du plus tôt au plus tard, le midi avant le soir', () => {
    const cases = planifierDeplacement({
      de: { date: '2026-08-19', slot: 'soir' },
      contenu: GRATIN,
      vers: { date: '2026-08-19', slot: 'midi' },
      suite: [repas('2026-08-19', 'Restes')],
    });

    assert.deepEqual(
      cases.map(({ onDate, slot }) => `${onDate} ${slot}`),
      ['2026-08-19 midi', '2026-08-19 soir', '2026-08-20 midi'],
    );
  });

  it('laisse un repas déposé sur sa propre case tel qu’il était', () => {
    const cases = planifierDeplacement({
      de: { date: '2026-08-18', slot: 'soir' },
      contenu: GRATIN,
      vers: { date: '2026-08-18', slot: 'soir' },
      suite: [repas('2026-08-18', 'Gratin de courgettes', 4), repas('2026-08-19', 'Chili sin carne', 7)],
    });

    assert.deepEqual(cases, [{ onDate: '2026-08-18', slot: 'soir', avant: GRATIN, apres: GRATIN }]);
  });
});

describe('contenuDe', () => {
  it('ne garde que ce que porte la case', () => {
    assert.deepEqual(contenuDe({ id: 3, onDate: '2026-08-18', slot: 'soir', recipeId: 4, title: 'Gratin' }), {
      recipeId: 4,
      title: 'Gratin',
    });
  });

  it('rend null pour une case vide', () => {
    assert.equal(contenuDe(null), null);
  });
});

describe('memeContenu', () => {
  it('compare la recette et l’intitulé', () => {
    assert.ok(memeContenu(plat('Gratin', 4), plat('Gratin', 4)));
    assert.ok(!memeContenu(plat('Gratin', 4), plat('Gratin', 5)));
    assert.ok(!memeContenu(plat('Gratin', 4), plat('Gratin d’automne', 4)));
  });

  it('distingue un texte libre d’une recette du même nom', () => {
    assert.ok(!memeContenu(plat('Gratin'), plat('Gratin', 4)));
  });

  it('n’égale une case vide qu’à une case vide', () => {
    assert.ok(memeContenu(null, null));
    assert.ok(!memeContenu(null, plat('Restes')));
    assert.ok(!memeContenu(plat('Restes'), null));
  });
});
