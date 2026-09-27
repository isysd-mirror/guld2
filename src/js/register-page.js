import "./chrome.js";
import { apiGet, apiPost, faucetInfo, faucetRegister, resolveApiBase } from "./lib/api.js";
import { activateAccount } from "./lib/auth.js";
import {
  DEFAULT_MASTER_HASH,
  fromHex,
  pubkeyHex,
  randomPrivateKey,
  registerIntentMessage,
  sign,
  toHex,
} from "./lib/crypto.js";
import { resolveRegistrationDesk } from "./lib/desk.js";
import { keyring } from "./lib/keyring.js";
import { currencyTicker, loadNetworkInfo } from "./lib/network.js";
import { escapeHtml, quantaToGuld } from "./lib/rpc.js";
import { explorerPendingTxHref, extractTxId } from "./lib/tx-feedback.js";

const deskEl = document.querySelector("[data-register-desk]");
const hostEl = document.querySelector("[data-register-host]");
const stepsEl = document.querySelector("[data-register-steps]");
const titleEl = document.querySelector("[data-register-title]");
const leadEl = document.querySelector("[data-register-lead]");

const apiBase = resolveApiBase();
/** @type {string} */
let ticker = "tGULD";
const params = new URLSearchParams(location.search);
const isGroup = params.get("kind") === "group";

/** Mean block target (seconds) — same as consenus TARGET_BLOCK_INTERVAL. */
const BLOCK_INTERVAL_MIN = 10;

/** @type {{
 *   step: number,
 *   name: string,
 *   orderId: string,
 *   privHex: string,
 *   pubHex: string,
 *   extraPubs: string[],
 *   threshold: number,
 *   request: object | null,
 *   paymentUrl: string,
 *   instructions: string,
 *   desk: import("./lib/desk.js").DeskCheckout | null,
 *   pendingTxId: string,
 * }} */
let state = {
  step: 1,
  name: "",
  orderId: "",
  privHex: "",
  pubHex: "",
  extraPubs: [],
  threshold: 1,
  request: null,
  paymentUrl: "",
  instructions: "",
  desk: null,
  pendingTxId: "",
};

/**
 * Desk / peer banner above the form (not form feedback).
 * @param {string} msg
 * @param {"pending"|"ok"|"error"} [kind]
 */
function setDeskStatus(msg, kind = "pending") {
  if (!(deskEl instanceof HTMLElement)) return;
  deskEl.hidden = !msg;
  deskEl.textContent = msg;
  deskEl.dataset.state = kind;
}

/**
 * Inline status next to the current step’s submit actions.
 * @param {string} msg
 * @param {"pending"|"ok"|"error"} [kind]
 * @param {{ html?: boolean }} [opts]
 */
function say(msg, kind = "pending", opts = {}) {
  const el = hostEl?.querySelector?.("[data-panel-status]");
  if (!(el instanceof HTMLElement)) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    el.removeAttribute("data-state");
    return;
  }
  el.hidden = false;
  if (opts.html) el.innerHTML = msg;
  else el.textContent = msg;
  el.dataset.state = kind;
}

/** Markup for a status line placed just above/below submit actions. */
function statusSlot() {
  return `<p class="wallet__panel-status" data-panel-status hidden aria-live="polite"></p>`;
}

/**
 * @param {HTMLFormElement | null | undefined} form
 * @param {(form: HTMLFormElement) => Promise<void>} handler
 */
function bindBusyForm(form, handler) {
  if (!(form instanceof HTMLFormElement)) return;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    if (btn instanceof HTMLButtonElement && btn.disabled) return;
    if (btn instanceof HTMLButtonElement) {
      btn.disabled = true;
      btn.dataset.busy = "true";
    }
    try {
      await handler(form);
    } finally {
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = false;
        delete btn.dataset.busy;
      }
    }
  });
}

/**
 * @param {HTMLButtonElement | null | undefined} btn
 * @param {() => Promise<void>} handler
 */
function bindBusyClick(btn, handler) {
  if (!(btn instanceof HTMLButtonElement)) return;
  btn.addEventListener("click", async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.dataset.busy = "true";
    try {
      await handler();
    } finally {
      btn.disabled = false;
      delete btn.dataset.busy;
    }
  });
}

