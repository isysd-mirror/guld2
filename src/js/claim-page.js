import "./chrome.js";
import { apiGet, persistApiBase, resolveApiBase } from "./lib/api.js";
import {
  assertProofMatchesMessage,
  buildClaimMessage,
  clearClaimDraft,
  loadClaimDraft,
  saveClaimDraft,
  sendClaim,
} from "./lib/claim.js";
import { pubkeyHex, randomPrivateKey, toHex } from "./lib/crypto.js";
import { keyring } from "./lib/keyring.js";
import { escapeHtml, quantaToGuld } from "./lib/rpc.js";
import { showToast } from "./lib/toast.js";

const statusEl = document.querySelector("[data-claim-status]");
const hostEl = document.querySelector("[data-claim-host]");

/** @type {import("./lib/claim.js").ClaimDraft | null} */
let claimDraft = null;

/** @type {{ lookedUp: boolean, alreadyClaimed: boolean, formEnabled: boolean, lookupPrimary: string, lookupSecondary: string }} */
let ui = {
  lookedUp: false,
  alreadyClaimed: false,
  formEnabled: true,
  lookupPrimary: "",
  lookupSecondary: "",
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

function walletAccounts() {
  return keyring.load().accounts;
}

function fillWalletSelect(select, selected) {
  if (!(select instanceof HTMLSelectElement)) return;
  select.replaceChildren();
  const accounts = walletAccounts();
  if (!accounts.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No key yet — generate below";
    select.append(opt);
    return;
  }
  for (const acct of accounts) {
    const opt = document.createElement("option");
    opt.value = acct.name;
    opt.textContent = acct.name;
    select.append(opt);
  }
  if (selected && accounts.some((a) => a.name === selected)) {
    select.value = selected;
  } else if (accounts.length) {
    select.value = keyring.load().activeName || accounts[0].name;
  }
}

function selectedWalletPub() {
  const sel = hostEl.querySelector("[data-claim-wallet]");
  const name =
    sel instanceof HTMLSelectElement ? sel.value : keyring.load().activeName || "";
  return keyring.getAccount(name)?.pubHex ?? "";
}

async function lookupLegacyName(name) {
  const apiBase = resolveApiBase();
  ui.lookedUp = true;
  try {
    const body = await apiGet(apiBase, `/chain/accounts/${encodeURIComponent(name)}`);
    const acct = body.account;
    const guld = body.balance?.guld ?? quantaToGuld(String(body.balance?.quanta ?? "0"));
    ui.lookupPrimary = `Balance ${guld} GULD`;
    if (acct?.legacy) {
      const hint = acct.legacy.binding_hint ? ` · ${acct.legacy.binding_hint}` : "";
      ui.lookupSecondary = `legacy: ${acct.legacy.status}${hint}`;
      ui.alreadyClaimed = acct.legacy.status === "claimed";
    } else {
      ui.lookupSecondary = "no legacy lock (native account)";
      ui.alreadyClaimed = false;
    }
    ui.formEnabled = !ui.alreadyClaimed;
    if (ui.alreadyClaimed) {
      claimDraft = null;
      clearClaimDraft();
    }
    setStatus(ui.alreadyClaimed ? "Already claimed — use Wallet to send." : "Ready to claim.", "ok");
  } catch (err) {
    const msg = /** @type {Error} */ (err).message || String(err);
    if (msg.includes("404") || msg.includes("unknown")) {
      ui.lookupPrimary = "Account not found";
      ui.lookupSecondary = "";
    } else {
      ui.lookupPrimary = `Node error: ${msg}`;
      ui.lookupSecondary = "";
    }
    ui.alreadyClaimed = false;
    ui.formEnabled = true;
    setStatus("Lookup failed.", "error");
  }
  renderForm();
}

function applyDraft(draft) {
  claimDraft = draft;
  const nameInput = hostEl.querySelector("[data-claim-name]");
  const masterInput = hostEl.querySelector("[data-claim-master]");
  const msgInput = hostEl.querySelector("[data-claim-message]");
  if (nameInput instanceof HTMLInputElement && draft.name) nameInput.value = draft.name;
  if (masterInput instanceof HTMLInputElement && draft.initialMasterHash) {
    masterInput.value = draft.initialMasterHash;
  }
  if (msgInput instanceof HTMLTextAreaElement && draft.messageHex) {
    msgInput.value = draft.messageHex;
  }
  fillWalletSelect(hostEl.querySelector("[data-claim-wallet]"), draft.walletName);
}

function renderForm() {
  const apiBase = resolveApiBase();
  const params = new URLSearchParams(location.search);
  const prefillName = params.get("name")?.trim().toLowerCase() || "";
  const kr = keyring.load();
  const walletName = kr.activeName || kr.accounts[0]?.name || "";

  hostEl.innerHTML = `
    <form class="wallet__form claim-form" data-claim-form>
      <fieldset>
        <legend>Node</legend>
        <label>
          API base
          <input name="apiBase" type="text" value="${escapeHtml(apiBase)}" spellcheck="false" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Legacy account</legend>
        <label>
          Legacy name
          <input data-claim-name name="legacyName" type="text" placeholder="abeiertz"
            value="${escapeHtml(prefillName || loadClaimDraft()?.name || "")}" spellcheck="false" autocomplete="off" />
        </label>
        <div class="wallet__actions">
          <button type="button" class="btn btn--outline" data-claim-lookup>Look up</button>
          <a class="btn btn--ghost" href="/explorer/legacy/">Browse import table</a>
        </div>
        ${
          ui.lookedUp
            ? `<div class="claim-info">
                <p>${escapeHtml(ui.lookupPrimary)}</p>
                ${ui.lookupSecondary ? `<p>${escapeHtml(ui.lookupSecondary)}</p>` : ""}
                ${ui.alreadyClaimed ? `<p class="claim-done">Already claimed — open <a href="/wallet/">Wallet</a>.</p>` : ""}
              </div>`
            : ""
        }
      </fieldset>

      <fieldset ${ui.formEnabled ? "" : "disabled"}>
        <legend>Wallet key</legend>
        <label>
          Key for this claim
          <select data-claim-wallet name="walletName"></select>
        </label>
        <p class="wallet__meta" data-claim-pub></p>
        <div class="wallet__actions">
          <button type="button" class="btn btn--outline" data-claim-generate>Generate key for this name</button>
        </div>
      </fieldset>

      <fieldset ${ui.formEnabled ? "" : "disabled"}>
        <legend>Claim message</legend>
        <label>
          Initial master hash
          <input data-claim-master name="masterHash" type="text" placeholder="auto"
            value="${escapeHtml(claimDraft?.initialMasterHash || "")}" spellcheck="false" />
        </label>
        <button type="button" class="btn btn--outline" data-claim-build>Build claim message</button>
        <label>
          Message (cleartext-sign with PGP)
          <textarea data-claim-message name="messageHex" rows="3" readonly spellcheck="false">${escapeHtml(claimDraft?.messageHex || "")}</textarea>
        </label>
        <button type="button" class="btn btn--ghost" data-claim-copy-msg>Copy message</button>
      </fieldset>

      <fieldset ${ui.formEnabled ? "" : "disabled"}>
        <legend>Proof</legend>
        <label>
          Legacy proof
          <textarea data-claim-proof name="proof" rows="5"
            placeholder="pgp_cleartext_v1:-----BEGIN PGP SIGNED MESSAGE-----…"
            spellcheck="false"></textarea>
        </label>
        <label class="wallet__check">
          <input data-claim-dev type="checkbox" name="devUnlock" />
          Use <code>dev_unlock_v1</code> (local dev only)
        </label>
        <button type="submit" class="btn btn--primary" data-claim-submit>Claim &amp; unlock</button>
      </fieldset>
    </form>

    <p class="wallet__note">
      New to Guld 2.0? <a href="/register/">Register a name</a> instead.
      Desktop wallet: same flow in the native app. Spec:
      <a href="/docs/specs/15-ledger-import.md">15 — ledger import</a>.
    </p>
  `;

  fillWalletSelect(hostEl.querySelector("[data-claim-wallet]"), claimDraft?.walletName || walletName);
  updatePubLabel();

  hostEl.querySelector("[data-claim-wallet]")?.addEventListener("change", updatePubLabel);

  hostEl.querySelector("[data-claim-lookup]")?.addEventListener("click", async () => {
    const input = hostEl.querySelector("[data-claim-name]");
    const name = input instanceof HTMLInputElement ? input.value.trim().toLowerCase() : "";
    if (!name) {
      setStatus("Enter your legacy name first.", "error");
      return;
    }
    setStatus("Looking up…", "pending");
    await lookupLegacyName(name);
  });

  hostEl.querySelector("[data-claim-generate]")?.addEventListener("click", async () => {
    const legacyInput = hostEl.querySelector("[data-claim-name]");
    const legacyName = legacyInput instanceof HTMLInputElement ? legacyInput.value.trim().toLowerCase() : "";
    if (!legacyName) {
      setStatus("Enter your legacy name first.", "error");
      return;
    }
    try {
      const priv = await randomPrivateKey();
      const pubHex = await pubkeyHex(priv);
      keyring.upsertAccount({ name: legacyName, privHex: toHex(priv), pubHex });
      fillWalletSelect(hostEl.querySelector("[data-claim-wallet]"), legacyName);
      updatePubLabel();
      setStatus(`Generated key for ${legacyName}`, "ok");
      showToast({ title: "Key generated", body: pubHex });
    } catch (err) {
      setStatus(/** @type {Error} */ (err).message, "error");
    }
  });

  hostEl.querySelector("[data-claim-build]")?.addEventListener("click", async () => {
    const legacyName = getLegacyName();
    const pubHex = selectedWalletPub();
    if (!legacyName || !pubHex) {
      setStatus("Enter legacy name and select or generate a wallet key.", "error");
      return;
    }
    const masterInput = hostEl.querySelector("[data-claim-master]");
    const master =
      masterInput instanceof HTMLInputElement ? masterInput.value.trim() : undefined;
    setStatus("Building claim message…", "pending");
    try {
      const apiBase = resolveApiBase();
      const draft = await buildClaimMessage(apiBase, legacyName, pubHex, 1, master);
      claimDraft = {
        ...draft,
        name: legacyName,
        walletName: getWalletName() || legacyName,
        threshold: 1,
        keys: [pubHex],
      };
      saveClaimDraft(claimDraft);
      applyDraft(claimDraft);
      setStatus("Claim message ready — cleartext-sign with your 1.0 PGP key.", "ok");
    } catch (err) {
      setStatus(/** @type {Error} */ (err).message, "error");
    }
  });

  hostEl.querySelector("[data-claim-copy-msg]")?.addEventListener("click", async () => {
    const msgInput = hostEl.querySelector("[data-claim-message]");
    const text = msgInput instanceof HTMLTextAreaElement ? msgInput.value : "";
    if (!text) {
      setStatus("Build the claim message first.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Message copied.", "ok");
    } catch {
      if (msgInput instanceof HTMLTextAreaElement) msgInput.select();
      setStatus("Select and copy the message.", "pending");
    }
  });

  hostEl.querySelector("[data-claim-dev]")?.addEventListener("change", (ev) => {
    const proof = hostEl.querySelector("[data-claim-proof]");
    if (!(proof instanceof HTMLTextAreaElement)) return;
    if (/** @type {HTMLInputElement} */ (ev.target).checked) {
      proof.value = "dev_unlock_v1";
    }
  });

  hostEl.querySelector("[data-claim-form]")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!ui.formEnabled) return;
    const legacyName = getLegacyName();
    let walletName = getWalletName() || legacyName;
    const pubHex = selectedWalletPub();
    const proofInput = hostEl.querySelector("[data-claim-proof]");
    const devBox = hostEl.querySelector("[data-claim-dev]");
    const devUnlock = devBox instanceof HTMLInputElement && devBox.checked;
    let proof = proofInput instanceof HTMLTextAreaElement ? proofInput.value.trim() : "";
    if (devUnlock) proof = "dev_unlock_v1";

    if (!legacyName || !pubHex) {
      setStatus("Legacy name and wallet key required.", "error");
      return;
    }

    const submitBtn = hostEl.querySelector("[data-claim-submit]");
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
    setStatus("Submitting claim…", "pending");

    try {
      const apiBase = resolveApiBase();
      if (!claimDraft) {
        const masterInput = hostEl.querySelector("[data-claim-master]");
        const master =
          masterInput instanceof HTMLInputElement ? masterInput.value.trim() : undefined;
        const built = await buildClaimMessage(apiBase, legacyName, pubHex, 1, master);
        claimDraft = {
          ...built,
          name: legacyName,
          walletName,
          threshold: 1,
          keys: [pubHex],
        };
      }
      const rebuilt = await buildClaimMessage(
        apiBase,
        legacyName,
        pubHex,
        1,
        claimDraft.initialMasterHash,
      );
      if (rebuilt.messageHex !== claimDraft.messageHex) {
        throw new Error("Claim parameters changed — build the message again.");
      }
      assertProofMatchesMessage(proof, claimDraft.messageHex, devUnlock);

      const src = keyring.getAccount(walletName) || keyring.getAccount(legacyName);
      if (src) {
        keyring.upsertAccount({
          name: legacyName,
          privHex: src.privHex,
          pubHex: src.pubHex,
        });
        keyring.setActive(legacyName);
      }

      const result = await sendClaim(apiBase, {
        name: legacyName,
        keys: [pubHex],
        threshold: 1,
        initialMasterHash: claimDraft.initialMasterHash,
        legacyProof: proof,
        devUnlock,
      });

      clearClaimDraft();
      claimDraft = null;
      setStatus(`Claimed ${legacyName} · tx ${result.tx_id ?? "ok"}`, "ok");
      showToast({
        title: "Claim submitted",
        body: "Open Wallet to send GULD.",
        href: "/wallet/",
        hrefLabel: "Open wallet",
      });
      ui.alreadyClaimed = true;
      ui.formEnabled = false;
      renderForm();
    } catch (err) {
      setStatus(/** @type {Error} */ (err).message, "error");
    } finally {
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    }
  });

}

