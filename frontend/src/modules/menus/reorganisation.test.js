import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  appliquerCases,
  casesDAnnulation,
  contenuDe,
  decrireDepot,
  planifierDeplacement,
  predireAnnulation,
  predireDeplacement,
  releverCases,
  resumerDeplacement,
} from './reorganisation.js';

/*
 * La première partie reprend mot pour mot les scénarios de
 * `backend/src/modules/menus/reorganisation.test.js` : la règle est recopiée
 * des deux côtés, et c'est ainsi qu'on s'assure qu'elles disent la même chose.
 *
 * 2026-08-17 est un lundi ; 2026-08-23, le dimanche qui le suit.
 */

const repas = (onDate, title, recipeId = null) => ({ onDate, title, recipeId });
const plat = (title, recipeId = null) => ({ recipeId, title });

const GRATIN = plat('Gratin de courgettes', 4);
const CHILI = plat('Chili sin carne', 7);
const LASAGNES = plat('Lasagnes', 9);
const RESTES = plat('Restes');

describe('planifierDeplacement (copie de la règle du serveur)', () => {
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

/* --- Propre à l'interface ------------------------------------------------- */

const SEMAINE = { from: '2026-08-17', to: '2026-08-23' };

/** Un repas affiché, tel que le rend `GET /plan`. */
let prochainId = 1;
const affiche = (onDate, slot, title, recipeId = null) => ({ id: prochainId++, onDate, slot, recipeId, title });

/** Ce qu'on lit dans la page : « 2026-08-19 soir : Chili ». */
const lecture = (entries) => entries.map(({ onDate, slot, title }) => `${onDate} ${slot} : ${title}`);

describe('predireDeplacement', () => {
  it('applique la règle aux repas chargés, en attente de confirmation', () => {
    const entries = [
      affiche('2026-08-18', 'soir', 'Gratin de courgettes', 4),
      affiche('2026-08-19', 'soir', 'Chili sin carne', 7),
      affiche('2026-08-19', 'midi', 'Restes'),
    ];

    const cases = predireDeplacement(
      entries,
      { date: '2026-08-18', slot: 'soir' },
      GRATIN,
      { date: '2026-08-19', slot: 'soir' },
    );

    assert.deepEqual(
      cases.map(({ onDate, slot, avant, apres }) => ({ onDate, slot, avant, titre: apres?.title ?? null })),
      [
        { onDate: '2026-08-18', slot: 'soir', avant: GRATIN, titre: null },
        { onDate: '2026-08-19', slot: 'soir', avant: CHILI, titre: 'Gratin de courgettes' },
        { onDate: '2026-08-20', slot: 'soir', avant: null, titre: 'Chili sin carne' },
      ],
    );

    // Identifiant provisoire et `pending` : la page estompe ces repas et ne
    // les laisse pas saisir avant la réponse.
    const pose = cases[1].apres;
    assert.ok(pose.id < 0);
    assert.equal(pose.pending, true);
    assert.equal(pose.recipeId, 4);
    assert.deepEqual([pose.onDate, pose.slot], ['2026-08-19', 'soir']);
  });

  it('arrête la poussée au dimanche, faute de connaître la suite', () => {
    const entries = [
      affiche('2026-08-22', 'soir', 'Chili sin carne', 7),
      affiche('2026-08-23', 'soir', 'Lasagnes', 9),
    ];

    const cases = predireDeplacement(
      entries,
      { date: '2026-08-21', slot: 'soir' },
      GRATIN,
      { date: '2026-08-22', slot: 'soir' },
    );

    // La case du lundi suivant passe pour libre ; `appliquerCases` l'écartera.
    assert.equal(cases.at(-1).onDate, '2026-08-24');
    assert.deepEqual(lecture(appliquerCases(entries, cases, SEMAINE)), [
      '2026-08-22 soir : Gratin de courgettes',
      '2026-08-23 soir : Chili sin carne',
    ]);
  });
});

describe('appliquerCases', () => {
  it('remplace ce que portent les cases touchées, et laisse le reste', () => {
    const entries = [
      affiche('2026-08-17', 'midi', 'Restes'),
      affiche('2026-08-18', 'soir', 'Gratin de courgettes', 4),
      affiche('2026-08-19', 'soir', 'Chili sin carne', 7),
    ];

    const resultat = appliquerCases(
      entries,
      [
        { onDate: '2026-08-18', slot: 'soir', apres: null },
        { onDate: '2026-08-19', slot: 'soir', apres: affiche('2026-08-19', 'soir', 'Gratin de courgettes', 4) },
        { onDate: '2026-08-20', slot: 'soir', apres: affiche('2026-08-20', 'soir', 'Chili sin carne', 7) },
      ],
      SEMAINE,
    );

    assert.deepEqual(lecture(resultat), [
      '2026-08-17 midi : Restes',
      '2026-08-19 soir : Gratin de courgettes',
      '2026-08-20 soir : Chili sin carne',
    ]);
  });

  it('ignore les cases hors de la semaine affichée', () => {
    // Le serveur a poussé un repas au lundi suivant : la page ne le montre
    // pas, et il ne doit compter ni dans « Semaine vide » ni dans les courses.
    const resultat = appliquerCases(
      [affiche('2026-08-23', 'soir', 'Lasagnes', 9)],
      [
        { onDate: '2026-08-23', slot: 'soir', apres: affiche('2026-08-23', 'soir', 'Chili sin carne', 7) },
        { onDate: '2026-08-24', slot: 'soir', apres: affiche('2026-08-24', 'soir', 'Lasagnes', 9) },
      ],
      SEMAINE,
    );

    assert.deepEqual(lecture(resultat), ['2026-08-23 soir : Chili sin carne']);
  });

  it('trie jour puis créneau, comme le serveur', () => {
    const resultat = appliquerCases(
      [affiche('2026-08-20', 'soir', 'Chili sin carne', 7), affiche('2026-08-18', 'soir', 'Gratin', 4)],
      [{ onDate: '2026-08-18', slot: 'midi', apres: affiche('2026-08-18', 'midi', 'Restes') }],
      SEMAINE,
    );

    assert.deepEqual(lecture(resultat), [
      '2026-08-18 midi : Restes',
      '2026-08-18 soir : Gratin',
      '2026-08-20 soir : Chili sin carne',
    ]);
  });
});

describe('releverCases', () => {
  it('note ce que portent les cases, pour revenir en arrière', () => {
    const gratin = affiche('2026-08-18', 'soir', 'Gratin', 4);

    assert.deepEqual(
      releverCases(
        [gratin],
        [
          { onDate: '2026-08-18', slot: 'soir' },
          { onDate: '2026-08-19', slot: 'soir' },
        ],
      ),
      [
        { onDate: '2026-08-18', slot: 'soir', apres: gratin },
        { onDate: '2026-08-19', slot: 'soir', apres: null },
      ],
    );
  });

  it('défait une prédiction une fois réappliqué', () => {
    const entries = [
      affiche('2026-08-18', 'soir', 'Gratin de courgettes', 4),
      affiche('2026-08-19', 'soir', 'Chili sin carne', 7),
    ];
    const prevues = predireDeplacement(
      entries,
      { date: '2026-08-18', slot: 'soir' },
      GRATIN,
      { date: '2026-08-19', slot: 'soir' },
    );
    const releves = releverCases(entries, prevues);

    const apres = appliquerCases(entries, prevues, SEMAINE);
    assert.deepEqual(appliquerCases(apres, releves, SEMAINE), entries);
  });
});

describe('casesDAnnulation', () => {
  it('rétablit l’état d’avant, en attendant celui d’après', () => {
    const reponse = [
      { onDate: '2026-08-18', slot: 'soir', avant: GRATIN, apres: null },
      { onDate: '2026-08-19', slot: 'soir', avant: null, apres: affiche('2026-08-19', 'soir', 'Gratin de courgettes', 4) },
    ];

    assert.deepEqual(casesDAnnulation(reponse), [
      { onDate: '2026-08-18', slot: 'soir', repas: GRATIN, attendu: null },
      { onDate: '2026-08-19', slot: 'soir', repas: null, attendu: GRATIN },
    ]);
  });
});

describe('predireAnnulation', () => {
  it('remet chaque case à son état d’avant, en attente', () => {
    const cases = predireAnnulation([
      { onDate: '2026-08-18', slot: 'soir', avant: GRATIN, apres: null },
      { onDate: '2026-08-19', slot: 'soir', avant: null, apres: affiche('2026-08-19', 'soir', 'Gratin', 4) },
    ]);

    assert.equal(cases[0].apres.title, 'Gratin de courgettes');
    assert.equal(cases[0].apres.pending, true);
    assert.equal(cases[1].apres, null);
  });
});

describe('resumerDeplacement', () => {
  const titre = (contenu) => contenu.title;
  const vers = { date: '2026-08-20', slot: 'soir' };

  it('dit où va le repas', () => {
    const cases = [
      { onDate: '2026-08-18', slot: 'soir', avant: GRATIN, apres: null },
      { onDate: '2026-08-20', slot: 'soir', avant: null, apres: { ...GRATIN, onDate: '2026-08-20', slot: 'soir' } },
    ];

    assert.equal(resumerDeplacement(cases, vers, titre), '« Gratin de courgettes » passe au jeudi 20 soir.');
  });

  it('nomme le repas poussé quand il est seul', () => {
    const cases = [
      { onDate: '2026-08-18', slot: 'soir', avant: GRATIN, apres: null },
      { onDate: '2026-08-20', slot: 'soir', avant: CHILI, apres: GRATIN },
      { onDate: '2026-08-21', slot: 'soir', avant: null, apres: CHILI },
    ];

    assert.equal(
      resumerDeplacement(cases, vers, titre),
      '« Gratin de courgettes » passe au jeudi 20 soir, et pousse « Chili sin carne » d\'un jour.',
    );
  });

  it('compte les repas poussés, case quittée comprise quand la chaîne tourne', () => {
    // Le jeudi remonte au mardi ; mardi et mercredi glissent d'un jour.
    const cases = [
      { onDate: '2026-08-18', slot: 'soir', avant: GRATIN, apres: LASAGNES },
      { onDate: '2026-08-19', slot: 'soir', avant: CHILI, apres: GRATIN },
      { onDate: '2026-08-20', slot: 'soir', avant: LASAGNES, apres: CHILI },
    ];

    assert.equal(
      resumerDeplacement(cases, { date: '2026-08-18', slot: 'soir' }, titre),
      '« Lasagnes » passe au mardi 18 soir, et pousse 2 repas d\'un jour.',
    );
  });

  it('affiche l’intitulé que la page choisit', () => {
    const cases = [
      { onDate: '2026-08-18', slot: 'midi', avant: GRATIN, apres: null },
      { onDate: '2026-08-20', slot: 'soir', avant: null, apres: GRATIN },
    ];

    assert.equal(
      resumerDeplacement(cases, vers, () => 'Gratin d’automne'),
      '« Gratin d’automne » passe au jeudi 20 soir.',
    );
  });
});

describe('decrireDepot', () => {
  it('nomme la case visée', () => {
    assert.equal(decrireDepot({ date: '2026-08-20', slot: 'soir' }, null), 'jeudi 20 soir');
  });

  it('prévient du repas qu’on y délogerait', () => {
    assert.equal(
      decrireDepot({ date: '2026-08-20', slot: 'midi' }, 'Chili sin carne'),
      'jeudi 20 midi · pousse « Chili sin carne »',
    );
  });
});
