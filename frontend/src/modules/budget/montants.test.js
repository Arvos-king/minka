import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  analyserMontant,
  formaterMontant,
  formaterMontantCourt,
  partConsommee,
} from './montants.js';

/* Intl place une espace insécable étroite avant le symbole : on compare sur
   les chiffres pour ne pas rendre les tests dépendants de ce détail. */
const chiffres = (texte) => texte.replace(/[\s\u00a0\u202f]/g, '');

describe('formaterMontant', () => {
  it('affiche toujours les centimes', () => {
    assert.equal(chiffres(formaterMontant(1250)), '12,50€');
    assert.equal(chiffres(formaterMontant(4000)), '40,00€');
    assert.equal(chiffres(formaterMontant(5)), '0,05€');
  });

  it('traite l’absence de montant comme zéro', () => {
    assert.equal(chiffres(formaterMontant(0)), '0,00€');
    assert.equal(chiffres(formaterMontant(null)), '0,00€');
  });
});

describe('formaterMontantCourt', () => {
  it('tait les centimes quand ils sont nuls', () => {
    // « 400,00 € » encombre un total pour rien.
    assert.equal(chiffres(formaterMontantCourt(40000)), '400€');
  });

  it('les garde dès qu’il y en a', () => {
    assert.equal(chiffres(formaterMontantCourt(40050)), '400,50€');
  });
});

describe('analyserMontant', () => {
  it('lit la virgule comme le point', () => {
    assert.equal(analyserMontant('12,50'), 1250);
    assert.equal(analyserMontant('12.50'), 1250);
  });

  it('complète une décimale seule', () => {
    // « 12,5 » veut dire douze euros cinquante, pas douze euros cinq centimes.
    assert.equal(analyserMontant('12,5'), 1250);
  });

  it('accepte un montant entier', () => {
    assert.equal(analyserMontant('12'), 1200);
    assert.equal(analyserMontant('0'), 0);
  });

  it('accepte le symbole et les espaces, insécables compris', () => {
    assert.equal(analyserMontant(' 12,50 € '), 1250);
    assert.equal(analyserMontant('12,50\u00a0€'), 1250);
    assert.equal(analyserMontant('1\u202f234,56'), 123456);
  });

  it('accepte une saisie commençant par le séparateur', () => {
    assert.equal(analyserMontant(',50'), 50);
  });

  it('refuse ce qui n’est pas un montant', () => {
    assert.equal(analyserMontant(''), null);
    assert.equal(analyserMontant('   '), null);
    assert.equal(analyserMontant('douze'), null);
    assert.equal(analyserMontant('12,'), null);
    assert.equal(analyserMontant('12,345'), null, 'trois décimales ne sont pas des centimes');
    assert.equal(analyserMontant('-5'), null);
    assert.equal(analyserMontant('1,2,3'), null);
    assert.equal(analyserMontant(undefined), null);
  });

  it('ne perd pas un centime sur les valeurs que le flottant arrondit mal', () => {
    // `Math.round(parseFloat('12.345') * 100)` vaut 1234 : l'analyse porte donc
    // sur les chiffres eux-mêmes. Ces trois-là sont les pièges classiques.
    assert.equal(analyserMontant('0,29'), 29);
    assert.equal(analyserMontant('1,15'), 115);
    assert.equal(analyserMontant('8,45'), 845);
  });

  it('fait l’aller-retour sans dérive', () => {
    for (const centimes of [1, 29, 115, 845, 1250, 99999, 123456]) {
      assert.equal(analyserMontant(formaterMontant(centimes)), centimes, `${centimes}`);
    }
  });
});

describe('partConsommee', () => {
  it('donne la fraction du plafond', () => {
    assert.equal(partConsommee(20000, 40000), 0.5);
  });

  it('ne dépasse jamais un, même au-delà du plafond', () => {
    // La barre ne peut pas sortir de son cadre : le dépassement se dit par la
    // couleur et par le chiffre.
    assert.equal(partConsommee(80000, 40000), 1);
  });

  it('ne renvoie rien sans plafond', () => {
    assert.equal(partConsommee(20000, null), null);
    assert.equal(partConsommee(20000, 0), null);
  });
});
