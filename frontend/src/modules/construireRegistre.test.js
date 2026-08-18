import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  construireOnglets,
  construireRegistre,
  ongletActif,
  trouverModuleParChemin,
} from './construireRegistre.js';

const Composant = () => null;

/** Un module valide, auquel chaque test apporte sa variation. */
const module = (champs) => ({
  id: 'shopping',
  label: 'Liste de courses',
  path: '/courses',
  Component: Composant,
  ...champs,
});

/** Recueille les signalements au lieu de les afficher. */
function collecteur() {
  const messages = [];
  return { messages, signaler: (message) => messages.push(message) };
}

describe('construireRegistre', () => {
  it('ne renvoie rien quand aucun module n’est déposé', () => {
    assert.deepEqual(construireRegistre({}), []);
  });

  it('retient un module complet', () => {
    const definition = module();
    const registre = construireRegistre({ './shopping/index.js': { default: definition } });

    assert.deepEqual(registre, [definition]);
  });

  it('trie par libellé, en français', () => {
    const registre = construireRegistre({
      './tasks/index.js': { default: module({ id: 'tasks', label: 'Tâches', path: '/taches' }) },
      './calendar/index.js': {
        default: module({ id: 'calendar', label: 'Calendrier', path: '/calendrier' }),
      },
      './fridge/index.js': { default: module({ id: 'fridge', label: 'Épicerie', path: '/epicerie' }) },
    });

    // « Épicerie » se range à sa place alphabétique malgré l'accent, ce qu'un
    // tri brut sur les codes de caractères ne ferait pas.
    assert.deepEqual(
      registre.map((m) => m.label),
      ['Calendrier', 'Épicerie', 'Tâches'],
    );
  });

  describe('modules écartés', () => {
    it('écarte un fichier sans export par défaut', () => {
      const { messages, signaler } = collecteur();
      const registre = construireRegistre({ './budget/index.js': {} }, { signaler });

      assert.deepEqual(registre, []);
      assert.match(messages[0], /champs manquants/);
    });

    it('nomme les champs manquants', () => {
      const { messages, signaler } = collecteur();
      const registre = construireRegistre(
        { './budget/index.js': { default: { id: 'budget' } } },
        { signaler },
      );

      assert.deepEqual(registre, []);
      assert.match(messages[0], /label/);
      assert.match(messages[0], /path/);
      assert.match(messages[0], /Component/);
    });

    it('écarte le second module de même identifiant', () => {
      const { messages, signaler } = collecteur();
      const registre = construireRegistre(
        {
          './courses/index.js': { default: module({ path: '/a' }) },
          './shopping/index.js': { default: module({ path: '/b' }) },
        },
        { signaler },
      );

      assert.equal(registre.length, 1);
      assert.match(messages[0], /identifiant/);
      // Le message doit nommer le fichier déjà en place, sinon il n'aide pas.
      assert.match(messages[0], /\.\/courses\/index\.js/);
    });

    it('écarte le second module sur la même route', () => {
      const { messages, signaler } = collecteur();
      const registre = construireRegistre(
        {
          './courses/index.js': { default: module({ id: 'courses' }) },
          './shopping/index.js': { default: module({ id: 'shopping' }) },
        },
        { signaler },
      );

      assert.equal(registre.length, 1);
      assert.match(messages[0], /route/);
      assert.match(messages[0], /\.\/courses\/index\.js/);
    });

    it('garde les modules sains autour de celui qu’il écarte', () => {
      // Un module fautif ne doit pas emporter le reste de l'application.
      const { signaler } = collecteur();
      const registre = construireRegistre(
        {
          './budget/index.js': { default: { id: 'budget' } },
          './shopping/index.js': { default: module() },
        },
        { signaler },
      );

      assert.deepEqual(
        registre.map((m) => m.id),
        ['shopping'],
      );
    });
  });
});

