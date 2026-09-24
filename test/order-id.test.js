import test from "node:test";
import assert from "node:assert/strict";
import { GULD_ORDER_ID_RE, isGuldOrderId } from "../src/js/lib/order-id.js";

test("GULD_ORDER_ID_RE matches desk order ids", () => {
  assert.equal(isGuldOrderId("guldreg_charlie_a1b2c3d4"), true);
  assert.equal(isGuldOrderId("guldreg_alice.bob_00ffeedd"), true);
  assert.equal(isGuldOrderId("guldreg_x_01234567"), true);
  assert.equal(isGuldOrderId("guldreg_charlie_A1B2C3D4"), false);
  assert.equal(isGuldOrderId("guldreg_charlie_a1b2c3"), false);
  assert.equal(isGuldOrderId("order-charlie"), false);
  assert.match("guldreg_charlie_a1b2c3d4", GULD_ORDER_ID_RE);
});
