import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LANGUES } from '../../lib/langue.js';
import { planDeDepart, planningInitial } from './planning.js';

const DEPART = Date.parse('2026-10-05T00:00:00Z');
const dans = (jours) => new Date(DEPART + jours * 86_400_000).toISOString().slice(0, 10);

describe('planDeDepart', () => {
  for (const langue of LANGUES) {
    it(`range chaque intervention dans une pièce connue (${langue})`, () => {
      const { zones, interventions } = planDeDepart(langue);

      for (const [zone, label] of interventions) {
        assert.ok(zone === null || zones.includes(zone), `${label} : pièce « ${zone} » inconnue`);
      }
    });
  }

  it('décrit la même maison dans chaque langue', () => {
    // Même nombre de pièces, mêmes interventions dans le même ordre, au même
    // rythme et dans la pièce de même rang : une traduction ne doit ni perdre
    // une ligne ni la déplacer.
    const forme = (langue) => {
      const { zones, interventions } = planDeDepart(langue);
      return {
        pieces: zones.length,
        interventions: interventions.map(([zone, , rythme]) => [
          zone === null ? null : zones.indexOf(zone),
          rythme,
        ]),
      };
    };

    for (const langue of LANGUES) {
      assert.deepEqual(forme(langue), forme('fr'), langue);
    }
  });

  it('parle la langue demandée', () => {
    assert.equal(planDeDepart('fr').zones[0], 'Salle de bain');
    assert.equal(planDeDepart('en').zones[0], 'Bathroom');
  });
});

describe('planningInitial', () => {
  it('ne pose rien en retard ni pour aujourd’hui', () => {
    for (const { dueOn } of planningInitial(dans)) {
      assert.ok(dueOn > dans(0), dueOn);
    }
  });

  it('étale chaque rythme sur sa propre période', () => {
    const hebdomadaires = planningInitial(dans).filter((i) => i.recurrence === 'weekly');
    assert.ok(hebdomadaires.every(({ dueOn }) => dueOn <= dans(7)));
  });

  it('pose les mêmes échéances quelle que soit la langue', () => {
    const dates = (langue) => planningInitial(dans, langue).map(({ dueOn }) => dueOn);
    assert.deepEqual(dates('en'), dates('fr'));
  });
});