function setStep(n) {
  state.step = n;
  if (!(stepsEl instanceof HTMLElement)) return;
  for (const li of stepsEl.querySelectorAll("[data-step]")) {
    const step = Number(li.getAttribute("data-step"));
    li.classList.toggle("is-active", step === n);
    li.classList.toggle("is-done", step < n);
  }
}

/** Paid desk minimum length — short premium names stay protocol-valid, not desk-sold. */
const DESK_MIN_NAME_LEN = 6;

/**
 * @param {unknown} raw
 * @returns {{ name: string } | { error: string }}
 */
function parseDesiredName(raw) {
  const name = String(raw || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z][a-z0-9_-]{1,31}$/.test(name) || name.includes(".")) {
    return { error: "Invalid name (start with a letter; 2–32 chars; no dots — use subaccounts for that)." };
  }
  if (name.length < DESK_MIN_NAME_LEN) {
    return {
      error: `This desk only sells names with ${DESK_MIN_NAME_LEN}+ characters. Shorter names stay available on-chain — run a node (or find a friend sponsor) if you want one.`,
    };
  }
  return { name };
}

/**
 * @param {string} name
 * @param {string} priv
 * @param {string[]} keysHex
 * @param {number} threshold
 */
async function buildRequest(name, priv, keysHex, threshold) {
  const kind = isGroup ? "group" : "individual";
  const feeBody = await apiGet(
    apiBase,
    `/chain/fees/registration?kind=${kind}&name=${encodeURIComponent(name)}&nKeys=${keysHex.length}`,
  );
  const regFee = String(feeBody.fee || "0");
  const height = feeBody.height != null ? String(feeBody.height) : undefined;
  const endowment = "0";
  const inclusionFee = "10000";
  const intent = await registerIntentMessage(
    name,
    threshold,
    DEFAULT_MASTER_HASH,
    endowment,
    regFee,
    inclusionFee,
    keysHex,
  );
  const sig = await sign(intent, fromHex(priv));
  return {
    version: 1,
    type: isGroup ? "register_group" : "register_username",
    name,
    keys: keysHex,
    threshold,
    initial_master_hash: DEFAULT_MASTER_HASH,
    endowment,
    registration_fee: regFee,
    inclusion_fee: inclusionFee,
    height,
    registrant_signature: toHex(sig),
  };
}

async function checkAvailability(name) {
  const body = await apiGet(apiBase, `/chain/accounts/${encodeURIComponent(name)}/exists`);
  return !body.exists;
}

/**
 * @param {{ title?: string, detail?: string, txid?: string, orderId?: string, mode?: "faucet"|"friend"|"order" }} opts
 */
function waitExplorerHtml(opts = {}) {
  const name = state.name;
  const txid = opts.txid || state.pendingTxId;
  const orderId = opts.orderId || state.orderId;
  const lines = [
    `<li><a href="/explorer/#/mempool">Mempool</a> — unconfirmed txs waiting for the next block</li>`,
  ];
  if (txid && txid !== "ok") {
    const href = explorerPendingTxHref(txid);
    const short = String(txid).length > 18 ? `${String(txid).slice(0, 18)}…` : String(txid);
    lines.push(
      `<li><a href="${href}">Your unconfirmed tx</a> <code>${escapeHtml(short)}</code></li>`,
    );
  }
  lines.push(
    `<li><a href="/explorer/#/account/${encodeURIComponent(name)}">Account “${escapeHtml(name)}”</a> — live once the register tx is included</li>`,
  );
  lines.push(`<li><a href="/explorer/">Chain tip</a> — current height and recent blocks</li>`);
  if (orderId) {
    lines.push(
      `<li class="wallet__meta">Order <code>${escapeHtml(orderId)}</code></li>`,
    );
  }
  return `
    <p class="wallet__meta">${escapeHtml(opts.detail || "Waiting for on-chain inclusion.")}</p>
    <p class="wallet__note">
      Blocks target about <strong>${BLOCK_INTERVAL_MIN} minutes</strong> apart.
      After a tx is accepted, expect roughly one interval (sometimes more) before it appears in a block.
    </p>
    <p class="wallet__meta" data-wait-detail aria-live="polite">Polling…</p>
    <ul class="wallet__meta wallet__spacer--sm">${lines.join("")}</ul>
  `;
}

