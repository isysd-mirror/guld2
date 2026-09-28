import test from "node:test";
import assert from "node:assert/strict";
import {
  buildKeyExportPayload,
  parseKeyImport,
  renderImportKeyScanFields,
  KEY_EXPORT_PREFIX,
} from "../src/js/lib/key-export.js";
import { qrSvgDataUrl } from "../src/js/lib/qr.js";
import { cameraApiAvailable, qrDecodeAvailable } from "../src/js/lib/qr-scan.js";
import jsQR from "../src/js/vendor/jsQR.js";

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

test("renderImportKeyScanFields exposes scanner and paste fallback", () => {
  const html = renderImportKeyScanFields();
  assert.match(html, /data-import-scan-start/);
  assert.match(html, /data-import-scan-video/);
  assert.match(html, /data-import-priv/);
  assert.match(html, /Can't scan\? Paste instead/);
});

test("jsQR vendor loads; decode available without camera in Node", async () => {
  assert.equal(typeof jsQR, "function");
  assert.equal(cameraApiAvailable(), false);
  assert.equal(await qrDecodeAvailable(), true);
});
