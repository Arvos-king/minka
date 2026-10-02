import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';

import { JetonRefuse, creerVerificateur, jetonDeLaRequete, permissionsDu } from './jeton.js';

const EMETTEUR = 'https://id.example.fr';
const RESSOURCE = 'https://minka.example.fr/api/mcp';

/** Un faux Pocket-ID : une paire de clés, et de quoi signer des jetons. */
let cles;
let privee;
let etrangere;

before(async () => {
  const paire = await generateKeyPair('RS256');
  privee = paire.privateKey;
  cles = createLocalJWKSet({ keys: [{ ...(await exportJWK(paire.publicKey)), kid: 'k1', alg: 'RS256' }] });
  etrangere = (await generateKeyPair('RS256')).privateKey;
});

function signer(contenu = {}, { cle = privee, emetteur = EMETTEUR, audience = RESSOURCE, expire = '1h' } = {}) {
  return new SignJWT({ scope: 'openid menus', ...contenu })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(emetteur)
    .setAudience(audience)
    .setSubject(contenu.sub ?? 'abc-123')
    .setIssuedAt()
    .setExpirationTime(expire)
    .sign(cle);
}

const verificateur = (permission = 'menus') =>
  creerVerificateur({ emetteur: EMETTEUR, ressource: RESSOURCE, permission, cles });

/** Le refus attendu, avec son statut HTTP et un bout de sa raison. */
async function refuse(promesse, statut, raison) {
  await assert.rejects(promesse, (erreur) => {
    assert.ok(erreur instanceof JetonRefuse);
    assert.equal(erreur.statut, statut);
    assert.match(erreur.message, raison);
    return true;
  });
}

describe('creerVerificateur', () => {
  it('accepte un jeton de Pocket-ID destiné à Minka', async () => {
    const payload = await verificateur()(await signer());

    assert.equal(payload.sub, 'abc-123');
  });

  it('accepte une audience parmi plusieurs', async () => {
    const jeton = await signer({}, { audience: ['autre-client', RESSOURCE] });

    assert.equal((await verificateur()(jeton)).sub, 'abc-123');
  });

  it('refuse un jeton absent', async () => {
    await refuse(verificateur()(null), 401, /absent/);
  });

  it('refuse un jeton délivré pour une autre application', async () => {
    // Le même Pocket-ID signe pour toutes les applications du foyer : sans ce
    // contrôle, n'importe laquelle ouvrirait Minka.
    await refuse(verificateur()(await signer({}, { audience: 'https://photos.example.fr' })), 401, /« aud »/);
  });

  it('refuse un jeton signé par un autre émetteur', async () => {
    await refuse(verificateur()(await signer({}, { emetteur: 'https://ailleurs.example.fr' })), 401, /« iss »/);
  });

  it('refuse une signature qui n’est pas celle de Pocket-ID', async () => {
    await refuse(verificateur()(await signer({}, { cle: etrangere })), 401, /signature/);
  });

  it('refuse un jeton expiré', async () => {
    const jeton = await signer({}, { expire: Math.floor(Date.now() / 1000) - 120 });

    await refuse(verificateur()(jeton), 401, /expiré/);
  });

  it('refuse un texte qui n’est pas un jeton', async () => {
    await refuse(verificateur()('pas-un-jeton'), 401, /illisible/);
  });

  it('demande la permission quand elle manque', async () => {
    // 403, et non 401 : la personne est bien connectée, il lui manque un droit.
    await refuse(verificateur()(await signer({ scope: 'openid' })), 403, /« menus »/);
  });

  it('se passe de permission quand aucune n’est exigée', async () => {
    const payload = await verificateur(null)(await signer({ scope: 'openid' }));

    assert.equal(payload.sub, 'abc-123');
  });
});

describe('permissionsDu', () => {
  it('lit les trois emplacements en usage', () => {
    assert.deepEqual(permissionsDu({ scope: 'openid  menus' }), ['openid', 'menus']);
    assert.deepEqual(permissionsDu({ scp: ['menus'] }), ['menus']);
    assert.deepEqual(permissionsDu({ permissions: ['menus', 42] }), ['menus']);
    assert.deepEqual(permissionsDu({ scope: 'menus', permissions: ['menus'] }), ['menus']);
    assert.deepEqual(permissionsDu({}), []);
  });
});

describe('jetonDeLaRequete', () => {
  it('extrait le jeton porteur', () => {
    assert.equal(jetonDeLaRequete('Bearer abc.def.ghi'), 'abc.def.ghi');
    assert.equal(jetonDeLaRequete('bearer abc'), 'abc');
  });

  it('ignore tout autre en-tête', () => {
    assert.equal(jetonDeLaRequete(undefined), null);
    assert.equal(jetonDeLaRequete('Basic dXNlcjpwYXNz'), null);
    assert.equal(jetonDeLaRequete('Bearer'), null);
  });
});