/**
 * @param {{ title?: string, detail?: string, txid?: string, mode?: "faucet"|"friend"|"order" }} opts
 */
function renderWaitStep(opts = {}) {
  setStep(4);
  if (opts.txid) state.pendingTxId = opts.txid;
  const title = opts.title || `Waiting for “${state.name}”`;
  hostEl.innerHTML = `
    <article class="wallet__card">
      <p class="wallet__name">${escapeHtml(state.name)}</p>
      <p class="wallet__meta">${escapeHtml(title)}</p>
      ${waitExplorerHtml(opts)}
      <p class="wallet__actions">
        <a class="btn btn--outline" href="/explorer/#/mempool">Open mempool</a>
        <a class="btn btn--outline" href="/explorer/#/account/${encodeURIComponent(state.name)}">Open account</a>
        <a class="btn btn--outline" href="/wallet/#/account/${encodeURIComponent(state.name)}">Open wallet</a>
      </p>
      ${statusSlot()}
    </article>
  `;
}

function renderStep1() {
  setStep(1);
  hostEl.innerHTML = `
    <form class="wallet__form" data-name-form>
      <label>
        Desired ${isGroup ? "group" : "user"}name
        <input name="name" type="text" autocomplete="username" spellcheck="false"
          placeholder="${isGroup ? "treasury" : "charlie"}" minlength="6" maxlength="32" required
          pattern="[a-zA-Z][a-zA-Z0-9_\\-]{5,31}" />
      </label>
      <p class="wallet__meta">6–32 characters for this paid desk; start with a letter. Shorter names are not sold here.</p>
      ${
        isGroup
          ? `<p class="wallet__note">Group fee is <code>F_user(L) × (2 + n)</code> where <code>n</code> is signer count — set keys on the next step.</p>`
          : ""
      }
      <p class="wallet__actions wallet__actions--flush">
        <button type="submit" class="btn btn--primary">Check availability</button>
      </p>
      ${statusSlot()}
    </form>
    <p class="wallet__note">
      ${
        isGroup
          ? `<a href="/register/">Register an individual name instead</a>`
          : `<a href="/register/?kind=group">Create a group name instead</a>`
      }
      · Already have a key? <a href="/login/">Log in</a>.
    </p>
  `;
  bindBusyForm(hostEl.querySelector("[data-name-form]"), async (form) => {
    const fd = new FormData(form);
    const parsed = parseDesiredName(fd.get("name"));
    if ("error" in parsed) {
      say(parsed.error, "error");
      return;
    }
    const name = parsed.name;
    say("Checking…", "pending");
    try {
      const free = await checkAvailability(name);
      if (!free) {
        say(`“${name}” is taken. Try another.`, "error");
        return;
      }
      state.name = name;
      if (isGroup) {
        say(`“${name}” is available — add signers next.`, "ok");
        renderStepKeys();
      } else {
        const fee = await apiGet(
          apiBase,
          `/chain/fees/registration?kind=individual&name=${encodeURIComponent(name)}`,
        );
        say(
          `“${name}” is available · on-chain fee ≈ ${String(fee.feeGuld ?? quantaToGuld(fee.fee))} ${currencyTicker()} (paid by your sponsor).`,
          "ok",
        );
        renderStepPassphrase();
      }
    } catch (err) {
      say(/** @type {Error} */ (err).message, "error");
    }
  });
}

