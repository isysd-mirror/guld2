import "./chrome.js";
import { apiGet, apiPost, resolveApiBase } from "./lib/api.js";
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
import { escapeHtml, quantaToGuld } from "./lib/rpc.js";

const statusEl = document.querySelector("[data-register-status]");
const hostEl = document.querySelector("[data-register-host]");
const stepsEl = document.querySelector("[data-register-steps]");
const titleEl = document.querySelector("[data-register-title]");
const leadEl = document.querySelector("[data-register-lead]");

const apiBase = resolveApiBase();
const params = new URLSearchParams(location.search);
const isGroup = params.get("kind") === "group";

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
};

/**
 * @param {string} msg
 * @param {"pending"|"ok"|"error"} [kind]
 */
function setStatus(msg, kind = "pending") {
  if (!(statusEl instanceof HTMLElement)) return;
  statusEl.textContent = msg;
  statusEl.dataset.state = kind;
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
      <button type="submit" class="btn btn--primary">Check availability</button>
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
  const form = hostEl.querySelector("[data-name-form]");
  form?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(/** @type {HTMLFormElement} */ (form));
    const parsed = parseDesiredName(fd.get("name"));
    if ("error" in parsed) {
      setStatus(parsed.error, "error");
      return;
    }
    const name = parsed.name;
    setStatus("Checking…");
    try {
      const free = await checkAvailability(name);
      if (!free) {
        setStatus(`“${name}” is taken. Try another.`, "error");
        return;
      }
      state.name = name;
      if (isGroup) {
        setStatus(`“${name}” is available — add signers next.`, "ok");
        renderStepKeys();
      } else {
        const fee = await apiGet(
          apiBase,
          `/chain/fees/registration?kind=individual&name=${encodeURIComponent(name)}`,
        );
        setStatus(
          `“${name}” is available · on-chain fee ≈ ${escapeHtml(String(fee.feeGuld ?? quantaToGuld(fee.fee)))} GULD (paid by sponsor) + $10 fiat desk fee.`,
          "ok",
        );
        renderStepPassphrase();
      }
    } catch (err) {
      setStatus(/** @type {Error} */ (err).message, "error");
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
        <button type="submit" class="btn btn--primary">Continue</button>
        <button type="button" class="btn btn--outline" data-back style="margin-left:0.5rem">Back</button>
      </form>
    </article>
  `;
  hostEl.querySelector("[data-back]")?.addEventListener("click", () => renderStep1());
  hostEl.querySelector("[data-keys-form]")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
    const lines = String(fd.get("pubs") || "")
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((h) => (h.startsWith("0x") ? h.toLowerCase() : `0x${h.toLowerCase()}`));
    for (const h of lines) {
      if (!/^0x[0-9a-f]{64}$/.test(h)) {
        setStatus(`Invalid pubkey: ${h.slice(0, 18)}…`, "error");
        return;
      }
    }
    const n = 1 + lines.length;
    let threshold = Number(fd.get("threshold") || 1);
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > n) {
      setStatus(`Threshold must be 1…${n}`, "error");
      return;
    }
    state.extraPubs = lines;
    state.threshold = threshold;
    try {
      const fee = await apiGet(
        apiBase,
        `/chain/fees/registration?kind=group&name=${encodeURIComponent(state.name)}&nKeys=${n}`,
      );
      setStatus(
        `Group · ${n} keys · ${threshold}-of-${n} · fee ≈ ${fee.feeGuld ?? quantaToGuld(fee.fee)} GULD/yr`,
        "ok",
      );
      renderStepPassphrase();
    } catch (err) {
      setStatus(/** @type {Error} */ (err).message, "error");
    }
  });
}

function renderStepPassphrase() {
  setStep(2);
  hostEl.innerHTML = `
    <article class="wallet__card">
      <p class="wallet__name">${escapeHtml(state.name)}</p>
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
        <button type="submit" class="btn btn--primary">Generate keys &amp; continue</button>
        <button type="button" class="btn btn--outline" data-back style="margin-left:0.5rem">Back</button>
      </form>
    </article>
  `;
  hostEl.querySelector("[data-back]")?.addEventListener("click", () => {
    if (isGroup) renderStepKeys();
    else renderStep1();
  });
  hostEl.querySelector("[data-key-form]")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setStatus("Generating keys…");
    try {
      const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
      const pass = String(fd.get("pass") || "");
      if (!pass) throw new Error("Passphrase required");
      const priv = await randomPrivateKey();
      const pubHex = await pubkeyHex(priv);
      const privHex = toHex(priv);
      await keyring.unlock(pass);
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
      setStatus("Review registration terms", "ok");
      renderStepConfirm();
    } catch (err) {
      setStatus(/** @type {Error} */ (err).message, "error");
    }
  });
}

function renderStepConfirm() {
  setStep(2);
  const req = /** @type {Record<string, unknown>} */ (state.request || {});
  const regFeeGuld = quantaToGuld(String(req.registration_fee || "0"));
  const keys = /** @type {string[]} */ (req.keys || []);
  hostEl.innerHTML = `
    <article class="wallet__card">
      <p class="wallet__name">${escapeHtml(state.name)}</p>
      <p class="wallet__meta">Confirm before payment — sponsor pays the on-chain fee.</p>
      <ul class="wallet__meta">
        <li>Type: <strong>${isGroup ? "group" : "individual"}</strong></li>
        <li>Registration fee: <strong>${escapeHtml(regFeeGuld)} GULD</strong> / year (to block miner)</li>
        <li>Threshold: ${escapeHtml(String(req.threshold))} of ${keys.length}</li>
        <li>Endowment: ${escapeHtml(quantaToGuld(String(req.endowment || "0")))} GULD</li>
        <li>Your public key (keys[0]): <code>${escapeHtml(state.pubHex)}</code></li>
      </ul>
      <label class="wallet__meta">Registration request (friend sponsor)
        <textarea readonly rows="6" data-req-json>${escapeHtml(JSON.stringify(req, null, 2))}</textarea>
      </label>
      <p style="margin-top:0.5rem">
        <button type="button" class="btn btn--outline" data-copy-req>Copy request JSON</button>
      </p>
      <p class="wallet__note">Your encrypted key stays on this device. Fiat desk fee is separate from the on-chain fee.</p>
      <button type="button" class="btn btn--primary" data-confirm-register>Confirm &amp; pay desk</button>
      <button type="button" class="btn btn--outline" data-friend-only style="margin-left:0.5rem">Friend sponsor only</button>
      <button type="button" class="btn btn--outline" data-back style="margin-left:0.5rem">Back</button>
    </article>
  `;
  hostEl.querySelector("[data-back]")?.addEventListener("click", () => renderStepPassphrase());
  hostEl.querySelector("[data-copy-req]")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(req, null, 2));
      setStatus("Request copied — send to a funded friend to sponsor.", "ok");
    } catch {
      setStatus("Select the textarea and copy manually.", "pending");
    }
  });
  hostEl.querySelector("[data-friend-only]")?.addEventListener("click", () => {
    setStatus(
      "Ask a funded friend to paste this JSON under Wallet → Sponsor a name. Then open your wallet and wait.",
      "ok",
    );
    setStep(4);
    hostEl.innerHTML = `
      <article class="wallet__card">
        <p class="wallet__name">${escapeHtml(state.name)}</p>
        <p class="wallet__meta">Waiting for a friend to sponsor your registration request.</p>
        <label class="wallet__meta">Request JSON
          <textarea readonly rows="8">${escapeHtml(JSON.stringify(req, null, 2))}</textarea>
        </label>
        <p style="margin-top:1rem">
          <a class="btn btn--outline" href="/wallet/#/account/${encodeURIComponent(state.name)}">Open wallet</a>
        </p>
      </article>`;
    pollNameOnly();
  });
  hostEl.querySelector("[data-confirm-register]")?.addEventListener("click", async () => {
    setStatus("Creating payment order…", "pending");
    try {
      await createOrderAndPay();
    } catch (err) {
      setStatus(/** @type {Error} */ (err).message, "error");
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
  hostEl.innerHTML = `
    <article class="wallet__card">
      <p class="wallet__name">Pay $${escapeHtml(String(checkout.feeUsd ?? desk.feeUsd ?? 10))}</p>
      <p class="wallet__meta">${escapeHtml(who)}</p>
      <p class="wallet__meta">Order <code>${escapeHtml(state.orderId)}</code> · name <strong>${escapeHtml(state.name)}</strong></p>
      ${
        state.instructions
          ? `<p class="wallet__note">${escapeHtml(state.instructions)}</p>`
          : `<p class="wallet__meta">Payment is matched by this Order ID automatically when using the gateway API.</p>`
      }
      <p style="margin-top:1rem">
        <a class="btn btn--primary" href="${escapeHtml(state.paymentUrl)}" rel="noopener" target="_blank" data-pay>Open payment</a>
        <button type="button" class="btn btn--outline" data-paid style="margin-left:0.5rem">I’ve paid — continue</button>
      </p>
    </article>
  `;
  hostEl.querySelector("[data-paid]")?.addEventListener("click", () => {
    setStatus("Waiting for payment confirmation…", "pending");
    renderStep4();
  });
}

function renderStep4() {
  setStep(4);
  hostEl.innerHTML = `
    <article class="wallet__card">
      <p class="wallet__name">${escapeHtml(state.name)}</p>
      <p class="wallet__meta">Order <code>${escapeHtml(state.orderId)}</code></p>
      <p class="wallet__meta" data-wait-detail>Polling for payment and on-chain registration…</p>
      <p style="margin-top:1rem">
        <a class="btn btn--outline" href="/wallet/#/account/${encodeURIComponent(state.name)}">Open wallet</a>
      </p>
    </article>
  `;
  pollUntilRegistered();
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
  setStatus(`“${state.name}” is registered. Welcome.`, "ok");
}

async function pollNameOnly() {
  for (let i = 0; i < 90; i++) {
    try {
      if ((await checkAvailability(state.name)) === false) {
        await markRegistered();
        return;
      }
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  setStatus("Still waiting — check back from your wallet after your friend sponsors.", "pending");
}

async function pollUntilRegistered() {
  const detail = hostEl.querySelector("[data-wait-detail]");
  for (let i = 0; i < 90; i++) {
    try {
      const order = await apiGet(apiBase, `/registrar/orders/${encodeURIComponent(state.orderId)}`);
      const status = order.status;
      if (detail) {
        detail.textContent = `Status: ${status.replace(/_/g, " ")}`;
      }
      if (status === "registered" || (await checkAvailability(state.name)) === false) {
        await markRegistered();
        if (detail) detail.textContent = "Registered on-chain.";
        hostEl.insertAdjacentHTML(
          "beforeend",
          `<p class="wallet__note" style="margin-top:1rem">
            Next: open <a href="/settings/">Settings</a> to link <strong>your</strong> Paymento store
            and sell GULD to friends (OTC desk). Then share your invite link from Settings.
          </p>`,
        );
        return;
      }
      if (status === "payment_received") {
        setStatus("Payment received — waiting for the registrar to sign…", "ok");
      } else if (status === "payment_processing") {
        setStatus("Payment processing…", "pending");
      }
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  setStatus("Still waiting — check back from your wallet, or ask the registrar.", "pending");
}

async function boot() {
  if (titleEl) titleEl.textContent = isGroup ? "Create a group" : "Sign up";
  if (leadEl) {
    leadEl.innerHTML = isGroup
      ? `Choose an available <strong>group</strong> name, set co-signer keys and threshold, then get sponsored (friend JSON or paid desk). Fee scales with signer count.`
      : `Choose an available name, generate keys in this browser, then pay <strong>$10</strong> via the registrar’s payment link — or export a request for a friend sponsor.`;
  }

  try {
    state.desk = await resolveRegistrationDesk(apiBase);
    if (state.desk) {
      const label =
        state.desk.source === "invite"
          ? `Invite desk${state.desk.sponsor ? ` · ${state.desk.sponsor}` : ""}`
          : state.desk.source === "local"
            ? "Your OTC desk"
            : "Peer bootstrap desk";
      setStatus(`${label} · $${state.desk.feeUsd}`, "ok");
    } else {
      setStatus(
        "No payment desk found — use friend sponsor (copy request JSON), or configure Settings on a funded node.",
        "pending",
      );
    }
  } catch (err) {
    setStatus(/** @type {Error} */ (err).message, "error");
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
      setStatus(`Resuming order for “${order.name}”…`, "pending");
      renderStep4();
      return;
    } catch {
      /* fall through to step 1 */
    }
  }
  renderStep1();
}

boot();
