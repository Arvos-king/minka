import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aligner, normaliserEtiquette } from './etiquettes.js';

describe('normaliserEtiquette', () => {
  it('ignore la casse, les accents et les espaces superflus', () => {
    assert.equal(normaliserEtiquette('Végétarien'), 'vegetarien');
    assert.equal(normaliserEtiquette('  VEGETARIEN  '), 'vegetarien');
    assert.equal(normaliserEtiquette('les  enfants   aiment'), 'les enfants aiment');
  });
});

describe('aligner', () => {
  it('reprend l’orthographe déjà en usage', () => {
    // Sans cela, « Végétarien » et « vegetarien » feraient deux filtres pour
    // une seule idée, et le répertoire se couperait en morceaux.
    assert.deepEqual(aligner(['vegetarien'], ['Végétarien']), ['Végétarien']);
    assert.deepEqual(aligner(['VÉGÉTARIEN'], ['Végétarien']), ['Végétarien']);
  });

  it('garde telle quelle une étiquette encore inconnue', () => {
    assert.deepEqual(aligner(['Rapide'], ['Végétarien']), ['Rapide']);
  });

  it('nettoie une étiquette inconnue sans la dénaturer', () => {
    assert.deepEqual(aligner(['  Au   four  '], []), ['Au four']);
    assert.deepEqual(aligner(['végétarien'], []), ['végétarien']);
    assert.deepEqual(aligner(['Végétarien'], []), ['Végétarien']);
  });

  it('rend sa minuscule à une étiquette tout en majuscules', () => {
    // Touche majuscule restée enfoncée, ou clavier de téléphone : sans cela
    // elle hurlerait dans tous les filtres, la première orthographe faisant
    // foi pour toutes les suivantes.
    assert.deepEqual(aligner(['RAPIDE'], []), ['rapide']);
    assert.deepEqual(aligner(['AU FOUR'], []), ['au four']);
  });

  it('laisse tranquille ce qui n’a pas de casse', () => {
    assert.deepEqual(aligner(['30 min'], []), ['30 min']);
    assert.deepEqual(aligner(['A'], []), ['A']);
  });

  it('ne touche pas à une orthographe déjà en usage, fût-elle criée', () => {
    // La cohérence passe avant : ce qui existe reste, on ne renomme pas
    // silencieusement les recettes des autres.
    assert.deepEqual(aligner(['rapide'], ['RAPIDE']), ['RAPIDE']);
  });

  it('retire les doublons, y compris déguisés', () => {
    assert.deepEqual(aligner(['Rapide', 'rapide', 'RAPIDE'], []), ['Rapide']);
  });

  it('conserve l’ordre de saisie', () => {
    assert.deepEqual(aligner(['Four', 'Rapide'], ['Rapide']), ['Four', 'Rapide']);
  });

  it('écarte ce qui se réduit à rien', () => {
    assert.deepEqual(aligner(['   ', ''], []), []);
  });

  it('ne rend rien pour une recette sans étiquette', () => {
    assert.deepEqual(aligner([], ['Végétarien']), []);
  });

  it('tranche par la première orthographe connue, l’entrée étant triée', () => {
    // Deux orthographes coexistent déjà en base : le service les lit triées,
    // le résultat ne dépend donc pas de l'ordre d'insertion.
    assert.deepEqual(aligner(['vegetarien'], ['Vegetarien', 'Végétarien']), ['Vegetarien']);
  });
});
