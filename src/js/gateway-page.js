import "./chrome.js";
import { apiGet, apiPatch, apiPost, resolveApiBase } from "./lib/api.js";
import { getLocalIdentity, LOGIN_HREF, requireLogin, SETTINGS_HREF } from "./lib/auth.js";
import {
  fromHex,
  registerMessage,
  sign,
  toHex,
} from "./lib/crypto.js";
import { isGatewayConfigured, loadGatewaySettings } from "./lib/gateway-settings.js";
import { keyring } from "./lib/keyring.js";
import { escapeHtml } from "./lib/rpc.js";

const statusEl = document.querySelector("[data-gateway-status]");
const hostEl = document.querySelector("[data-gateway-host]");
const apiBase = resolveApiBase();

const STATUS_LABEL = {
  payment_pending: "Payment pending",
  payment_processing: "Payment processing",
  payment_received: "Payment received",
  registered: "Registered",
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

/**
 * @param {Record<string, unknown>} order
 * @param {string} payerName
 */
async function signAndSubmit(order, payerName) {
  const req = /** @type {Record<string, unknown>} */ (order.request);
  if (!req || typeof req !== "object") {
    throw new Error("Order has no registration request — registrant must complete Sign up first.");
  }
  const privHex = keyring.getPriv(payerName);
  if (!privHex) {
    throw new Error(
      `Unlock your keyring first — log in with your passphrase for “${payerName}”.`,
    );
  }
  const acctBody = await apiGet(apiBase, `/chain/accounts/${encodeURIComponent(payerName)}`);
  const account = acctBody.account || {};
  const accountId = account.account_id;
  const nonce = account.nonce;
  if (!accountId || nonce == null) {
    throw new Error("Could not read payer account_id / nonce");
  }

  const name = String(req.name);
  const keys = /** @type {string[]} */ (req.keys || []);
  const threshold = Number(req.threshold || 1);
  const master = String(req.initial_master_hash);
  const endowment = String(req.endowment || "0");
  const regFee = String(req.registration_fee || "0");
  const inclusionFee = String(req.inclusion_fee || "0");
  const registrantSig = String(req.registrant_signature || "");

  const msg = await registerMessage(
    accountId,
    nonce,
    name,
    threshold,
    master,
    endowment,
    regFee,
    inclusionFee,
    keys,
  );
  const payerSig = await sign(msg, fromHex(privHex));

  const tx = {
    type: "register_username",
    payer: payerName,
    name,
    keys,
    threshold,
    initial_master_hash: master,
    endowment,
    payer_signature: toHex(payerSig),
    registrant_signature: registrantSig,
    inclusion_fee: inclusionFee,
  };

  const result = await apiPost(apiBase, "/chain/transactions", tx);
  await apiPatch(apiBase, `/registrar/orders/${encodeURIComponent(String(order.id))}`, {
    status: "registered",
  });
  return result;
}

async function render() {
  if (!isGatewayConfigured()) {
    setStatus("Gateway not configured.", "error");
    hostEl.innerHTML = `
      <p class="wallet__empty">
        Enable a payment gateway under <a href="${SETTINGS_HREF}">Settings</a>.
      </p>`;
    return;
  }

  const ok = await requireLogin({ apiBase, next: "/gateway/" });
  if (!ok) return;

  const settings = loadGatewaySettings();
  const id = getLocalIdentity();
  if (settings.registrarName && id.name !== settings.registrarName) {
    setStatus(
      `Logged in as ${id.name}, but settings say registrar is ${settings.registrarName}. Switch account or update Settings.`,
      "pending",
    );
  }

  setStatus("Loading orders…");
  try {
    const body = await apiGet(apiBase, "/registrar/orders");
    const items = body.items || [];
    if (!items.length) {
      setStatus("No registration orders yet.", "ok");
      hostEl.innerHTML = `<p class="wallet__empty">When someone signs up against this peer, orders appear here.</p>`;
      return;
    }

    const focus =
      new URLSearchParams(location.hash.replace(/^#/, "")).get("order") ||
      new URLSearchParams(location.search).get("order");

    const rows = items
      .map((order) => {
        const st = String(order.status || "");
        const label = STATUS_LABEL[st] || st;
        const canSign = st === "payment_received";
        const highlight = focus && focus === order.id ? " is-focus" : "";
        return `
        <li class="gateway-order${highlight}" data-order-id="${escapeHtml(order.id)}">
          <div>
            <strong>${escapeHtml(order.name)}</strong>
            <span class="wallet__meta">${escapeHtml(label)}</span>
          </div>
          <div class="wallet__meta"><code>${escapeHtml(order.id)}</code></div>
          <div class="gateway-order__actions">
            ${
              canSign
                ? `<button type="button" class="btn btn--primary" data-sign="${escapeHtml(order.id)}">Sign registration</button>`
                : ""
            }
            ${
              st === "registered"
                ? `<a class="btn btn--outline" href="/wallet/#/account/${encodeURIComponent(order.name)}">View</a>`
                : ""
            }
          </div>
        </li>`;
      })
      .join("");

    setStatus(`${items.length} order(s) · payer ${settings.registrarName || id.name}`, "ok");
    hostEl.innerHTML = `<ul class="gateway-list">${rows}</ul>`;

    hostEl.querySelectorAll("[data-sign]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const oid = btn.getAttribute("data-sign");
        const order = items.find((o) => o.id === oid);
        if (!order) return;
        btn.setAttribute("disabled", "true");
        setStatus(`Signing registration for ${order.name}…`);
        try {
          const payer = settings.registrarName || id.name;
          if (!payer) throw new Error("No registrar name");
          const result = await signAndSubmit(order, payer);
          setStatus(
            `Submitted · tx ${result.tx_id || "ok"}${result.mined ? " (mined)" : ""}`,
            "ok",
          );
          await render();
        } catch (err) {
          setStatus(/** @type {Error} */ (err).message, "error");
          btn.removeAttribute("disabled");
        }
      });
    });

    if (focus) {
      const el = hostEl.querySelector(`[data-order-id="${CSS.escape(focus)}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } catch (err) {
    setStatus(/** @type {Error} */ (err).message, "error");
    if (String(/** @type {Error} */ (err).message).includes("Log in")) {
      hostEl.innerHTML = `<p class="wallet__empty"><a href="${LOGIN_HREF}?next=/gateway/">Log in</a> to manage the desk.</p>`;
    }
  }
}

render();
setInterval(() => {
  if (document.visibilityState === "visible") render();
}, loadGatewaySettings().pollMs || 12_000);
