import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activityRowKey } from "../src/js/lib/wallet-alerts.js";

describe("wallet activity alerts", () => {
  it("activityRowKey prefers tx_id", () => {
    assert.equal(
      activityRowKey({ tx_id: "0xabc", kind: "transfer", direction: "in" }),
      "tx:0xabc",
    );
  });

  it("activityRowKey falls back to row fingerprint", () => {
    const a = activityRowKey({
      kind: "transfer",
      direction: "in",
      amount: "1000",
      counterparty: "bob",
      height: 42,
    });
    assert.match(a, /^row:transfer\|in\|1000\|bob\|42$/);
  });
});
