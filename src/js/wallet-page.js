import "./chrome.js";
import { apiGet, apiPost, persistApiBase, resolveApiBase } from "./lib/api.js";
import { getLocalIdentity, LOGIN_HREF, REGISTER_HREF } from "./lib/auth.js";
import { listSendSuggestions, recordSend, saveContact } from "./lib/contacts.js";
import {
  cosignMessage,
  DEFAULT_MASTER_HASH,
  fromHex,
  pubkeyHex,
  randomPrivateKey,
  registerSubIntentMessage,
  registerSubMessage,
  rotateKeysIntentMessage,
  rotateKeysMessage,
  sign,
  toHex,
  transferMessage,
} from "./lib/crypto.js";
import {
  bindExportKeySections,
  renderExportKeySection,
} from "./lib/key-export.js";
import { keyring } from "./lib/keyring.js";
import {
  escapeHtml,
  formatTime,
  guldToQuanta,
  quantaToGuld,
  summarizeActivity,
} from "./lib/rpc.js";
import { getActiveName, setActiveName } from "./lib/wallet-session.js";

const statusEl = document.querySelector("[data-wallet-status]");
const hostEl = document.querySelector("[data-wallet-host]");
const apiInput = document.querySelector("[data-wallet-api]");
const nameInput = document.querySelector("[data-wallet-name]");
const lookupBtn = document.querySelector("[data-wallet-lookup]");
const refreshBtn = document.querySelector("[data-wallet-refresh]");

/** @type {string} */
let apiBase = resolveApiBase();

if (apiInput instanceof HTMLInputElement) {
  apiInput.value = apiBase;
  apiInput.addEventListener("change", () => {
    apiBase = apiInput.value.trim() || "/api/v1";
    persistApiBase(apiBase);
    route();
  });
}

if (nameInput instanceof HTMLInputElement) {
  const active = getActiveName();
  if (active && !nameInput.value) nameInput.value = active;
}

nameInput?.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") openAccount();
});

lookupBtn?.addEventListener("click", openAccount);
refreshBtn?.addEventListener("click", () => route());

window.addEventListener("hashchange", () => route());

/**
 * @returns {{ view: "home" } | { view: "account", name: string }}
 */
function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "account" && parts[1]) {
    return { view: "account", name: decodeURIComponent(parts[1]) };
  }
  return { view: "home" };
}

function openAccount() {
  if (!(nameInput instanceof HTMLInputElement)) return;
  const name = nameInput.value.trim().toLowerCase();
  if (!name) return;
  location.hash = `#/account/${encodeURIComponent(name)}`;
}

function setStatus(text, state = "ok") {
  if (!(statusEl instanceof HTMLElement)) return;
  statusEl.textContent = text;
  statusEl.dataset.state = state;
}

