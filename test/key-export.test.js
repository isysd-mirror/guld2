import test from "node:test";
import assert from "node:assert/strict";
import {
  buildKeyExportPayload,
  parseKeyImport,
  KEY_EXPORT_PREFIX,
} from "../src/js/lib/key-export.js";
import { qrSvgDataUrl } from "../src/js/lib/qr.js";

test("buildKeyExportPayload uses guld1key prefix", () => {
  const payload = buildKeyExportPayload("alice", "0xabc");
  assert.match(payload, new RegExp(`^${KEY_EXPORT_PREFIX}`));
  assert.deepEqual(JSON.parse(payload.slice(KEY_EXPORT_PREFIX.length)), {
    name: "alice",
    priv: "0xabc",
  });
});

test("parseKeyImport accepts export payload and raw hex", () => {
  const payload = buildKeyExportPayload("Bob", "0xdead");
  assert.deepEqual(parseKeyImport(payload), { name: "bob", privHex: "0xdead" });
  assert.deepEqual(parseKeyImport("deadbeef"), { name: null, privHex: "0xdeadbeef" });
  assert.deepEqual(parseKeyImport('{"name":"carol","priv":"0x01"}'), {
    name: "carol",
    privHex: "0x01",
  });
});

test("qrSvgDataUrl returns svg data url", () => {
  const url = qrSvgDataUrl("guld1key:test");
  assert.match(url, /^data:image\/svg\+xml,/);
  assert.match(decodeURIComponent(url), /<svg/);
});
