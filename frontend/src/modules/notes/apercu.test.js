import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { estVide, extrait, libelleModification, titreAffiche } from './apercu.js';

const note = (champs) => ({ title: null, body: '', ...champs });

describe('titreAffiche', () => {
  it('reprend le titre saisi', () => {
    assert.equal(titreAffiche(note({ title: 'Codes', body: 'Wifi : 1234' })), 'Codes');
  });

  it('déduit le titre de la première ligne, à défaut', () => {
    // Personne ne pense à titrer trois lignes notées à la volée.
    assert.equal(titreAffiche(note({ body: 'Wifi : 1234\nPortail : 5678' })), 'Wifi : 1234');
  });

  it('saute les lignes vides du début', () => {
    assert.equal(titreAffiche(note({ body: '\n\n  \nVrai début' })), 'Vrai début');
  });

  it('ne renvoie rien pour une note vide', () => {
    assert.equal(titreAffiche(note()), '');
    assert.equal(titreAffiche(note({ title: '   ', body: '  \n ' })), '');
  });

  it('tronque un titre trop long', () => {
    const resultat = titreAffiche(note({ body: 'A'.repeat(200) }));

    assert.equal(resultat.length, 60);
    assert.ok(resultat.endsWith('…'));
  });
});

describe('extrait', () => {
  it('donne le corps quand le titre est saisi', () => {
    assert.equal(extrait(note({ title: 'Codes', body: 'Wifi : 1234' })), 'Wifi : 1234');
  });

  it('saute la ligne devenue titre', () => {
    // Sinon l'aperçu répéterait le titre juste en dessous de lui.
    assert.equal(
      extrait(note({ body: 'Wifi : 1234\nPortail : 5678' })),
      'Portail : 5678',
    );
  });

  it('met le contenu sur une seule ligne', () => {
    assert.equal(
      extrait(note({ title: 'X', body: 'un\n\ndeux\n   trois' })),
      'un deux trois',
    );
  });

  it('ne renvoie rien quand il n’y a que le titre', () => {
    assert.equal(extrait(note({ body: 'Une seule ligne' })), '');
    assert.equal(extrait(note({ title: 'Titre seul' })), '');
  });

  it('tronque un aperçu trop long', () => {
    const resultat = extrait(note({ title: 'X', body: 'mot '.repeat(100) }));

    assert.ok(resultat.length <= 120);
    assert.ok(resultat.endsWith('…'));
  });
});

describe('estVide', () => {
  it('reconnaît une note qui ne dit rien', () => {
    assert.equal(estVide(note()), true);
    assert.equal(estVide(note({ title: '  ', body: '\n\n' })), true);
  });

  it('ne s’y trompe pas dès qu’il y a du contenu', () => {
    assert.equal(estVide(note({ title: 'Codes' })), false);
    assert.equal(estVide(note({ body: 'x' })), false);
  });
});

describe('libelleModification', () => {
  const MINUTE = 60_000;
  const HEURE = 60 * MINUTE;
  const MAINTENANT = Date.parse('2026-08-18T14:00:00Z');
  const ilYA = (ecart) => libelleModification(new Date(MAINTENANT - ecart).toISOString(), MAINTENANT);

  it('ne dit rien sans date', () => {
    assert.equal(libelleModification(null, MAINTENANT), null);
    assert.equal(libelleModification('pas une date', MAINTENANT), null);
  });

  it('reste vague sur les deux premières minutes', () => {
    assert.equal(ilYA(0), "à l'instant");
    assert.equal(ilYA(90_000), "à l'instant");
  });

  it('compte en minutes puis en heures', () => {
    assert.equal(ilYA(5 * MINUTE), 'il y a 5 min');
    assert.equal(ilYA(3 * HEURE), 'il y a 3 h');
    assert.equal(ilYA(23 * HEURE), 'il y a 23 h');
  });

  it('dit « hier » sur la deuxième journée', () => {
    assert.equal(ilYA(25 * HEURE), 'hier');
    assert.equal(ilYA(47 * HEURE), 'hier');
  });

  it('donne la date au-delà', () => {
    // « il y a 23 j » demande un calcul mental que la date épargne.
    assert.match(ilYA(72 * HEURE), /^le \d+ \p{L}+$/u);
  });

  it('ajoute l’année quand elle diffère', () => {
    assert.match(libelleModification('2024-03-05T10:00:00Z', MAINTENANT), /2024/);
  });
});