function getLegacyName() {
  const input = hostEl.querySelector("[data-claim-name]");
  return input instanceof HTMLInputElement ? input.value.trim().toLowerCase() : "";
}

function getWalletName() {
  const sel = hostEl.querySelector("[data-claim-wallet]");
  return sel instanceof HTMLSelectElement ? sel.value.trim().toLowerCase() : "";
}

function updatePubLabel() {
  const pub = selectedWalletPub();
  const el = hostEl.querySelector("[data-claim-pub]");
  if (el instanceof HTMLElement) {
    el.textContent = pub ? `pubkey ${pub}` : "Generate a key for your legacy name.";
  }
}

const storedDraft = loadClaimDraft();
if (storedDraft) {
  claimDraft = storedDraft;
}
renderForm();
if (storedDraft) {
  setStatus("Restored in-progress claim draft.", "ok");
} else if (!new URLSearchParams(location.search).get("name")) {
  setStatus("Enter your legacy name to begin.", "pending");
}

document.addEventListener("change", (ev) => {
  const t = /** @type {HTMLElement} */ (ev.target);
  if (t.matches("[name=apiBase]") && t instanceof HTMLInputElement) {
    persistApiBase(t.value.trim() || "/api/v1");
  }
});

// Prefill from legacy explorer links (/claim/?name=…)
const prefill = new URLSearchParams(location.search).get("name")?.trim().toLowerCase();
if (prefill && !storedDraft && !ui.lookedUp) {
  lookupLegacyName(prefill);
}
