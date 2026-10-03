import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aujourdhui, decalerJours } from '../../lib/dates.js';
import { grouperParJour, libelleHoraire, libelleJour } from './agenda.js';

const evenement = (champs) => ({ startsOn: '2026-08-17', endsOn: null, ...champs });

describe('libelleJour', () => {
  it('nomme les deux jours proches', () => {
    assert.equal(libelleJour(aujourdhui()), "Aujourd'hui");
    assert.equal(libelleJour(decalerJours(aujourdhui(), 1)), 'Demain');
  });

  it('donne le jour de la semaine au-delà', () => {
    assert.match(libelleJour(decalerJours(aujourdhui(), 3)), /^\p{L}+ \d+ \p{L}+$/u);
  });

  it('parle anglais quand on le lui demande', () => {
    assert.equal(libelleJour(aujourdhui(), 'en'), 'Today');
    assert.equal(libelleJour(decalerJours(aujourdhui(), 1), 'en'), 'Tomorrow');
    // « Tuesday 6 October » : le jour avant le mois, à la britannique.
    assert.match(libelleJour(decalerJours(aujourdhui(), 3), 'en'), /^\p{L}+ \d+ \p{L}+$/u);
  });

  it('ajoute l’année quand elle est lointaine', () => {
    // Sinon un événement dans quinze mois se lirait comme s'il tombait cette
    // année-ci.
    const dans400Jours = decalerJours(aujourdhui(), 400);
    const annee = String(new Date(`${dans400Jours}T12:00:00`).getFullYear());

    assert.ok(libelleJour(dans400Jours).includes(annee));
    assert.ok(!libelleJour(decalerJours(aujourdhui(), 3)).includes(annee));
  });
});

describe('grouperParJour', () => {
  it('ne renvoie aucun jour pour une liste vide', () => {
    assert.deepEqual(grouperParJour([], { depuis: '2026-08-17' }), []);
  });

  it('laisse intact un événement d’une seule journée', () => {
    const evt = evenement({ id: 1 });
    const jours = grouperParJour([evt], { depuis: '2026-08-17' });

    assert.equal(jours.length, 1);
    assert.equal(jours[0].date, '2026-08-17');
    // Même référence : pas de rang ajouté quand il n'y a rien à situer.
    assert.equal(jours[0].events[0], evt);
    assert.equal(jours[0].events[0].jourIndex, undefined);
  });

  it('traite une fin absente comme une journée unique', () => {
    const jours = grouperParJour([evenement({ id: 1, endsOn: null })], { depuis: '2026-08-17' });

    assert.equal(jours.length, 1);
    assert.equal(jours[0].events[0].joursTotal, undefined);
  });

  it('répète un séjour dans chaque journée, avec son rang', () => {
    const jours = grouperParJour(
      [evenement({ id: 1, startsOn: '2026-08-17', endsOn: '2026-08-20' })],
      { depuis: '2026-08-17' },
    );

    assert.deepEqual(
      jours.map((jour) => jour.date),
      ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20'],
    );
    assert.deepEqual(
      jours.map((jour) => jour.events[0].jourIndex),
      [1, 2, 3, 4],
    );
    assert.ok(jours.every((jour) => jour.events[0].joursTotal === 4));
  });

  it('garde le bon rang pour un séjour déjà commencé', () => {
    // Le cas subtil : on ouvre l'agenda au milieu d'un séjour. Les journées
    // passées ne s'affichent pas, mais le séjour doit rester « jour 3 sur 5 »,
    // pas repartir à 1.
    const jours = grouperParJour(
      [evenement({ id: 1, startsOn: '2026-08-15', endsOn: '2026-08-19' })],
      { depuis: '2026-08-17' },
    );

    assert.deepEqual(
      jours.map((jour) => jour.date),
      ['2026-08-17', '2026-08-18', '2026-08-19'],
    );
    assert.deepEqual(
      jours.map((jour) => jour.events[0].jourIndex),
      [3, 4, 5],
    );
    assert.ok(jours.every((jour) => jour.events[0].joursTotal === 5));
  });

  it('écarte un événement entièrement passé', () => {
    const jours = grouperParJour(
      [evenement({ id: 1, startsOn: '2026-08-10', endsOn: '2026-08-12' })],
      { depuis: '2026-08-17' },
    );

    assert.deepEqual(jours, []);
  });

  it('s’arrête à la borne haute de la fenêtre', () => {
    const jours = grouperParJour(
      [evenement({ id: 1, startsOn: '2026-08-15', endsOn: '2026-08-25' })],
      { depuis: '2026-08-15', jusqua: '2026-08-17' },
    );

    assert.deepEqual(
      jours.map((jour) => jour.date),
      ['2026-08-15', '2026-08-16', '2026-08-17'],
    );
  });

  it('trie les journées quel que soit l’ordre d’entrée', () => {
    const jours = grouperParJour(
      [
        evenement({ id: 1, startsOn: '2026-09-02' }),
        evenement({ id: 2, startsOn: '2026-08-17' }),
        evenement({ id: 3, startsOn: '2026-08-25' }),
      ],
      { depuis: '2026-08-17' },
    );

    assert.deepEqual(
      jours.map((jour) => jour.date),
      ['2026-08-17', '2026-08-25', '2026-09-02'],
    );
  });

  it('rassemble plusieurs événements dans la même journée', () => {
    const jours = grouperParJour(
      [
        evenement({ id: 1, startsOn: '2026-08-17' }),
        evenement({ id: 2, startsOn: '2026-08-16', endsOn: '2026-08-17' }),
      ],
      { depuis: '2026-08-17' },
    );

    assert.equal(jours.length, 1);
    assert.equal(jours[0].events.length, 2);
  });
});

describe('libelleHoraire', () => {
  it('annonce une journée entière', () => {
    assert.equal(libelleHoraire({ startsAt: null }), 'Journée');
    assert.equal(libelleHoraire({ startsAt: null }, 'en'), 'All day');
  });

  it('donne l’heure seule quand il n’y a pas de fin', () => {
    assert.equal(libelleHoraire({ startsAt: '14:30', endsAt: null }), '14:30');
  });

  it('donne l’intervalle quand la fin est connue', () => {
    assert.equal(libelleHoraire({ startsAt: '14:30', endsAt: '15:15' }), '14:30 → 15:15');
  });
});
