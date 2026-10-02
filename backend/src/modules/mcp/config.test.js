import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lireConfiguration, porteeDemandee } from './config.js';

const COMPLETE = {
  MCP_RESOURCE_URL: 'https://minka.example.fr/api/mcp',
  MCP_ISSUER: 'https://id.example.fr',
  MCP_USERS: 'abc-123=bastien',
};

describe('lireConfiguration', () => {
  it('laisse le connecteur éteint quand rien n’est renseigné', () => {
    assert.deepEqual(lireConfiguration({}), { actif: false });
    assert.deepEqual(lireConfiguration({ MCP_ISSUER: '  ' }), { actif: false });
  });

  it('lit une configuration complète', () => {
    const lue = lireConfiguration({ ...COMPLETE, MCP_PERMISSION: 'menus' });

    assert.equal(lue.actif, true);
    assert.equal(lue.ressource, 'https://minka.example.fr/api/mcp');
    assert.equal(lue.emetteur, 'https://id.example.fr');
    assert.equal(lue.jwks, null);
    assert.equal(lue.permission, 'menus');
    assert.deepEqual([...lue.comptes], [['abc-123', 'bastien']]);
  });

  it('retire la barre oblique finale', () => {
    // L'audience et l'émetteur se comparent à la lettre près, et Pocket-ID
    // retire lui-même la barre finale de l'identifiant de ressource.
    const lue = lireConfiguration({
      ...COMPLETE,
      MCP_RESOURCE_URL: 'https://minka.example.fr/api/mcp/',
      MCP_ISSUER: 'https://id.example.fr/',
    });

    assert.equal(lue.ressource, 'https://minka.example.fr/api/mcp');
    assert.equal(lue.emetteur, 'https://id.example.fr');
  });

  it('refuse une configuration à moitié remplie', () => {
    assert.throws(
      () => lireConfiguration({ MCP_ISSUER: 'https://id.example.fr' }),
      /MCP_RESOURCE_URL, MCP_USERS manquent/,
    );
    // Une variable facultative seule trahit aussi un oubli.
    assert.throws(() => lireConfiguration({ MCP_PERMISSION: 'menus' }), /à moitié configuré/);
  });

  it('exige HTTPS, sauf sur la machine elle-même', () => {
    assert.throws(
      () => lireConfiguration({ ...COMPLETE, MCP_ISSUER: 'http://id.example.fr' }),
      /HTTPS/,
    );
    assert.equal(
      lireConfiguration({ ...COMPLETE, MCP_ISSUER: 'http://127.0.0.1:8799' }).emetteur,
      'http://127.0.0.1:8799',
    );
  });

  it('refuse une adresse illisible', () => {
    assert.throws(() => lireConfiguration({ ...COMPLETE, MCP_JWKS_URL: 'jwks' }), /pas une adresse valide/);
  });

  it('lit plusieurs comptes, identifiants en minuscules', () => {
    const lue = lireConfiguration({ ...COMPLETE, MCP_USERS: ' abc=Bastien , def=marie ' });

    assert.deepEqual([...lue.comptes], [['abc', 'bastien'], ['def', 'marie']]);
  });

  it('refuse un compte mal écrit', () => {
    assert.throws(() => lireConfiguration({ ...COMPLETE, MCP_USERS: 'bastien' }), /<sub>=<identifiant>/);
    assert.throws(() => lireConfiguration({ ...COMPLETE, MCP_USERS: 'abc=' }), /<sub>=<identifiant>/);
    assert.throws(() => lireConfiguration({ ...COMPLETE, MCP_USERS: ' , ' }), /aucun compte/);
  });

  it('refuse plusieurs permissions', () => {
    assert.throws(() => lireConfiguration({ ...COMPLETE, MCP_PERMISSION: 'menus recettes' }), /une seule/);
  });
});

describe('porteeDemandee', () => {
  it('demande openid, et la permission quand il y en a une', () => {
    assert.equal(porteeDemandee({ permission: null }), 'openid');
    assert.equal(porteeDemandee({ permission: 'menus' }), 'openid menus');
  });
});
