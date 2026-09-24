import test from "node:test";
import assert from "node:assert/strict";
import {
  quantaToGuld,
  summarizeTx,
  summarizeActivity,
  shortHash,
} from "../src/js/lib/rpc.js";

test("quantaToGuld formats decimals", () => {
  assert.equal(quantaToGuld("0"), "0");
  assert.equal(quantaToGuld("10000000000"), "1");
  assert.equal(quantaToGuld("15000000000"), "1.5");
});

test("summarizeTx covers transfer and claim_legacy", () => {
  const t = summarizeTx({
    type: "transfer",
    from: "alice",
    to: "bob",
    amount: "10000000000",
  });
  assert.equal(t.type, "transfer");
  assert.equal(t.primary, "alice → bob");
  assert.equal(t.amount, "1");

  const c = summarizeTx({ type: "claim_legacy", name: "isysd" });
  assert.equal(c.type, "claim_legacy");
  assert.equal(c.primary, "isysd");
});

test("summarizeActivity covers flat ActivityItem shape", () => {
  const coinbase = summarizeActivity({
    kind: "coinbase",
    direction: "in",
    amount: "50000000000",
    height: "12",
  });
  assert.equal(coinbase.type, "coinbase");
  assert.equal(coinbase.primary, "block reward");
  assert.equal(coinbase.amount, "5");

  const transfer = summarizeActivity({
    kind: "transfer",
    direction: "out",
    amount: "10000000000",
    counterparty: "bob",
  });
  assert.equal(transfer.type, "transfer");
  assert.equal(transfer.primary, "→ bob");
  assert.equal(transfer.amount, "1");

  const claim = summarizeActivity({ kind: "claim_legacy", height: "1" });
  assert.equal(claim.type, "claim_legacy");
  assert.equal(claim.primary, "claim");
});

test("shortHash truncates", () => {
  const h = "0x" + "ab".repeat(32);
  assert.match(shortHash(h), /…/);
});
