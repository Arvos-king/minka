import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aujourdhuiLocal,
  bilanDePose,
  casesEnConflit,
  casesEnDouble,
  casesPourPlanning,
  decaler,
  frigoLisible,
  joursCouverts,
  libelleCase,
  lundiDe,
  modificationPourMinka,
  nomDuJour,
  periodeDesRepas,
  periodeParDefaut,
  planningLisible,
  recetteLisible,
  recettePourMinka,
  repertoireLisible,
  sansNumerotation,
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

// --- Écrire ---------------------------------------------------------------------

describe('libelleCase', () => {
  it('dit une case comme on la dit', () => {
    assert.equal(libelleCase('2026-10-05', 'soir'), 'lundi 5 octobre soir');
    assert.equal(libelleCase('2026-08-01', 'midi'), 'samedi 1 août midi');
  });
});

describe('sansNumerotation', () => {
  it('retire la numérotation collée à une étape', () => {
    assert.equal(sansNumerotation('1. Préchauffer le four'), 'Préchauffer le four');
    assert.equal(sansNumerotation('12) Servir'), 'Servir');
    assert.equal(sansNumerotation('- Émincer'), 'Émincer');
  });

  it('laisse un chiffre qui fait partie de l’étape', () => {
    assert.equal(sansNumerotation('2 œufs à battre'), '2 œufs à battre');
  });
});

describe('recettePourMinka', () => {
  it('traduit une recette complète', () => {
    assert.deepEqual(
      recettePourMinka('Gratin', {
        parts: 3,
        etiquettes: ['végétarien'],
        remarques: 'Se congèle',
        ingredients: [{ nom: 'Courgettes', quantite: '600 g' }, { nom: 'Cumin' }],
        etapes: ['1. Préchauffer le four', '  ', 'Enfourner 30 min'],
      }),
      {
        title: 'Gratin',
        servings: 3,
        notes: 'Se congèle',
        tags: ['végétarien'],
        ingredients: [
          { name: 'Courgettes', quantity: '600 g' },
          { name: 'Cumin', quantity: null },
        ],
        steps: [{ text: 'Préchauffer le four' }, { text: 'Enfourner 30 min' }],
      },
    );
  });

  it('laisse vide ce qui n’est pas fourni', () => {
    assert.deepEqual(recettePourMinka('Restes'), {
      title: 'Restes',
      servings: null,
      notes: null,
      tags: [],
      ingredients: [],
      steps: [],
    });
  });
});

describe('modificationPourMinka', () => {
  it('ne transmet que les champs fournis', () => {
    assert.deepEqual(modificationPourMinka({ etapes: ['1. Cuire'] }), { steps: [{ text: 'Cuire' }] });
    assert.deepEqual(modificationPourMinka({ titre: 'Chili', parts: 4 }), { title: 'Chili', servings: 4 });
  });

  it('transmet une liste vide, qui vide', () => {
    assert.deepEqual(modificationPourMinka({ etiquettes: [] }), { tags: [] });
  });
});

describe('casesEnDouble', () => {
  it('repère une case demandée deux fois', () => {
    const repas = [
      { date: '2026-10-05', creneau: 'soir', plat: 'A' },
      { date: '2026-10-05', creneau: 'midi', plat: 'B' },
      { date: '2026-10-05', creneau: 'soir', plat: 'C' },
    ];
    assert.deepEqual(casesEnDouble(repas), ['lundi 5 octobre soir']);
    assert.deepEqual(casesEnDouble(repas.slice(0, 2)), []);
  });
});

describe('periodeDesRepas', () => {
  it('couvre tous les repas, dans le désordre', () => {
    assert.deepEqual(
      periodeDesRepas([{ date: '2026-10-08' }, { date: '2026-10-05' }, { date: '2026-10-11' }]),
      { du: '2026-10-05', au: '2026-10-11' },
    );
  });
});

