import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPublicKey,
  randomPrivateKey,
  siteLoginMessage,
  toHex,
} from "../src/js/lib/crypto.js";
import {
  assertOriginBinding,
  buildChallenge,
  loginMessage,
  signLoginChallenge,
  verifyLoginResponse,
} from "../src/js/lib/site-login.js";

/** Golden vector — fixed inputs for guld/site_login/v1 (spec 14 §10.1). */
const GOLDEN = {
  chainId: 2,
  name: "alice",
  domain: "guld.io",
  uri: "https://guld.io/demo/login/",
  nonce: "00112233445566778899aabbccddeeff",
  issuedAt: "2026-09-27T13:00:00Z",
  expirationTime: "2026-09-27T13:10:00Z",
  statement: "Log in to Guld demo",
  digest:
    "0xaf73428abe9eb83549968f9250f8bd6c97b1e8d2fa94c7c17ffd80031f32412e",
};

describe("site-login digest", () => {
  it("matches golden tagged hash", async () => {
    const msg = await siteLoginMessage(
      GOLDEN.chainId,
      GOLDEN.name,
      GOLDEN.domain,
      GOLDEN.uri,
      GOLDEN.nonce,
      GOLDEN.issuedAt,
      GOLDEN.expirationTime,
      GOLDEN.statement,
    );
    assert.equal(toHex(msg), GOLDEN.digest);
  });

  it("loginMessage matches siteLoginMessage", async () => {
    const challenge = {
      v: 1,
      type: "guld1loginreq",
      domain: GOLDEN.domain,
      uri: GOLDEN.uri,
      name: GOLDEN.name,
      chain_id: GOLDEN.chainId,
      nonce: GOLDEN.nonce,
      issued_at: GOLDEN.issuedAt,
      expiration_time: GOLDEN.expirationTime,
      statement: GOLDEN.statement,
    };
    const a = await loginMessage(challenge);
    assert.equal(toHex(a), GOLDEN.digest);
  });
});

describe("site-login sign/verify", () => {
  it("round-trips with account key lookup", async () => {
    const priv = await randomPrivateKey();
    const pubHex = toHex(await getPublicKey(priv));
    const challenge = buildChallenge({
      domain: "localhost:8080",
      uri: "http://localhost:8080/demo/login/",
      name: "bob",
      chainId: 2,
      nonce: "aabbccddeeff00112233445566778899",
      issuedAt: "2026-09-27T12:00:00Z",
      expirationTime: "2026-09-27T12:10:00Z",
      statement: "demo",
    });
    assertOriginBinding(challenge, "http://localhost:8080");

    const res = await signLoginChallenge(challenge, {
      key_index: 0,
      privHex: toHex(priv),
      pubHex,
    });
    assert.equal(res.type, "guld1login");

    await verifyLoginResponse(res, {
      accountKeys: [pubHex],
      chainId: 2,
      now: Date.parse("2026-09-27T12:05:00Z"),
      expectedDomain: "localhost:8080",
      expectedUri: "http://localhost:8080/demo/login/",
    });
  });

  it("rejects wrong pubkey", async () => {
    const priv = await randomPrivateKey();
    const other = await randomPrivateKey();
    const pubHex = toHex(await getPublicKey(priv));
    const otherPub = toHex(await getPublicKey(other));
    const challenge = buildChallenge({
      domain: "guld.io",
      uri: "https://guld.io/demo/login/",
      name: "carol",
      chainId: 1,
      issuedAt: "2026-09-27T12:00:00Z",
      expirationTime: "2026-09-27T12:10:00Z",
    });
    const res = await signLoginChallenge(challenge, {
      key_index: 0,
      privHex: toHex(priv),
      pubHex,
    });
    await assert.rejects(
      () =>
        verifyLoginResponse(res, {
          accountKeys: [otherPub],
          chainId: 1,
          now: Date.parse("2026-09-27T12:01:00Z"),
        }),
      /pubkey does not match/,
    );
  });

  it("rejects expired challenge", async () => {
    const priv = await randomPrivateKey();
    const pubHex = toHex(await getPublicKey(priv));
    const challenge = buildChallenge({
      domain: "guld.io",
      uri: "https://guld.io/demo/login/",
      name: "dave",
      chainId: 1,
      issuedAt: "2026-09-27T12:00:00Z",
      expirationTime: "2026-09-27T12:10:00Z",
    });
    const res = await signLoginChallenge(challenge, {
      key_index: 0,
      privHex: toHex(priv),
      pubHex,
    });
    await assert.rejects(
      () =>
        verifyLoginResponse(res, {
          accountKeys: [pubHex],
          chainId: 1,
          now: Date.parse("2026-09-27T12:11:00Z"),
        }),
      /validity window/,
    );
  });
});
