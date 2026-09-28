import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("keyring persists unlock session for MPA navigations", () => {
  const js = readFileSync(join(root, "src/js/lib/keyring.js"), "utf8");
  assert.match(js, /SESSION_PASS_KEY|guld\.keyring\.sessionPass/);
  assert.match(js, /sessionStorage/);
  assert.match(js, /whenReady/);
  assert.match(js, /writeSessionPass/);
});

test("chromeReady awaits keyring session restore", () => {
  const js = readFileSync(join(root, "src/js/chrome.js"), "utf8");
  assert.match(js, /chromeReady/);
  assert.match(js, /whenReady/);
});

test("wallet awaits chromeReady and confirms passphrase before send", () => {
  const js = readFileSync(join(root, "src/js/wallet-page.js"), "utf8");
  assert.match(js, /chromeReady\.then/);
  assert.match(js, /confirmKeyringPassphrase/);
  assert.match(js, /Keyring passphrase|keyringPassFieldHtml/);
});

test("profile menu does not require passphrase when unlocked", () => {
  const js = readFileSync(join(root, "src/js/lib/profile-menu.js"), "utf8");
  assert.match(js, /KEYRING_PASS_LABEL/);
  assert.match(js, /switch accounts freely/i);
  assert.match(js, /if \(!keyring\.isUnlocked\(\)\)/);
});

test("keyring-prompt exposes shared copy and confirm dialog", () => {
  const js = readFileSync(join(root, "src/js/lib/keyring-prompt.js"), "utf8");
  assert.match(js, /One passphrase encrypts all keys/);
  assert.match(js, /confirmKeyringPassphrase/);
  assert.match(js, /guld-pass-dialog/);
  assert.match(js, /readMatchingPassphrase/);
  assert.match(js, /passConfirm/);
});

test("readMatchingPassphrase requires match on create", async () => {
  const { keyringPassFieldHtml, readMatchingPassphrase } = await import(
    "../src/js/lib/keyring-prompt.js"
  );
  const html = keyringPassFieldHtml({ confirm: true, autocomplete: "new-password" });
  assert.match(html, /name="passConfirm"/);

  const fd = new FormData();
  fd.set("pass", "abcdefgh");
  fd.set("passConfirm", "abcdefgX");
  assert.throws(
    () => readMatchingPassphrase(fd, { requireConfirm: true, minlength: 8 }),
    /do not match/i,
  );
  fd.set("passConfirm", "abcdefgh");
  assert.equal(readMatchingPassphrase(fd, { requireConfirm: true, minlength: 8 }), "abcdefgh");
});

test("rotate archives previous key instead of deleting", () => {
  const kr = readFileSync(join(root, "src/guld-web-ui/js/lib/keyring.js"), "utf8");
  assert.match(kr, /archiveRotatedKey/);
  assert.match(kr, /archivedReason:\s*"rotated"/);
  const tools = readFileSync(join(root, "src/guld-web-ui/js/lib/keys-tools.js"), "utf8");
  assert.match(tools, /archiveRotatedKey/);
  const keys = readFileSync(join(root, "src/guld-web-ui/js/keys-page.js"), "utf8");
  assert.match(keys, /Archived keys/);
});

test("group register warns on personal co-signer key reuse", () => {
  const register = readFileSync(join(root, "src/guld-web-ui/js/register-page.js"), "utf8");
  assert.match(register, /groupCosignerReuseWarnings/);
  assert.match(register, /Additional public keys \(keys\[1\]/);
  assert.match(register, /keys\[0\].*generated on this device/is);
  assert.match(register, /Total signers = 1/);
  assert.match(register, /ensureGroupLeadKey/);
});

test("new keyring flows require matching passphrase confirmation", () => {
  const register = readFileSync(join(root, "src/js/register-page.js"), "utf8");
  assert.match(register, /confirm:\s*true/);
  assert.match(register, /readMatchingPassphrase/);

  const login = readFileSync(join(root, "src/js/login-page.js"), "utf8");
  assert.match(login, /confirm:\s*true/);
  assert.match(login, /readMatchingPassphrase/);

  const keys = readFileSync(join(root, "src/js/keys-page.js"), "utf8");
  assert.match(keys, /confirm:\s*true/);
  assert.match(keys, /readMatchingPassphrase/);

  const claim = readFileSync(join(root, "src/js/claim-page.js"), "utf8");
  assert.match(claim, /confirm:\s*true/);
  assert.match(claim, /Passphrases do not match/);
});
