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

const apiBase = resolveApiBase();

/** @type {{ step: number, name: string, orderId: string, privHex: string, pubHex: string, request: object | null, paymentUrl: string, instructions: string, desk: import("./lib/desk.js").DeskCheckout | null }} */
let state = {
  step: 1,
  name: "",
  orderId: "",
  privHex: "",
  pubHex: "",
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
  if (!/^[a-z][a-z0-9._-]{1,31}$/.test(name)) {
    return { error: "Invalid username format (start with a letter; 2–32 chars)." };
  }
  if (name.length < DESK_MIN_NAME_LEN) {
    return {
      error: `This desk only sells names with ${DESK_MIN_NAME_LEN}+ characters. Shorter names stay available on-chain — run a node (or find a friend sponsor) if you want one.`,
    };
  }
  return { name };
}

async function buildRequest(name, priv, pubHex) {
  const feeBody = await apiGet(apiBase, "/chain/fees/registration?kind=individual");
  const regFee = String(feeBody.fee || "0");
  const height = feeBody.height != null ? String(feeBody.height) : undefined;
  const endowment = "0";
  const inclusionFee = "0";
  const intent = await registerIntentMessage(
    name,
    1,
    DEFAULT_MASTER_HASH,
    endowment,
    regFee,
    inclusionFee,
    [pubHex],
  );
  const privBytes = fromHex(priv);
  const sig = await sign(intent, privBytes);
  return {
    version: 1,
    type: "register_username",
    name,
    keys: [pubHex],
    threshold: 1,
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
        Desired username
        <input name="name" type="text" autocomplete="username" spellcheck="false"
          placeholder="charlie" minlength="6" maxlength="32" required
          pattern="[a-zA-Z][a-zA-Z0-9._\\-]{5,31}" />
      </label>
      <p class="wallet__meta">6–32 characters for this paid desk; start with a letter. Shorter names are not sold here.</p>
      <button type="submit" class="btn btn--primary">Check availability</button>
    </form>
    <p class="wallet__note">Already have a key? <a href="/login/">Log in</a>.</p>
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
      const fee = await apiGet(apiBase, "/chain/fees/registration?kind=individual");
      state.name = name;
      setStatus(
        `“${name}” is available · on-chain fee ≈ ${escapeHtml(String(fee.feeGuld ?? quantaToGuld(fee.fee)))} GULD (paid by sponsor) + $10 fiat desk fee.`,
        "ok",
      );
      renderStep2();
    } catch (err) {
      setStatus(/** @type {Error} */ (err).message, "error");
    }
  });
}

function renderStep2() {
  setStep(2);
  hostEl.innerHTML = `
    <article class="wallet__card">
      <p class="wallet__name">${escapeHtml(state.name)}</p>
      <p class="wallet__meta">Generate a spend key in this browser. It never leaves your device.</p>
      <button type="button" class="btn btn--primary" data-gen-keys>Generate keys &amp; continue</button>
      <button type="button" class="btn btn--outline" data-back style="margin-left:0.5rem">Back</button>
    </article>
  `;
  hostEl.querySelector("[data-back]")?.addEventListener("click", () => renderStep1());
  hostEl.querySelector("[data-gen-keys]")?.addEventListener("click", async () => {
    setStatus("Generating keys…");
    try {
      const priv = await randomPrivateKey();
      const pubHex = await pubkeyHex(priv);
      const privHex = toHex(priv);
      const request = await buildRequest(state.name, privHex, pubHex);
      keyring.upsertAccount({
        name: state.name,
        privHex,
        pubHex,
        pending: true,
      });
      activateAccount(state.name);
      state.privHex = privHex;
      state.pubHex = pubHex;
      state.request = request;
      setStatus("Keys ready. Creating payment order…", "ok");
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
        returnUrl: `${location.origin}/register/?order=${encodeURIComponent(state.orderId)}`,
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
        keyring.upsertAccount({
          name: state.name,
          privHex: state.privHex,
          pubHex: state.pubHex,
          pending: false,
        });
        activateAccount(state.name);
        setStatus(`“${state.name}” is registered. Welcome.`, "ok");
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
        "No payment desk found — ask a friend for an invite link, or configure Settings on a funded node.",
        "pending",
      );
    }
  } catch (err) {
    setStatus(/** @type {Error} */ (err).message, "error");
  }

  const params = new URLSearchParams(location.search);
  const orderId = params.get("order");
  if (orderId) {
    try {
      const order = await apiGet(apiBase, `/registrar/orders/${encodeURIComponent(orderId)}`);
      state.orderId = order.id;
      state.name = order.name;
      state.request = order.request || null;
      const acct = keyring.getAccount(order.name);
      if (acct) {
        state.privHex = acct.privHex;
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