function renderStepKeys() {
  setStep(2);
  hostEl.innerHTML = `
    <article class="wallet__card">
      <p class="wallet__name">${escapeHtml(state.name)}</p>
      <p class="wallet__meta">This device generates keys[0]. Paste additional co-signer public keys (0x…), one per line.</p>
      <form class="wallet__form" data-keys-form>
        <label>
          Additional public keys
          <textarea name="pubs" rows="4" spellcheck="false" placeholder="0x…&#10;0x…"></textarea>
        </label>
        <label>
          Threshold (signatures required)
          <input name="threshold" type="number" min="1" value="2" required />
        </label>
        <p class="wallet__meta" data-fee-preview>Fee updates after continue…</p>
        <p class="wallet__actions wallet__actions--flush">
          <button type="submit" class="btn btn--primary">Continue</button>
          <button type="button" class="btn btn--outline" data-back>Back</button>
        </p>
        ${statusSlot()}
      </form>
    </article>
  `;
  hostEl.querySelector("[data-back]")?.addEventListener("click", () => renderStep1());
  bindBusyForm(hostEl.querySelector("[data-keys-form]"), async (form) => {
    const fd = new FormData(form);
    const lines = String(fd.get("pubs") || "")
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((h) => (h.startsWith("0x") ? h.toLowerCase() : `0x${h.toLowerCase()}`));
    for (const h of lines) {
      if (!/^0x[0-9a-f]{64}$/.test(h)) {
        say(`Invalid pubkey: ${h.slice(0, 18)}…`, "error");
        return;
      }
    }
    const n = 1 + lines.length;
    let threshold = Number(fd.get("threshold") || 1);
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > n) {
      say(`Threshold must be 1…${n}`, "error");
      return;
    }
    state.extraPubs = lines;
    state.threshold = threshold;
    say("Estimating fee…", "pending");
    try {
      const fee = await apiGet(
        apiBase,
        `/chain/fees/registration?kind=group&name=${encodeURIComponent(state.name)}&nKeys=${n}`,
      );
      say(
        `Group · ${n} keys · ${threshold}-of-${n} · fee ≈ ${fee.feeGuld ?? quantaToGuld(fee.fee)} ${currencyTicker()}/yr`,
        "ok",
      );
      renderStepPassphrase();
    } catch (err) {
      say(/** @type {Error} */ (err).message, "error");
    }
  });
}

function renderStepPassphrase() {
  setStep(2);
  const stored = keyring.load().accounts;
  const existing = stored.length > 0;
  const alreadyOpen = keyring.isUnlocked();
  const names = stored.map((a) => a.name).filter(Boolean);

  let body = "";
  if (alreadyOpen) {
    body = `
      <p class="wallet__meta">Keyring is unlocked — new keys will be saved with your current passphrase.</p>
      ${
        isGroup
          ? `<p class="wallet__meta">${state.threshold}-of-${1 + state.extraPubs.length} · you hold keys[0]</p>`
          : ""
      }
      <p class="wallet__actions wallet__actions--flush">
        <button type="button" class="btn btn--primary" data-gen-unlocked>Generate keys &amp; continue</button>
        <button type="button" class="btn btn--outline" data-back>Back</button>
      </p>
      ${statusSlot()}`;
  } else if (existing) {
    body = `
      <p class="wallet__meta">This browser already has encrypted keys${
        names.length ? ` (${names.map((n) => escapeHtml(n)).join(", ")})` : ""
      }. Unlock with that passphrase to add “${escapeHtml(state.name)}”.</p>
      ${
        isGroup
          ? `<p class="wallet__meta">${state.threshold}-of-${1 + state.extraPubs.length} · you hold keys[0]</p>`
          : ""
      }
      <form class="wallet__form" data-key-form>
        <label>
          Existing passphrase
          <input name="pass" type="password" autocomplete="current-password" minlength="8" required />
        </label>
        <p class="wallet__actions wallet__actions--flush">
          <button type="submit" class="btn btn--primary">Unlock &amp; generate keys</button>
          <button type="button" class="btn btn--outline" data-back>Back</button>
        </p>
        ${statusSlot()}
      </form>
      <p class="wallet__note">
        Forgot it? You can clear the local keyring and choose a new passphrase.
        On-chain names stay registered — re-import their private keys later if you still have them.
      </p>
      <p class="wallet__actions">
        <button type="button" class="btn btn--outline" data-clear-keyring>Clear keyring on this browser</button>
      </p>`;
  } else {
    body = `
      <p class="wallet__meta">Choose a passphrase to encrypt your key in this browser. It never leaves your device.</p>
      ${
        isGroup
          ? `<p class="wallet__meta">${state.threshold}-of-${1 + state.extraPubs.length} · you hold keys[0]</p>`
          : ""
      }
      <form class="wallet__form" data-key-form>
        <label>
          Passphrase
          <input name="pass" type="password" autocomplete="new-password" minlength="8" required />
        </label>
        <p class="wallet__actions wallet__actions--flush">
          <button type="submit" class="btn btn--primary">Generate keys &amp; continue</button>
          <button type="button" class="btn btn--outline" data-back>Back</button>
        </p>
        ${statusSlot()}
      </form>`;
  }

  hostEl.innerHTML = `
    <article class="wallet__card">
      <p class="wallet__name">${escapeHtml(state.name)}</p>
      ${body}
    </article>
  `;

  hostEl.querySelector("[data-back]")?.addEventListener("click", () => {
    if (isGroup) renderStepKeys();
    else renderStep1();
  });

  bindBusyClick(/** @type {HTMLButtonElement | null} */ (hostEl.querySelector("[data-clear-keyring]")), async () => {
    if (
      !confirm(
        "Clear all Guld keys stored in this browser? You will need the private keys to use those names again here.",
      )
    ) {
      return;
    }
    keyring.clearAll();
    renderStepPassphrase();
    say("Local keyring cleared — choose a new passphrase.", "ok");
  });

  async function finishWithKeys() {
    say("Generating keys…", "pending");
    const priv = await randomPrivateKey();
    const pubHex = await pubkeyHex(priv);
    const privHex = toHex(priv);
    const keys = isGroup ? [pubHex, ...state.extraPubs] : [pubHex];
    const threshold = isGroup ? state.threshold : 1;
    const request = await buildRequest(state.name, privHex, keys, threshold);
    await keyring.upsertAccount({
      name: state.name,
      privHex,
      pubHex,
      pending: true,
    });
    activateAccount(state.name);
    state.privHex = privHex;
    state.pubHex = pubHex;
    state.request = request;
    renderStepConfirm();
  }

  bindBusyClick(/** @type {HTMLButtonElement | null} */ (hostEl.querySelector("[data-gen-unlocked]")), async () => {
    try {
      await finishWithKeys();
    } catch (err) {
      say(/** @type {Error} */ (err).message, "error");
    }
  });

  bindBusyForm(hostEl.querySelector("[data-key-form]"), async (form) => {
    say(existing ? "Unlocking keyring…" : "Generating keys…", "pending");
    try {
      const fd = new FormData(form);
      const pass = String(fd.get("pass") || "");
      if (!pass) throw new Error("Passphrase required");
      await keyring.unlock(pass);
      await finishWithKeys();
    } catch (err) {
      say(/** @type {Error} */ (err).message, "error");
    }
  });
}

