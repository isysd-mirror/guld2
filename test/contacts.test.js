import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPrivateInviteMessage,
  buildPrivateInviteUrl,
  normalizeContact,
  parseContactsCsv,
  parseInviteHints,
} from "../src/js/lib/contacts.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("normalizeContact migrates v1 name/alias fields", () => {
  const c = normalizeContact({ name: "Bob", alias: "Bobby", favorite: true });
  assert.equal(c.guldName, "bob");
  assert.equal(c.displayName, "Bobby");
  assert.equal(c.favorite, true);
  assert.ok(c.id);
});

test("buildPrivateInviteUrl uses offer= not sponsor=", () => {
  const withOffer = buildPrivateInviteUrl({
    from: "alice",
    offerSponsor: true,
    origin: "https://guld.io",
  });
  assert.match(withOffer, /from=alice/);
  assert.match(withOffer, /offer=1/);
  assert.doesNotMatch(withOffer, /sponsor=/);

  const desk = buildPrivateInviteUrl({
    from: "alice",
    offerSponsor: false,
    pay: "https://pay.example/link",
    origin: "https://guld.io",
  });
  assert.match(desk, /offer=0/);
  assert.match(desk, /pay=/);
  assert.doesNotMatch(desk, /sponsor=/);
});

test("parseInviteHints reads offer and from", () => {
  assert.deepEqual(parseInviteHints("?from=Alice&offer=1"), {
    from: "alice",
    offerSponsor: true,
    pay: null,
  });
  assert.deepEqual(parseInviteHints("from=bob&offer=0&pay=https://x.test/p"), {
    from: "bob",
    offerSponsor: false,
    pay: "https://x.test/p",
  });
  assert.deepEqual(parseInviteHints(""), {
    from: null,
    offerSponsor: null,
    pay: null,
  });
});

test("buildPrivateInviteMessage mentions from when sponsoring", () => {
  const msg = buildPrivateInviteMessage({
    from: "alice",
    offerSponsor: true,
    url: "https://guld.io/register/?from=alice&offer=1",
  });
  assert.match(msg, /alice/);
  assert.match(msg, /sponsor/i);
  assert.match(msg, /https:\/\/guld\.io\/register/);
});

test("parseContactsCsv reads header and bare rows", () => {
  const withHeader = parseContactsCsv(
    "displayName,email,phone,guldName,labels\nBob,bob@ex.com,555,bob,friends",
  );
  assert.equal(withHeader.length, 1);
  assert.equal(withHeader[0].displayName, "Bob");
  assert.equal(withHeader[0].guldName, "bob");
  assert.deepEqual(withHeader[0].emails, ["bob@ex.com"]);

  const bare = parseContactsCsv("Carol,carol@ex.com,,carol,work");
  assert.equal(bare[0].displayName, "Carol");
  assert.equal(bare[0].guldName, "carol");
});

test("contacts page and register consume invite surface", () => {
  const page = readFileSync(join(root, "src/js/contacts-page.js"), "utf8");
  assert.match(page, /buildPrivateInviteUrl/);
  assert.match(page, /Offer to sponsor/);

  const reg = readFileSync(join(root, "src/js/register-page.js"), "utf8");
  assert.match(reg, /parseInviteHints/);
  assert.match(reg, /inviteHints/);
  assert.match(reg, /paintInviteBanner|inviteBanner/);

  const html = readFileSync(join(root, "contacts/index.html"), "utf8");
  assert.match(html, /contacts-page\.js/);

  const settings = readFileSync(join(root, "src/js/settings-page.js"), "utf8");
  assert.match(settings, /CONTACTS_HREF/);
  assert.doesNotMatch(settings, /contactName/);
});