describe('casesEnConflit', () => {
  const planning = [
    { onDate: '2026-10-10', slot: 'soir', recipeId: null, title: 'Chez mes parents' },
    { onDate: '2026-10-05', slot: 'soir', recipeId: 4, title: 'Gratin de courgettes' },
  ];

  it('signale une case occupée par autre chose', () => {
    assert.deepEqual(
      casesEnConflit([{ date: '2026-10-10', creneau: 'soir', plat: 'Pizza' }], planning),
      [{ case: 'samedi 10 octobre soir', occupeePar: 'Chez mes parents' }],
    );
  });

  it('laisse passer une case libre', () => {
    assert.deepEqual(casesEnConflit([{ date: '2026-10-10', creneau: 'midi', plat: 'Pizza' }], planning), []);
  });

  it('laisse passer une pose qu’on rejoue', () => {
    // Le même plat au même endroit : rien n'est écrasé.
    assert.deepEqual(
      casesEnConflit([{ date: '2026-10-05', creneau: 'soir', plat: 'gratin de courgettes' }], planning),
      [],
    );
  });

  it('reconnaît le plat sous l’orthographe du répertoire', () => {
    // La case porte le titre que le répertoire a rendu, pas celui qu'on avait
    // écrit : rejouer la même semaine ne doit rien refuser.
    assert.deepEqual(
      casesEnConflit([{ date: '2026-10-05', creneau: 'soir', plat: 'Gratin de courgette' }], planning),
      [],
    );
  });
});

describe('casesPourPlanning', () => {
  it('écrit chaque case sous condition de ce qu’on y a lu', () => {
    const cases = casesPourPlanning(
      [
        { date: '2026-10-05', creneau: 'soir', plat: 'Gratin de courgette' },
        { date: '2026-10-06', creneau: 'midi', plat: 'Restes' },
      ],
      [
        { title: 'Gratin de courgettes', recipeId: 4 },
        { title: 'Restes', recipeId: null },
      ],
      [{ onDate: '2026-10-05', slot: 'soir', recipeId: 9, title: 'Chili' }],
    );

    assert.deepEqual(cases, [
      {
        onDate: '2026-10-05',
        slot: 'soir',
        // Le titre du répertoire, pas celui qu'on a écrit.
        repas: { recipeId: 4, title: 'Gratin de courgettes' },
        attendu: { recipeId: 9, title: 'Chili' },
      },
      { onDate: '2026-10-06', slot: 'midi', repas: { recipeId: null, title: 'Restes' }, attendu: null },
    ]);
  });
});

describe('bilanDePose', () => {
  const repas = [
    { date: '2026-10-05', creneau: 'soir', plat: 'Chili' },
    { date: '2026-10-06', creneau: 'midi', plat: 'Restes' },
  ];
  const resolus = [
    { title: 'Chili sin carne', recipeId: 2 },
    { title: 'Restes', recipeId: null },
  ];

  it('dit ce qui a été posé et ce que sont devenues les recettes', () => {
    const bilan = bilanDePose({
      repas,
      resolus,
      recettes: { creees: [], completees: [], conservees: [], reutilisees: ['Chili sin carne'], inconnues: ['Restes'] },
    });

    assert.deepEqual(bilan, {
      poses: 2,
      cases: [
        { case: 'lundi 5 octobre soir', plat: 'Chili sin carne', recetteId: 2 },
        { case: 'mardi 6 octobre midi', plat: 'Restes', recetteId: null },
      ],
      recettes: { creees: [], completees: [], conservees: [], reutilisees: ['Chili sin carne'] },
      textesLibres: ['Restes'],
    });
  });

  it('avertit qu’une recette du foyer a été gardée', () => {
    const bilan = bilanDePose({
      repas,
      resolus,
      recettes: { creees: [], completees: [], conservees: ['Chili sin carne'], reutilisees: [], inconnues: [] },
    });

    assert.match(bilan.avertissements[0], /gardées telles quelles : Chili sin carne/);
  });

  it('avertit que tout est en texte libre sans module recettes', () => {
    const bilan = bilanDePose({ repas, resolus, recettes: null });

    assert.equal(bilan.recettes, undefined);
    assert.match(bilan.avertissements[0], /texte libre/);
  });
});
