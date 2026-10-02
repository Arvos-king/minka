import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { vitesseDeDefilement } from './defilement.js';

/* Un écran de téléphone : 812 px de haut, d'où des bandes d'environ 146 px. */
const HAUTEUR = 812;

describe('vitesseDeDefilement', () => {
  it('ne fait rien au milieu de l’écran', () => {
    assert.equal(vitesseDeDefilement(400, HAUTEUR), 0);
    assert.equal(vitesseDeDefilement(200, HAUTEUR), 0);
    assert.equal(vitesseDeDefilement(600, HAUTEUR), 0);
  });

  it('remonte dans la bande du haut, descend dans celle du bas', () => {
    assert.ok(vitesseDeDefilement(100, HAUTEUR) < 0);
    assert.ok(vitesseDeDefilement(712, HAUTEUR) > 0);
  });

  it('accélère à mesure qu’on s’enfonce vers le bord', () => {
    const effleure = vitesseDeDefilement(700, HAUTEUR);
    const enfonce = vitesseDeDefilement(790, HAUTEUR);

    assert.ok(effleure > 0);
    assert.ok(enfonce > effleure);
  });

  it('plafonne au bord, et au-delà', () => {
    // Le doigt peut sortir de l'écran par la barre de gestes.
    assert.equal(vitesseDeDefilement(0, HAUTEUR), -14);
    assert.equal(vitesseDeDefilement(-30, HAUTEUR), -14);
    assert.equal(vitesseDeDefilement(HAUTEUR, HAUTEUR), 14);
    assert.equal(vitesseDeDefilement(HAUTEUR + 30, HAUTEUR), 14);
  });

  it('garde des bandes utilisables sur un écran bas', () => {
    // À l'horizontale, un cinquième de 360 px ne laisserait que 65 px :
    // le plancher de 80 px les élargit.
    assert.ok(vitesseDeDefilement(75, 360) < 0);
    assert.equal(vitesseDeDefilement(180, 360), 0);
  });
});