function renderStepConfirm() {
  setStep(3);
  const req = /** @type {Record<string, unknown>} */ (state.request || {});
  const regFeeGuld = quantaToGuld(String(req.registration_fee || "0"));
  const keys = /** @type {string[]} */ (req.keys || []);
  hostEl.innerHTML = `
    <article class="wallet__card">
      <p class="wallet__name">${escapeHtml(state.name)}</p>
      <p class="wallet__meta">Confirm — a sponsor pays the on-chain fee in ${ticker}.</p>
      <ul class="wallet__meta">
        <li>Type: <strong>${isGroup ? "group" : "individual"}</strong></li>
        <li>Registration fee: <strong>${escapeHtml(regFeeGuld)} ${ticker}</strong> / year (to block miner)</li>
        <li>Threshold: ${escapeHtml(String(req.threshold))} of ${keys.length}</li>
        <li>Endowment: ${escapeHtml(quantaToGuld(String(req.endowment || "0")))} ${ticker}</li>
        <li>Your public key (keys[0]): <code>${escapeHtml(state.pubHex)}</code></li>
      </ul>
      <label class="wallet__meta">Registration request (friend sponsor)
        <textarea readonly rows="6" data-req-json>${escapeHtml(JSON.stringify(req, null, 2))}</textarea>
      </label>
      <p class="wallet__actions wallet__spacer--sm">
        <button type="button" class="btn btn--outline" data-copy-req>Copy request JSON</button>
      </p>
      <p class="wallet__note">Your encrypted key stays on this device. ${ticker} has no fixed USD price — any off-chain desk fee is set by that operator, not the protocol.</p>
      <p data-faucet-slot></p>
      <p class="wallet__actions">
        <button type="button" class="btn btn--primary" data-faucet-register-placeholder hidden>Register via faucet</button>
        <button type="button" class="btn btn--outline" data-confirm-register>Continue with paid desk</button>
        <button type="button" class="btn btn--outline" data-friend-only>Friend sponsor only</button>
        <button type="button" class="btn btn--outline" data-back>Back</button>
      </p>
      ${statusSlot()}
    </article>
  `;
  const faucetSlot = hostEl.querySelector("[data-faucet-slot]");
  void faucetInfo(apiBase)
    .then((info) => {
      if (!(faucetSlot instanceof HTMLElement)) return;
      if (!info?.ready) return;
      faucetSlot.innerHTML = `
        <p class="wallet__note">
          <strong>Testnet faucet</strong> — this peer can sponsor you in ${ticker} (no off-chain payment). Cooldown applies.
        </p>
      `;
      const faucetBtn = hostEl.querySelector("[data-faucet-register-placeholder]");
      if (faucetBtn instanceof HTMLButtonElement) {
        faucetBtn.hidden = false;
        faucetBtn.textContent = "Register via faucet";
        faucetBtn.className = "btn btn--primary";
        faucetBtn.removeAttribute("data-faucet-register-placeholder");
        faucetBtn.dataset.faucetRegister = "";
        bindBusyClick(faucetBtn, async () => {
          say("Requesting faucet sponsorship…", "pending");
          try {
            const out = await faucetRegister(apiBase, req);
            const txid = extractTxId(out) || "ok";
            renderWaitStep({
              mode: "faucet",
              txid,
              title: "Faucet broadcast your registration",
              detail: "Unconfirmed in the mempool — open the explorer links below; this page also watches for inclusion.",
            });
            say("Submitted — unconfirmed in the mempool.", "ok");
            void pollNameOnly();
          } catch (err) {
            say(/** @type {Error} */ (err).message, "error");
          }
        });
      }
    })
    .catch(() => {});
  hostEl.querySelector("[data-back]")?.addEventListener("click", () => renderStepPassphrase());
  bindBusyClick(/** @type {HTMLButtonElement | null} */ (hostEl.querySelector("[data-copy-req]")), async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(req, null, 2));
      say("Request copied — send to a funded friend (Wallet → Advanced → Sponsor a name).", "ok");
    } catch {
      say("Select the textarea and copy manually.", "pending");
    }
  });
  hostEl.querySelector("[data-friend-only]")?.addEventListener("click", () => {
    renderWaitStep({
      mode: "friend",
      title: "Waiting for a friend to sponsor",
      detail:
        "Ask a funded friend to paste the request JSON under Wallet → Advanced → Sponsor a name. Then watch the mempool / your account in the explorer.",
    });
    const card = hostEl.querySelector(".wallet__card");
    card?.insertAdjacentHTML(
      "beforeend",
      `<label class="wallet__meta wallet__spacer">Request JSON
        <textarea readonly rows="6">${escapeHtml(JSON.stringify(req, null, 2))}</textarea>
      </label>`,
    );
    say("Waiting for sponsor broadcast…", "pending");
    void pollNameOnly();
  });
  bindBusyClick(/** @type {HTMLButtonElement | null} */ (hostEl.querySelector("[data-confirm-register]")), async () => {
    say("Creating payment order…", "pending");
    try {
      await createOrderAndPay();
    } catch (err) {
      say(/** @type {Error} */ (err).message, "error");
    }
  });
}

