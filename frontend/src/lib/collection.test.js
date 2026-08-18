import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  creerSuiviQuantites,
  fusionnerElement,
  identifiantProvisoire,
  positionDe,
  reinsererElement,
  reinsererElements,
  releverElements,
  remplacerElement,
  retirerElement,
} from './collection.js';

const liste = () => [
  { id: 1, name: 'Pain' },
  { id: 2, name: 'Lait' },
  { id: 3, name: 'Œufs' },
];

describe('positionDe', () => {
  it('trouve la position d’un élément', () => {
    assert.equal(positionDe(liste(), 2), 1);
  });

  it('renvoie -1 pour un élément absent', () => {
    assert.equal(positionDe(liste(), 99), -1);
  });
});

describe('remplacerElement', () => {
  it('remplace l’élément visé et lui seul', () => {
    const resultat = remplacerElement(liste(), 2, { id: 2, name: 'Lait entier' });

    assert.deepEqual(
      resultat.map((e) => e.name),
      ['Pain', 'Lait entier', 'Œufs'],
    );
  });

  it('ne modifie pas le tableau d’origine', () => {
    // React ne redessine que si la référence change : muter sur place ne
    // produirait aucun réaffichage.
    const origine = liste();
    const resultat = remplacerElement(origine, 2, { id: 2, name: 'Autre' });

    assert.notEqual(resultat, origine);
    assert.equal(origine[1].name, 'Lait');
  });

  it('laisse la liste inchangée si l’identifiant est absent', () => {
    assert.deepEqual(remplacerElement(liste(), 99, { id: 99 }), liste());
  });
});

describe('fusionnerElement', () => {
  it('fusionne sans perdre les autres champs', () => {
    const resultat = fusionnerElement(liste(), 1, { completed: true });

    assert.deepEqual(resultat[0], { id: 1, name: 'Pain', completed: true });
  });

  it('ne modifie pas l’élément d’origine', () => {
    const origine = liste();
    fusionnerElement(origine, 1, { completed: true });

    assert.equal(origine[0].completed, undefined);
  });
});

describe('retirerElement', () => {
  it('retire l’élément visé', () => {
    assert.deepEqual(
      retirerElement(liste(), 2).map((e) => e.id),
      [1, 3],
    );
  });
});

describe('releverElements', () => {
  it('relève les éléments avec leur position', () => {
    const releves = releverElements(liste(), (e) => e.id !== 2);

    assert.deepEqual(releves, [
      { element: { id: 1, name: 'Pain' }, position: 0 },
      { element: { id: 3, name: 'Œufs' }, position: 2 },
    ]);
  });

  it('ne relève rien quand le prédicat ne trouve personne', () => {
    assert.deepEqual(releverElements(liste(), () => false), []);
  });
});

describe('reinsererElement', () => {
  it('remet l’élément à sa place', () => {
    const sansLait = retirerElement(liste(), 2);
    const resultat = reinsererElement(sansLait, { id: 2, name: 'Lait' }, 1);

    assert.deepEqual(
      resultat.map((e) => e.id),
      [1, 2, 3],
    );
  });

  it('remet en tête à la position 0', () => {
    assert.deepEqual(
      reinsererElement([{ id: 2 }], { id: 1 }, 0).map((e) => e.id),
      [1, 2],
    );
  });

  it('borne une position devenue trop grande', () => {
    // La liste a pu raccourcir entre-temps : mieux vaut la fin que planter.
    assert.deepEqual(
      reinsererElement([{ id: 1 }], { id: 9 }, 42).map((e) => e.id),
      [1, 9],
    );
  });
});

describe('reinsererElements', () => {
  it('remet chaque élément à sa position d’origine', () => {
    // Le cas de la purge annulée : la section « déjà pris » doit se
    // reconstituer telle quelle, pas s'empiler en fin de liste.
    const origine = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
    const releves = releverElements(origine, (e) => e.id === 2 || e.id === 4);
    const apresRetrait = origine.filter((e) => e.id !== 2 && e.id !== 4);

    assert.deepEqual(
      reinsererElements(apresRetrait, releves).map((e) => e.id),
      [1, 2, 3, 4, 5],
    );
  });

  it('reconstitue une liste entièrement vidée', () => {
    const origine = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const releves = releverElements(origine, () => true);

    assert.deepEqual(
      reinsererElements([], releves).map((e) => e.id),
      [1, 2, 3],
    );
  });

  it('reste correct quel que soit l’ordre des relevés', () => {
    const releves = [
      { element: { id: 4 }, position: 3 },
      { element: { id: 2 }, position: 1 },
    ];

    assert.deepEqual(
      reinsererElements([{ id: 1 }, { id: 3 }, { id: 5 }], releves).map((e) => e.id),
      [1, 2, 3, 4, 5],
    );
  });
});

