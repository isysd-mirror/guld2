import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  keysCosignHref,
  keysPageHref,
  keysSponsorHref,
  packUrlParam,
  unpackUrlParam,
} from "../src/js/lib/deep-link.js";

describe("deep-link URL helpers", () => {
  it("packUrlParam / unpackUrlParam round-trip JSON", () => {
    const obj = { req: { v: 1, name: "treasury", op: "transfer" }, sigs: { "0": "0xab" } };
    const packed = packUrlParam(obj);
    assert.match(packed, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(unpackUrlParam(packed), obj);
  });

  it("keysPageHref builds cosign and sponsor query + hash", () => {
    const req = { v: 1, type: "guld1cosignreq", name: "treasury", op: "transfer" };
    const href = keysPageHref({ cosign: { req, sigs: {} }, panel: "cosign", origin: "https://guld.io" });
    assert.equal(href.startsWith("/keys/?cosign="), true);
    assert.equal(href.endsWith("#cosign"), true);
    const u = new URL(href, "https://guld.io");
    const bag = /** @type {{ req: unknown }} */ (unpackUrlParam(u.searchParams.get("cosign")));
    assert.deepEqual(bag.req, req);
  });

  it("keysCosignHref and keysSponsorHref", () => {
    const req = { v: 1, type: "guld1cosignreq", name: "treasury", op: "update_master" };
    const cosignHref = keysCosignHref(req, new Map([[1, "0xsig"]]));
    assert.match(cosignHref, /#cosign$/);
    const cosignUrl = new URL(cosignHref, "https://dev.example");
    const cosignBag = /** @type {{ sigs: Record<string, string> }} */ (
      unpackUrlParam(cosignUrl.searchParams.get("cosign"))
    );
    assert.equal(cosignBag.sigs["1"], "0xsig");

    const reg = { version: 1, type: "register_username", name: "charlie", keys: ["0x01"] };
    const sponsorHref = keysSponsorHref(reg);
    assert.match(sponsorHref, /#sponsor$/);
    const sponsorUrl = new URL(sponsorHref, "https://guld.io");
    assert.deepEqual(unpackUrlParam(sponsorUrl.searchParams.get("sponsor")), reg);
  });
});