describe('construireOnglets', () => {
  const mod = (id, label, path, champs = {}) => ({ id, label, path, Component: Composant, ...champs });

  const quatreModules = [
    mod('calendar', 'Calendrier', '/calendrier'),
    mod('fridge', 'Frigo', '/frigo'),
    mod('shopping', 'Liste de courses', '/courses', { shortLabel: 'Courses' }),
    mod('tasks', 'Tâches', '/taches'),
  ];

  it('ouvre par l’accueil tant que tout tient', () => {
    const onglets = construireOnglets(quatreModules);

    assert.deepEqual(
      onglets.map((o) => o.label),
      ['Accueil', 'Calendrier', 'Frigo', 'Courses', 'Tâches'],
    );
    assert.equal(onglets[0].path, '/');
  });

  it('préfère le libellé court quand il existe', () => {
    // « Liste de courses » ne tient pas sous une icône de 75 px.
    const onglets = construireOnglets(quatreModules);

    assert.equal(onglets.find((o) => o.cle === 'shopping').label, 'Courses');
    assert.equal(onglets.find((o) => o.cle === 'fridge').label, 'Frigo');
  });

  it('n’affiche que l’accueil quand aucun module n’est déposé', () => {
    assert.deepEqual(construireOnglets([]), [{ cle: 'accueil', label: 'Accueil', path: '/' }]);
  });

  it('remplace l’accueil par « Plus » dès qu’il y a trop de modules', () => {
    // Cinq modules : garder l'accueil *et* « Plus » ferait deux onglets vers la
    // même page.
    const cinq = [...quatreModules, mod('menus', 'Menus', '/menus')];
    const onglets = construireOnglets(cinq);

    assert.equal(onglets.length, 5);
    assert.equal(onglets.at(-1).cle, 'plus');
    assert.equal(onglets.at(-1).path, '/');
    assert.ok(!onglets.some((o) => o.cle === 'accueil'));
  });

  it('respecte tabOrder pour choisir qui reste visible', () => {
    // Sans cela, l'ordre alphabétique masquerait « Liste de courses », le
    // module le plus utilisé.
    const sept = [
      ...quatreModules.map((m) => (m.id === 'shopping' ? { ...m, tabOrder: 1 } : m)),
      mod('budget', 'Budget', '/budget'),
      mod('menus', 'Menus', '/menus'),
      mod('notes', 'Notes', '/notes'),
    ];

    const onglets = construireOnglets(sept);

    assert.equal(onglets[0].cle, 'shopping', 'le module prioritaire ouvre la marche');
    assert.equal(onglets.at(-1).cle, 'plus');
    assert.equal(onglets.length, 5);
  });

  it('trie par tabOrder croissant, puis par ordre alphabétique', () => {
    const modules = [
      mod('c', 'Cerise', '/c'),
      mod('a', 'Abricot', '/a', { tabOrder: 2 }),
      mod('b', 'Banane', '/b', { tabOrder: 1 }),
    ];

    assert.deepEqual(
      construireOnglets(modules).map((o) => o.cle),
      ['accueil', 'b', 'a', 'c'],
    );
  });

  it('accepte une largeur de barre différente', () => {
    assert.equal(construireOnglets(quatreModules, { maxOnglets: 3 }).length, 3);
    assert.equal(construireOnglets(quatreModules, { maxOnglets: 3 }).at(-1).cle, 'plus');
  });
});

describe('ongletActif', () => {
  const modules = [
    { id: 'shopping', label: 'Liste de courses', path: '/courses', Component: Composant },
    { id: 'tasks', label: 'Tâches', path: '/taches', Component: Composant },
  ];
  const onglets = construireOnglets(modules);

  it('allume l’onglet du module ouvert', () => {
    assert.equal(ongletActif(onglets, '/courses', modules), 'shopping');
  });

  it('reste allumé sur une sous-route du module', () => {
    assert.equal(ongletActif(onglets, '/courses/42', modules), 'shopping');
  });

  it('ne confond pas deux routes de même préfixe', () => {
    assert.equal(ongletActif(onglets, '/coursesXY', modules), null);
  });

  it('allume l’accueil sur le tableau de bord', () => {
    assert.equal(ongletActif(onglets, '/', modules), 'accueil');
  });

  it('n’allume rien sur la page du compte', () => {
    // On y accède par l'avatar, pas par la barre : allumer un onglet mentirait.
    assert.equal(ongletActif(onglets, '/compte', modules), null);
  });

  it('fait représenter un module masqué par « Plus »', () => {
    const nombreux = [
      ...modules,
      { id: 'budget', label: 'Budget', path: '/budget', Component: Composant },
      { id: 'fridge', label: 'Frigo', path: '/frigo', Component: Composant },
      { id: 'menus', label: 'Menus', path: '/menus', Component: Composant },
      { id: 'notes', label: 'Notes', path: '/notes', Component: Composant },
    ];
    const avecPlus = construireOnglets(nombreux);

    assert.ok(!avecPlus.some((o) => o.cle === 'notes'), 'Notes est bien masqué');
    assert.equal(ongletActif(avecPlus, '/notes', nombreux), 'plus');
  });
});

describe('trouverModuleParChemin', () => {
  const modules = [
    module({ id: 'shopping', path: '/courses' }),
    module({ id: 'tasks', label: 'Tâches', path: '/taches' }),
  ];

  it('retrouve un module sur sa route exacte', () => {
    assert.equal(trouverModuleParChemin(modules, '/courses').id, 'shopping');
  });

  it('retrouve un module sur une sous-route', () => {
    assert.equal(trouverModuleParChemin(modules, '/courses/42').id, 'shopping');
  });

  it('ne confond pas deux routes de même préfixe', () => {
    // « /coursesXY » ne doit pas passer pour une sous-route de « /courses ».
    assert.equal(trouverModuleParChemin(modules, '/coursesXY'), undefined);
  });

  it('ne renvoie rien pour une route inconnue', () => {
    assert.equal(trouverModuleParChemin(modules, '/budget'), undefined);
  });
});