async function route() {
  const r = parseRoute();
  if (!(hostEl instanceof HTMLElement)) return;

  if (r.view === "home") {
    const id = getLocalIdentity();
    if (!id.hasKey) {
      hostEl.innerHTML = `
        <article class="wallet__card">
          <p class="wallet__name">Welcome</p>
          <p class="wallet__meta">Look up any name below, or create yours to get a local key.</p>
          <p style="margin-top:1rem">
            <a class="btn btn--primary" href="${REGISTER_HREF}">Sign up</a>
            <a class="btn btn--outline" href="${LOGIN_HREF}" style="margin-left:0.5rem">Log in</a>
          </p>
        </article>
        <p class="wallet__empty">Or look up a public name to browse activity.</p>`;
    } else {
      hostEl.innerHTML = `
        <article class="wallet__card">
          <p class="wallet__name">${escapeHtml(id.name || "")}</p>
          <p class="wallet__meta">${id.pending ? "Registration pending…" : "Signed in on this device"}</p>
          <p style="margin-top:0.75rem">
            <a class="btn btn--primary" href="#/account/${encodeURIComponent(id.name || "")}">Open my account</a>
            ${
              !id.pending
                ? `<a class="btn btn--outline" href="/settings/" style="margin-left:0.5rem">Sell GULD (OTC desk)</a>`
                : ""
            }
          </p>
        </article>`;
    }
    try {
      const st = await apiGet(apiBase, "/chain/status");
      const h = st.height ?? "—";
      setStatus(`Chain height ${h}${st.ready === false ? " · node not ready" : ""}`);
    } catch (err) {
      setStatus(`API: ${/** @type {Error} */ (err).message}`, "error");
    }
    return;
  }

  if (nameInput instanceof HTMLInputElement) nameInput.value = r.name;
  setActiveName(r.name);
  hostEl.innerHTML = `<p class="doc-status">Loading ${escapeHtml(r.name)}…</p>`;
  setStatus("Loading…", "pending");

  try {
    const [st, acct] = await Promise.all([
      apiGet(apiBase, "/chain/status"),
      apiGet(apiBase, `/chain/accounts/${encodeURIComponent(r.name)}`),
    ]);
    const activity = await apiGet(
      apiBase,
      `/chain/accounts/${encodeURIComponent(r.name)}/activity?limit=25`,
    );

    setStatus(`Height ${st.height ?? "—"}`);
    const account = acct.account || {};
    const balanceGuld = acct.balance?.guld ?? quantaToGuld(acct.balance?.quanta || "0");
    const kind = account.kind || "—";
    const legacy = account.legacy_locked ? " · legacy locked" : "";

    const rows = (activity.items || []).map((row) => {
      const sum = summarizeActivity(row);
      const when =
        row.height != null
          ? `h${row.height}`
          : formatTime(row.timestamp ?? row.time ?? row.block_time);
      return `<li><strong>${escapeHtml(sum.type)}</strong> ${escapeHtml(sum.primary)} · ${escapeHtml(sum.amount)} GULD <span class="wallet__meta">${escapeHtml(when)}</span></li>`;
    });

    const local = getLocalIdentity();
    const canSend = local.name === r.name && keyring.hasStoredKey(r.name);
    const unlocked = canSend && keyring.hasLocalKey(r.name);

    let sendSection = "";
    if (canSend && !unlocked) {
      sendSection = `
        <section class="wallet__send">
          <h2>Send GULD</h2>
          <form class="wallet__form" data-unlock-form>
            <label>Passphrase <input name="pass" type="password" autocomplete="current-password" required /></label>
            <button type="submit" class="btn btn--outline">Unlock to send</button>
          </form>
        </section>`;
    } else if (canSend && unlocked) {
      const suggestions = listSendSuggestions();
      const opts = suggestions
        .map((s) => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.label)}</option>`)
        .join("");
      sendSection = `
        <section class="wallet__send">
          <h2>Send GULD</h2>
          <form class="wallet__form" data-send-form>
            <label>To
              <input name="to" type="text" list="send-suggestions" spellcheck="false" required placeholder="bob" autocomplete="off" />
              <datalist id="send-suggestions">${opts}</datalist>
            </label>
            <label>Amount (GULD) <input name="amount" type="text" inputmode="decimal" required placeholder="1" /></label>
            <label>Inclusion fee (GULD) <input name="fee" type="text" inputmode="decimal" value="0.0000000001" /></label>
            <label>Memo (optional) <input name="memo" type="text" maxlength="64" placeholder="order id / invoice" /></label>
            <label class="wallet__check"><input name="favorite" type="checkbox" /> Save recipient as favorite</label>
            <button type="submit" class="btn btn--primary">Send</button>
          </form>
        </section>
        <section class="wallet__send">
          <h2>Account management</h2>
          <details>
            <summary>Update master hash</summary>
            <form class="wallet__form" data-update-master-form>
              <label>New master hash (0x…32 bytes) <input name="master" type="text" spellcheck="false" required /></label>
              <label>Inclusion fee (GULD) <input name="fee" type="text" value="0.0000000001" /></label>
              <button type="submit" class="btn btn--outline">Submit UpdateMaster</button>
            </form>
          </details>
          <details style="margin-top:0.75rem">
            <summary>Rotate keys</summary>
            <form class="wallet__form" data-rotate-keys-form>
              <label>New public key (0x…)
                <input name="pub" type="text" spellcheck="false" required />
              </label>
              <label>New private key (0x…, kept locally after rotate)
                <input name="priv" type="password" spellcheck="false" autocomplete="off" required />
              </label>
              <label>Inclusion fee (GULD) <input name="fee" type="text" value="0.0000000001" /></label>
              <button type="submit" class="btn btn--outline">Submit RotateKeys</button>
            </form>
          </details>
          ${
            kind === "individual"
              ? `<details style="margin-top:0.75rem">
            <summary>Create subaccount</summary>
            <form class="wallet__form" data-register-sub-form>
              <label>Label (e.g. mobile) <input name="label" type="text" spellcheck="false" pattern="[a-z0-9]+(-[a-z0-9]+)*" required placeholder="mobile" /></label>
              <label>Endowment (GULD) <input name="endowment" type="text" inputmode="decimal" value="0.1" /></label>
              <label>Inclusion fee (GULD) <input name="fee" type="text" value="0.0000000001" /></label>
              <p class="wallet__meta">Creates <code>${escapeHtml(r.name)}.&lt;label&gt;</code> with a new local key (F_sub ≈ 0.1 GULD).</p>
              <button type="submit" class="btn btn--outline">Register subaccount</button>
            </form>
          </details>`
              : ""
          }
          <details style="margin-top:0.75rem">
            <summary>Export private key</summary>
            ${renderExportKeySection(r.name, { id: `wallet-export-${r.name}` })}
          </details>
        </section>`;
    }

    hostEl.innerHTML = `
      <article class="wallet__card">
        <p class="wallet__name">${escapeHtml(r.name)}</p>
        <p class="wallet__meta">${escapeHtml(kind)}${escapeHtml(legacy)}</p>
        <p class="wallet__balance">${escapeHtml(balanceGuld)} <span class="wallet__meta">GULD</span></p>
      </article>
      ${sendSection}
      <section class="wallet__activity">
        <h2>Recent activity</h2>
        ${rows.length ? `<ul>${rows.join("")}</ul>` : `<p class="wallet__empty">No activity yet.</p>`}
      </section>
    `;

    bindExportKeySections(hostEl);

    hostEl.querySelector("[data-unlock-form]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
      try {
        await keyring.unlock(String(fd.get("pass") || ""));
        if (!keyring.getPriv(r.name)) throw new Error("Wrong passphrase");
        route();
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });

    hostEl.querySelector("[data-send-form]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
      const to = String(fd.get("to") || "")
        .trim()
        .toLowerCase();
      const amountQ = guldToQuanta(String(fd.get("amount") || "0"));
      const feeQ = guldToQuanta(String(fd.get("fee") || "0"));
      const memoRaw = String(fd.get("memo") || "").trim();
      const memoBytes = memoRaw ? new TextEncoder().encode(memoRaw) : undefined;
      if (memoBytes && memoBytes.length > 64) {
        setStatus("Memo exceeds 64 bytes", "error");
        return;
      }
      const privHex = keyring.getPriv(r.name);
      if (!privHex) {
        setStatus("Unlock your keyring first", "error");
        return;
      }
      setStatus("Sending…", "pending");
      try {
        const msg = await transferMessage(
          account.account_id,
          Number(account.nonce),
          to,
          amountQ,
          feeQ,
          memoBytes,
        );
        const sig = await sign(msg, fromHex(privHex));
        const body = {
          type: "transfer",
          from: r.name,
          to,
          amount: amountQ,
          signature: toHex(sig),
          inclusion_fee: feeQ,
        };
        if (memoRaw) body.memo = memoRaw;
        await apiPost(apiBase, "/chain/transactions", body);
        recordSend(to);
        if (fd.get("favorite")) saveContact({ name: to, favorite: true });
        setStatus("Transfer submitted", "ok");
        route();
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });

    hostEl.querySelector("[data-update-master-form]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
      let master = String(fd.get("master") || "").trim();
      if (!master.startsWith("0x")) master = `0x${master}`;
      const feeQ = guldToQuanta(String(fd.get("fee") || "0"));
      const privHex = keyring.getPriv(r.name);
      if (!privHex) return setStatus("Unlock keyring first", "error");
      setStatus("Submitting UpdateMaster…", "pending");
      try {
        const chainId = Number(st.chainId ?? 1);
        const msg = await cosignMessage(
          account.account_id,
          account.master_hash,
          master,
          Number(account.nonce),
          chainId,
        );
        const sig = await sign(msg, fromHex(privHex));
        await apiPost(apiBase, "/chain/transactions", {
          type: "update_master",
          name: r.name,
          new_master_hash: master,
          cosignatures: [{ key_index: 0, signature: toHex(sig) }],
          inclusion_fee: feeQ,
        });
        setStatus("UpdateMaster submitted", "ok");
        route();
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });

    hostEl.querySelector("[data-rotate-keys-form]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
      let pubHex = String(fd.get("pub") || "").trim();
      let privHexNew = String(fd.get("priv") || "").trim();
      if (!pubHex.startsWith("0x")) pubHex = `0x${pubHex}`;
      if (!privHexNew.startsWith("0x")) privHexNew = `0x${privHexNew}`;
      const feeQ = guldToQuanta(String(fd.get("fee") || "0"));
      const privHex = keyring.getPriv(r.name);
      if (!privHex) return setStatus("Unlock keyring first", "error");
      setStatus("Submitting RotateKeys…", "pending");
      try {
        const chainId = Number(st.chainId ?? 1);
        const intent = await rotateKeysIntentMessage(r.name, [pubHex], 1, feeQ);
        const newSig = await sign(intent, fromHex(privHexNew));
        const msg = await rotateKeysMessage(
          account.account_id,
          Number(account.nonce),
          chainId,
          [pubHex],
          1,
          feeQ,
        );
        const oldSig = await sign(msg, fromHex(privHex));
        await apiPost(apiBase, "/chain/transactions", {
          type: "rotate_keys",
          name: r.name,
          new_keys: [pubHex],
          new_threshold: 1,
          cosignatures: [{ key_index: 0, signature: toHex(oldSig) }],
          new_key_signature: toHex(newSig),
          inclusion_fee: feeQ,
        });
        if (keyring.isUnlocked()) {
          await keyring.upsertAccount({
            name: r.name,
            privHex: privHexNew,
            pubHex,
          });
        }
        setStatus("RotateKeys submitted — local key updated", "ok");
        route();
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });

    hostEl.querySelector("[data-register-sub-form]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
      const label = String(fd.get("label") || "")
        .trim()
        .toLowerCase();
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(label)) {
        setStatus("Invalid label (use lowercase letters, digits, hyphens)", "error");
        return;
      }
      const fullName = `${r.name}.${label}`;
      const endowmentQ = guldToQuanta(String(fd.get("endowment") || "0"));
      const feeQ = guldToQuanta(String(fd.get("fee") || "0"));
      const privHex = keyring.getPriv(r.name);
      if (!privHex) return setStatus("Unlock keyring first", "error");
      setStatus("Registering subaccount…", "pending");
      try {
        const feeEst = await apiGet(
          apiBase,
          `/chain/fees/registration?name=${encodeURIComponent(fullName)}&kind=subaccount&nKeys=1`,
        );
        const regFeeQ = String(feeEst.fee ?? feeEst.quanta ?? "0");
        const subPriv = await randomPrivateKey();
        const subPub = await pubkeyHex(subPriv);
        const intent = await registerSubIntentMessage(
          fullName,
          [subPub],
          1,
          DEFAULT_MASTER_HASH,
          endowmentQ,
          regFeeQ,
          feeQ,
        );
        const subSig = await sign(intent, subPriv);
        const parentMsg = await registerSubMessage(
          account.account_id,
          Number(account.nonce),
          fullName,
          [subPub],
          1,
          DEFAULT_MASTER_HASH,
          endowmentQ,
          regFeeQ,
          feeQ,
        );
        const parentSig = await sign(parentMsg, fromHex(privHex));
        await apiPost(apiBase, "/chain/transactions", {
          type: "register_subaccount",
          parent: r.name,
          label,
          keys: [subPub],
          threshold: 1,
          initial_master_hash: DEFAULT_MASTER_HASH,
          endowment: endowmentQ,
          parent_signature: toHex(parentSig),
          sub_signature: toHex(subSig),
          inclusion_fee: feeQ,
        });
        if (keyring.isUnlocked()) {
          await keyring.upsertAccount({
            name: fullName,
            privHex: toHex(subPriv),
            pubHex: subPub,
          });
        }
        setStatus(`Subaccount ${fullName} submitted`, "ok");
        location.hash = `#/account/${encodeURIComponent(fullName)}`;
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });
  } catch (err) {
    setStatus(/** @type {Error} */ (err).message, "error");
    hostEl.innerHTML = `<p class="wallet__empty">${escapeHtml(/** @type {Error} */ (err).message)}</p>`;
  }
}

route();
