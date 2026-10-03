import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  analyserMontant,
  formaterMontant,
  formaterMontantCourt,
  montantEditable,
  partConsommee,
  separateurDecimal,
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

describe('en anglais', () => {
  // La monnaie des tests est l'euro, celle par défaut : seule l'écriture change.
  it('écrit le symbole devant et le point décimal', () => {
    assert.equal(chiffres(formaterMontant(1250, 'en')), '€12.50');
    assert.equal(chiffres(formaterMontant(123456, 'en')), '€1,234.56');
    assert.equal(chiffres(formaterMontantCourt(40000, 'en')), '€400');
  });

  it('lit le point décimal et la virgule des milliers', () => {
    assert.equal(analyserMontant('12.50', 'en'), 1250);
    assert.equal(analyserMontant('1,234.56', 'en'), 123456);
    assert.equal(analyserMontant('1,234', 'en'), 123400);
    assert.equal(analyserMontant('12,345', 'en'), 1234500);
  });

  it('lit encore la virgule décimale au bout d’un nombre', () => {
    // Le pavé numérique d'un téléphone réglé sur une région européenne la
    // propose à la place du point.
    assert.equal(analyserMontant('12,50', 'en'), 1250);
    assert.equal(analyserMontant('12,5', 'en'), 1250);
  });

  it('accepte le symbole ou le code de la monnaie', () => {
    assert.equal(analyserMontant('£12.50', 'en'), 1250);
    assert.equal(analyserMontant('US$12.50', 'en'), 1250);
    assert.equal(analyserMontant('12.50 CHF', 'en'), 1250);
  });

  it('refuse ce qui n’est pas un montant', () => {
    assert.equal(analyserMontant('twelve', 'en'), null);
    assert.equal(analyserMontant('12.345', 'en'), null);
    assert.equal(analyserMontant('1,23,4', 'en'), null);
    assert.equal(analyserMontant('12a50', 'en'), null);
  });

  it('fait l’aller-retour sans dérive', () => {
    for (const centimes of [1, 29, 115, 845, 1250, 99999, 123456]) {
      assert.equal(analyserMontant(formaterMontant(centimes, 'en'), 'en'), centimes, `${centimes}`);
    }
  });
});

describe('montantEditable', () => {
  it('rend le montant à retoucher, sans symbole ni milliers', () => {
    assert.equal(montantEditable(1250), '12,50');
    assert.equal(montantEditable(123456), '1234,56');
    assert.equal(montantEditable(1250, 'en'), '12.50');
    assert.equal(montantEditable(123456, 'en'), '1234.56');
  });

  it('se relit tel quel', () => {
    for (const langue of ['fr', 'en']) {
      assert.equal(analyserMontant(montantEditable(123456, langue), langue), 123456, langue);
    }
  });

  it('suit le séparateur décimal de la langue', () => {
    assert.equal(separateurDecimal('fr'), ',');
    assert.equal(separateurDecimal('en'), '.');
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