describe('identifiantProvisoire', () => {
  it('produit un identifiant négatif', () => {
    // SQLite n'en attribue jamais de tels : la collision est impossible.
    assert.ok(identifiantProvisoire() < 0);
  });

  it('ne se répète pas, même enchaîné', () => {
    // Deux articles tapés à la suite peuvent tomber sur la même milliseconde.
    const identifiants = new Set(Array.from({ length: 100 }, identifiantProvisoire));

    assert.equal(identifiants.size, 100);
  });

  it('reste dans les entiers sûrs de JavaScript', () => {
    assert.ok(Number.isSafeInteger(identifiantProvisoire()));
  });
});

describe('creerSuiviQuantites', () => {
  it('avance et recule d’un pas', () => {
    const suivi = creerSuiviQuantites();

    assert.equal(suivi.prochaine(1, 2, 1), 3);
    assert.equal(suivi.prochaine(2, 5, -1), 4);
  });

  it('enchaîne les pas sans attendre le rendu', () => {
    // Trois taps sur « + » pour aller de 1 à 4 : repartir de la quantité
    // affichée renverrait trois fois 2.
    const suivi = creerSuiviQuantites();

    assert.equal(suivi.prochaine(1, 1, 1), 2);
    assert.equal(suivi.prochaine(1, 1, 1), 3);
    assert.equal(suivi.prochaine(1, 1, 1), 4);
  });

  it('s’arrête au plancher et au plafond', () => {
    const suivi = creerSuiviQuantites();

    assert.equal(suivi.prochaine(1, 1, -1), null, 'déjà au minimum');
    assert.equal(suivi.prochaine(2, 99, 1), null, 'déjà au maximum');
  });

  it('respecte des bornes personnalisées', () => {
    const suivi = creerSuiviQuantites({ min: 0, max: 5 });

    assert.equal(suivi.prochaine(1, 1, -1), 0);
    assert.equal(suivi.prochaine(2, 5, 1), null);
  });

  it('ne descend jamais sous le plancher par un grand pas', () => {
    const suivi = creerSuiviQuantites();

    assert.equal(suivi.prochaine(1, 3, -10), 1);
  });

  it('déclare périmée une réponse doublée depuis', () => {
    const suivi = creerSuiviQuantites();
    const premiere = suivi.prochaine(1, 1, 1); // 2
    suivi.prochaine(1, 1, 1); // 3 est parti depuis

    assert.equal(suivi.depassee(1, premiere), true, 'la réponse à « 2 » est périmée');
    assert.equal(suivi.depassee(1, 3), false, 'celle à « 3 » fait encore autorité');
  });

  it('oublie un élément réglé', () => {
    const suivi = creerSuiviQuantites();
    suivi.prochaine(1, 1, 1);
    suivi.oublier(1);

    // Le suivi reparti de zéro, le pas suivant repart de la quantité affichée.
    assert.equal(suivi.prochaine(1, 7, 1), 8);
  });

  it('oublie tout quand la liste du serveur fait foi', () => {
    const suivi = creerSuiviQuantites();
    suivi.prochaine(1, 1, 1);
    suivi.prochaine(2, 1, 1);
    suivi.oublierTout();

    assert.equal(suivi.prochaine(1, 5, 1), 6);
    assert.equal(suivi.prochaine(2, 5, 1), 6);
  });

  it('suit chaque élément séparément', () => {
    const suivi = creerSuiviQuantites();

    assert.equal(suivi.prochaine(1, 1, 1), 2);
    assert.equal(suivi.prochaine(2, 10, 1), 11);
    assert.equal(suivi.prochaine(1, 1, 1), 3);
  });
});