async function createOrderAndPay() {
  setStep(3);
  const order = await apiPost(apiBase, "/registrar/orders", {
    name: state.name,
    request: state.request,
    pubKey: state.pubHex,
  });
  state.orderId = order.id;

  const desk =
    state.desk ||
    (await resolveRegistrationDesk(apiBase)) || {
      source: "peer",
      paymentLink: "",
      feeUsd: 10,
      sponsor: null,
      apiKey: "",
    };
  state.desk = desk;

  let checkout;
  try {
    checkout = await apiPost(
      apiBase,
      "/registrar/checkout",
      {
        orderId: state.orderId,
        returnUrl: `${location.origin}/register/?order=${encodeURIComponent(state.orderId)}${isGroup ? "&kind=group" : ""}`,
        fiatAmount: String(desk.feeUsd),
        paymentLink: desk.paymentLink || undefined,
        feeUsd: desk.feeUsd,
      },
      desk.apiKey ? { headers: { "X-Paymento-Api-Key": desk.apiKey } } : {},
    );
  } catch (err) {
    if (!desk.paymentLink) throw err;
    checkout = {
      mode: "payment_link",
      orderId: state.orderId,
      paymentUrl: desk.paymentLink,
      feeUsd: desk.feeUsd,
      instructions: `When paying, enter Order ID “${state.orderId}” as your name so we can match the payment to “${state.name}”.`,
    };
  }
  state.paymentUrl = checkout.paymentUrl;
  state.instructions = checkout.instructions || "";
  renderStep3(checkout, desk);
}

