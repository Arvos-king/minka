import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { grouperParRayon } from './rayons.js';

const RAYONS = [
  { cle: 'fruits-legumes', libelle: 'Fruits et légumes' },
  { cle: 'cremerie', libelle: 'Crémerie' },
  { cle: 'autres', libelle: 'Autres' },
];

const article = (id, rayon) => ({ id, name: `article ${id}`, rayon });

describe('grouperParRayon', () => {
  it('suit l’ordre du parcours, pas l’ordre d’ajout', () => {
    // La liste arrive dans l'ordre où elle a été écrite ; l'écran, lui, doit
    // suivre le magasin.
    const sections = grouperParRayon(
      [article(1, 'cremerie'), article(2, 'fruits-legumes')],
      RAYONS,
    );

    assert.deepEqual(
      sections.map((section) => section.cle),
      ['fruits-legumes', 'cremerie'],
    );
  });

  it('garde l’ordre d’ajout à l’intérieur d’un rayon', () => {
    // On retrouve la liste telle qu'on l'a construite, rayon par rayon.
    const sections = grouperParRayon(
      [article(1, 'cremerie'), article(2, 'cremerie'), article(3, 'cremerie')],
      RAYONS,
    );

    assert.deepEqual(
      sections[0].articles.map((a) => a.id),
      [1, 2, 3],
    );
  });

  it('masque les rayons vides', () => {
    const sections = grouperParRayon([article(1, 'cremerie')], RAYONS);

    assert.equal(sections.length, 1);
    assert.equal(sections[0].libelle, 'Crémerie');
  });

  it('ne perd jamais un article', () => {
    // Le test qui vaut tous les autres : un article escamoté ne serait pas
    // acheté, et rien à l'écran ne le signalerait.
    const articles = [
      article(1, 'cremerie'),
      article(2, 'fruits-legumes'),
      article(3, 'autres'),
      article(4, 'cremerie'),
    ];

    const groupes = grouperParRayon(articles, RAYONS).flatMap((section) => section.articles);

    assert.equal(groupes.length, articles.length);
    assert.deepEqual(new Set(groupes.map((a) => a.id)), new Set([1, 2, 3, 4]));
  });

  it('recueille dans la dernière section un rayon qu’il ne connaît pas', () => {
    // La page tourne depuis avant un déploiement qui a ajouté un rayon : ses
    // articles doivent rester visibles, quitte à être mal rangés.
    const sections = grouperParRayon([article(1, 'rayon-inconnu')], RAYONS);

    assert.equal(sections.length, 1);
    assert.equal(sections[0].cle, 'autres');
    assert.equal(sections[0].articles[0].id, 1);
  });

  it('affiche une section sans titre tant que les rayons ne sont pas arrivés', () => {
    // Premier rendu, avant la réponse de l'API : mieux vaut une liste à plat
    // qu'un écran vide.
    const sections = grouperParRayon([article(1, 'cremerie')], []);

    assert.equal(sections.length, 1);
    assert.equal(sections[0].libelle, null);
    assert.equal(sections[0].articles.length, 1);
  });

  it('ne rend aucune section sur une liste vide', () => {
    assert.deepEqual(grouperParRayon([], RAYONS), []);
    assert.deepEqual(grouperParRayon([], []), []);
  });
});
