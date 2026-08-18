import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aujourdhui, decalerJours, joursEntre, versJourUtc } from './dates.js';

describe('aujourdhui', () => {
  it('donne le jour local, pas le jour UTC', () => {
    // Oracle indépendant : la locale suédoise formate en AAAA-MM-JJ, et
    // `toLocaleDateString` travaille dans le fuseau du système. Une
    // implémentation qui passerait par `toISOString()` sans retirer le décalage
    // se ferait prendre ici, le soir, depuis la France.
    assert.equal(aujourdhui(), new Date().toLocaleDateString('sv-SE'));
  });
});

describe('versJourUtc', () => {
  it('place la date à minuit UTC', () => {
    assert.equal(versJourUtc('2026-08-17'), Date.UTC(2026, 7, 17));
  });
});

describe('decalerJours', () => {
  it('avance et recule d’un jour', () => {
    assert.equal(decalerJours('2026-08-17', 1), '2026-08-18');
    assert.equal(decalerJours('2026-08-17', -1), '2026-08-16');
    assert.equal(decalerJours('2026-08-17', 0), '2026-08-17');
  });

  it('franchit les fins de mois et d’année', () => {
    assert.equal(decalerJours('2026-08-31', 1), '2026-09-01');
    assert.equal(decalerJours('2026-12-31', 1), '2027-01-01');
    assert.equal(decalerJours('2026-01-01', -1), '2025-12-31');
  });

  it('tient compte du 29 février', () => {
    assert.equal(decalerJours('2024-02-28', 1), '2024-02-29');
    assert.equal(decalerJours('2026-02-28', 1), '2026-03-01');
  });

  it('ne perd pas de jour au changement d’heure', () => {
    // La raison d'être du passage par UTC. En heure locale, ces deux journées
    // ne font pas 24 h et l'arithmétique décalerait d'un jour.
    assert.equal(decalerJours('2026-03-28', 1), '2026-03-29'); // passage à l'heure d'été
    assert.equal(decalerJours('2026-10-24', 1), '2026-10-25'); // retour à l'heure d'hiver
  });
});

describe('joursEntre', () => {
  it('compte positivement vers le futur', () => {
    assert.equal(joursEntre('2026-08-17', '2026-08-20'), 3);
  });

  it('compte négativement vers le passé', () => {
    assert.equal(joursEntre('2026-08-20', '2026-08-17'), -3);
  });

  it('donne zéro pour le même jour', () => {
    assert.equal(joursEntre('2026-08-17', '2026-08-17'), 0);
  });

  it('reste exact à travers un changement d’heure', () => {
    assert.equal(joursEntre('2026-03-28', '2026-03-30'), 2);
    assert.equal(joursEntre('2026-10-24', '2026-10-26'), 2);
  });

  it('reste exact sur une année entière', () => {
    assert.equal(joursEntre('2026-01-01', '2027-01-01'), 365);
    assert.equal(joursEntre('2024-01-01', '2025-01-01'), 366); // bissextile
  });
});