/**
 * @param {Record<string, unknown>} checkout
 * @param {import("./lib/desk.js").DeskCheckout} desk
 */
function renderStep3(checkout, desk) {
  setStep(3);
  const who =
    desk.source === "invite"
      ? `Paying sponsor desk${desk.sponsor ? ` (${desk.sponsor})` : ""} via invite`
      : desk.source === "local"
        ? "Paying your local OTC desk"
        : "Paying this peer’s bootstrap desk";
  const feeLabel =
    checkout.feeUsd != null || desk.feeUsd != null
      ? `Desk asking price: $${escapeHtml(String(checkout.feeUsd ?? desk.feeUsd))} (operator-set, not a ${ticker} market price)`
      : "Continue to this desk’s payment link";
  hostEl.innerHTML = `
    <article class="wallet__card">
      <p class="wallet__name">${feeLabel}</p>
      <p class="wallet__meta">${escapeHtml(who)}</p>
      <p class="wallet__meta">Order <code>${escapeHtml(state.orderId)}</code> · name <strong>${escapeHtml(state.name)}</strong></p>
      ${
        state.instructions
          ? `<p class="wallet__note">${escapeHtml(state.instructions)}</p>`
          : `<p class="wallet__meta">Payment is matched by this Order ID automatically when using the gateway API.</p>`
      }
      <p class="wallet__note">On-chain registration is still paid in ${ticker} by the sponsoring account after payment clears (~${BLOCK_INTERVAL_MIN} min per block).</p>
      <p class="wallet__actions">
        <a class="btn btn--primary" href="${escapeHtml(state.paymentUrl)}" rel="noopener" target="_blank" data-pay>Open payment link</a>
        <button type="button" class="btn btn--outline" data-paid>I’ve paid — continue</button>
      </p>
      ${statusSlot()}
    </article>
  `;
  hostEl.querySelector("[data-paid]")?.addEventListener("click", () => {
    renderWaitStep({
      mode: "order",
      orderId: state.orderId,
      title: "Waiting for payment and registration",
      detail: "Watch the order status below. After the registrar signs, the tx is unconfirmed in the mempool until the next block.",
    });
    say("Waiting for payment confirmation…", "pending");
    void pollUntilRegistered();
  });
}

function renderStep4() {
  renderWaitStep({
    mode: "order",
    orderId: state.orderId,
    title: "Waiting for payment and registration",
    detail: "Resuming order — payment, registrar signature, then ~10 min block inclusion.",
  });
  say("Polling for payment and on-chain registration…", "pending");
  void pollUntilRegistered();
}

async function markRegistered() {
  const privHex = keyring.getPriv(state.name) || state.privHex;
  if (privHex && keyring.isUnlocked()) {
    await keyring.upsertAccount({
      name: state.name,
      privHex,
      pubHex: state.pubHex,
      pending: false,
    });
  }
  activateAccount(state.name);
  say(`“${state.name}” is registered. Welcome.`, "ok");
}

