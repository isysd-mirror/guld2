import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCosignRequest,
  buildTxFromCosign,
  keyIndexForPub,
  mergeAndVerify,
  parseCosignRequest,
  parseCosignResponse,
  signCosignRequest,
  stringifyCosign,
  verifyCosignResponse,
} from "../src/js/lib/cosign.js";
import { getPublicKey, randomPrivateKey, toHex } from "../src/js/lib/crypto.js";

describe("cosign schema v1", () => {
  it("round-trips update_master request/response with verify", async () => {
    const priv0 = await randomPrivateKey();
    const priv1 = await randomPrivateKey();
    const pub0 = toHex(await getPublicKey(priv0));
    const pub1 = toHex(await getPublicKey(priv1));
    const account = {
      account_id: `0x${"ab".repeat(32)}`,
      master_hash: `0x${"cd".repeat(32)}`,
      nonce: "3",
      keys: [pub0, pub1],
      threshold: 2,
    };
    const req = buildCosignRequest({
      op: "update_master",
      name: "treasury",
      account,
      chainId: 1,
      inclusionFee: "10000",
      newMasterHash: `0x${"ef".repeat(32)}`,
    });
    assert.equal(req.type, "guld1cosignreq");
    assert.equal(req.v, 1);
    assert.deepEqual(req.needed, [0, 1]);

    const parsed = parseCosignRequest(stringifyCosign(req));
    assert.equal(parsed.name, "treasury");

    const res0 = await signCosignRequest(req, {
      key_index: 0,
      privHex: toHex(priv0),
    });
    assert.equal(res0.type, "guld1cosignres");
    await verifyCosignResponse(res0, req.keys);

    const res1 = await signCosignRequest(req, {
      key_index: 1,
      privHex: toHex(priv1),
    });
    const sigs = new Map([
      [0, res0.signature],
      [1, res1.signature],
    ]);
    const merged = await mergeAndVerify(req, sigs);
    assert.equal(merged.length, 2);

    const tx = buildTxFromCosign(req, merged);
    assert.equal(tx.type, "update_master");
    assert.equal(tx.cosignatures.length, 2);
  });

  it("rejects wrong version / type", () => {
    assert.throws(() => parseCosignRequest({ v: 2, type: "guld1cosignreq", op: "update_master" }));
    assert.throws(() =>
      parseCosignResponse({
        v: 1,
        type: "guld1cosignreq",
        op: "update_master",
        key_index: 0,
        signature: "0x01",
      }),
    );
  });

  it("keyIndexForPub matches", () => {
    const keys = ["0xaaa", "0xBBB"];
    assert.equal(keyIndexForPub(keys, "0xbbb"), 1);
    assert.equal(keyIndexForPub(keys, "0xccc"), -1);
  });
});
