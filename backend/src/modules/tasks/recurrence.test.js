import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PERIODES_MAX, ajouterMois, avancerDe, prochaineEcheance } from './recurrence.js';

describe('ajouterMois', () => {
  it('reste dans le mois d’arrivée quand le jour n’y existe pas', () => {
    // Sans ce plafonnement, JavaScript déborderait sur le 3 mars.
    assert.equal(ajouterMois('2026-01-31', 1), '2026-02-28');
  });

  it('tient compte des années bissextiles', () => {
    assert.equal(ajouterMois('2024-01-31', 1), '2024-02-29');
  });

  it('retrouve le 31 dès que le mois le permet', () => {
    // Le cœur de la règle : on repart de l'origine, donc février ne « retient »
    // pas la tâche au 28 pour toujours.
    assert.equal(ajouterMois('2026-01-31', 2), '2026-03-31');
  });

  it('passe d’une année à l’autre', () => {
    assert.equal(ajouterMois('2026-12-15', 1), '2027-01-15');
  });

  it('recule quand le nombre est négatif', () => {
    assert.equal(ajouterMois('2026-03-31', -1), '2026-02-28');
  });

  it('laisse les jours ordinaires intacts', () => {
    assert.equal(ajouterMois('2026-01-15', 1), '2026-02-15');
  });
});

describe('avancerDe', () => {
  it('avance d’un jour', () => {
    assert.equal(avancerDe('2026-08-17', 'daily', 1), '2026-08-18');
  });

  it('franchit une fin de mois au quotidien', () => {
    assert.equal(avancerDe('2026-08-31', 'daily', 1), '2026-09-01');
  });

  it('avance de semaines entières', () => {
    assert.equal(avancerDe('2026-08-17', 'weekly', 1), '2026-08-24');
    assert.equal(avancerDe('2026-08-17', 'weekly', 3), '2026-09-07');
  });

  it('délègue le mensuel au calcul par mois', () => {
    assert.equal(avancerDe('2026-01-31', 'monthly', 1), '2026-02-28');
  });

  it('traite l’annuel comme douze mois', () => {
    assert.equal(avancerDe('2026-08-17', 'yearly', 1), '2027-08-17');
    // Un 29 février annuel retombe au 28 les années non bissextiles.
    assert.equal(avancerDe('2024-02-29', 'yearly', 1), '2025-02-28');
  });

  it('renvoie null pour un rythme inconnu', () => {
    assert.equal(avancerDe('2026-08-17', 'hourly', 1), null);
    assert.equal(avancerDe('2026-08-17', null, 1), null);
  });
});

describe('prochaineEcheance', () => {
  it('ne replanifie pas une tâche sans rythme', () => {
    assert.equal(prochaineEcheance('2026-08-17', null, '2026-08-17'), null);
  });

  it('vise toujours une date future', () => {
    assert.equal(prochaineEcheance('2026-08-17', 'daily', '2026-08-17'), '2026-08-18');
  });

  it('ne s’arrête pas sur une occurrence tombant aujourd’hui', () => {
    // Sinon la tâche réapparaîtrait à cocher le jour même où on vient de la
    // cocher.
    assert.equal(prochaineEcheance('2026-08-10', 'weekly', '2026-08-17'), '2026-08-24');
  });

  it('rattrape le retard sans repasser par les occurrences manquées', () => {
    // Hebdomadaire, trois semaines de retard : on repart sur la prochaine à
    // venir, pas sur le 3 août qu'on cocherait aussitôt.
    assert.equal(prochaineEcheance('2026-07-27', 'weekly', '2026-08-17'), '2026-08-24');
  });

  it('ne laisse pas dériver une tâche mensuelle tombant le 31', () => {
    // LE cas qui justifie de repartir de l'origine. En enchaînant les
    // additions, février ramènerait la tâche au 28 et elle y resterait.
    assert.equal(prochaineEcheance('2026-01-31', 'monthly', '2026-02-01'), '2026-02-28');
    assert.equal(prochaineEcheance('2026-01-31', 'monthly', '2026-03-01'), '2026-03-31');
    assert.equal(prochaineEcheance('2026-01-31', 'monthly', '2026-04-01'), '2026-04-30');
    assert.equal(prochaineEcheance('2026-01-31', 'monthly', '2026-05-01'), '2026-05-31');
  });

  it('replanifie une tâche annuelle sur l’année suivante', () => {
    assert.equal(prochaineEcheance('2026-08-17', 'yearly', '2026-08-17'), '2027-08-17');
  });

  /*
   * Comportement actuel documenté, et discutable — voir la note du compte-rendu.
   * Au-delà de PERIODES_MAX occurrences, la recherche abandonne et renvoie la
   * dernière calculée, qui peut être dans le passé : une tâche quotidienne
   * oubliée plus de 500 jours ressortirait donc encore en retard.
   * Si ce comportement change, ce test doit échouer — c'est son intérêt.
   */
  it('abandonne au-delà de PERIODES_MAX et renvoie la dernière occurrence calculée', () => {
    const resultat = prochaineEcheance('2020-01-01', 'daily', '2026-08-17');

    assert.equal(resultat, avancerDe('2020-01-01', 'daily', PERIODES_MAX));
    assert.ok(resultat < '2026-08-17', 'la date renvoyée est bien dans le passé');
  });
});