async function pollNameOnly() {
  const detail = hostEl.querySelector("[data-wait-detail]");
  for (let i = 0; i < 90; i++) {
    try {
      if ((await checkAvailability(state.name)) === false) {
        await markRegistered();
        if (detail) detail.textContent = "Registered on-chain.";
        hostEl.insertAdjacentHTML(
          "beforeend",
          `<p class="wallet__actions">
            <a class="btn btn--primary" href="/wallet/#/account/${encodeURIComponent(state.name)}">Open wallet</a>
            <a class="btn btn--outline" href="/explorer/#/account/${encodeURIComponent(state.name)}">View in explorer</a>
          </p>`,
        );
        return;
      }
    } catch {
      /* keep polling */
    }
    if (detail) {
      detail.textContent = `Still unconfirmed… check ${i + 1} · blocks ~${BLOCK_INTERVAL_MIN} min apart`;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  say(
    `Still waiting — open the mempool or account in the explorer, or check your wallet after the next ~${BLOCK_INTERVAL_MIN} min block.`,
    "pending",
  );
}

async function pollUntilRegistered() {
  const detail = hostEl.querySelector("[data-wait-detail]");
  for (let i = 0; i < 90; i++) {
    try {
      const order = await apiGet(apiBase, `/registrar/orders/${encodeURIComponent(state.orderId)}`);
      const status = order.status;
      if (detail) {
        detail.textContent = `Order status: ${status.replace(/_/g, " ")} · check ${i + 1}`;
      }
      if (status === "registered" || (await checkAvailability(state.name)) === false) {
        await markRegistered();
        if (detail) detail.textContent = "Registered on-chain.";
        hostEl.insertAdjacentHTML(
          "beforeend",
          `<p class="wallet__note wallet__spacer">
            Next: open <a href="/settings/">Settings</a> to link <strong>your</strong> Paymento store
            and sell ${ticker} to friends (OTC desk). Then share your invite link from Settings.
          </p>
          <p class="wallet__actions">
            <a class="btn btn--primary" href="/wallet/#/account/${encodeURIComponent(state.name)}">Open wallet</a>
            <a class="btn btn--outline" href="/explorer/#/account/${encodeURIComponent(state.name)}">View in explorer</a>
          </p>`,
        );
        return;
      }
      if (status === "payment_received") {
        say("Payment received — waiting for the registrar to sign…", "ok");
      } else if (status === "payment_processing") {
        say("Payment processing…", "pending");
      }
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  say(
    `Still waiting — check the mempool and your account in the explorer, or return to the wallet after the next block (~${BLOCK_INTERVAL_MIN} min).`,
    "pending",
  );
}

async function boot() {
  if (titleEl) titleEl.textContent = isGroup ? "Create a group" : "Sign up";

  const net = await loadNetworkInfo(apiBase);
  ticker = currencyTicker(net);
  const faucetReady = Boolean(net.faucet?.ready);
  if (leadEl) {
    if (isGroup) {
      leadEl.innerHTML = `Choose an available <strong>group</strong> name, set co-signer keys and threshold, then get sponsored (faucet, friend, or optional paid desk). On-chain fee scales with signer count.`;
    } else if (faucetReady) {
      leadEl.innerHTML = `Choose an available name and generate keys here. On <strong>testnet</strong>, this peer’s faucet can sponsor you in ${ticker} — or use a friend / optional paid desk.`;
    } else {
      leadEl.innerHTML = `Choose an available name and generate keys here. A funded sponsor pays the on-chain fee in ${ticker} (friend JSON, or an optional paid desk if this peer lists one).`;
    }
  }

  try {
    state.desk = await resolveRegistrationDesk(apiBase);
    if (faucetReady) {
      setDeskStatus(
        net.network
          ? `Testnet faucet ready on ${net.network} — you can register without off-chain payment.`
          : "Testnet faucet ready — you can register without off-chain payment.",
        "ok",
      );
    } else if (state.desk) {
      const label =
        state.desk.source === "invite"
          ? `Invite desk${state.desk.sponsor ? ` · ${state.desk.sponsor}` : ""}`
          : state.desk.source === "local"
            ? "Your OTC desk"
            : "Peer bootstrap desk";
      const fee =
        state.desk.feeUsd != null
          ? ` · operator asks $${state.desk.feeUsd} off-chain`
          : "";
      setDeskStatus(`${label}${fee}`, "ok");
    } else {
      setDeskStatus(
        "No paid desk on this peer — use friend sponsor (copy request JSON), or wait for a faucet-enabled testnet peer.",
        "pending",
      );
    }
  } catch (err) {
    setDeskStatus(/** @type {Error} */ (err).message, "error");
  }

  const orderId = params.get("order");
  if (orderId) {
    try {
      const order = await apiGet(apiBase, `/registrar/orders/${encodeURIComponent(orderId)}`);
      state.orderId = order.id;
      state.name = order.name;
      state.request = order.request || null;
      const acct = keyring.getAccount(order.name);
      if (acct) {
        state.privHex = keyring.getPriv(order.name) || "";
        state.pubHex = acct.pubHex;
      }
      renderStep4();
      return;
    } catch {
      /* fall through to step 1 */
    }
  }
  renderStep1();
}

boot();
