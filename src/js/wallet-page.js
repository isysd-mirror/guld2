import "./chrome.js";
import { apiGet, apiPost, faucetDrip, faucetInfo, persistApiBase, resolveApiBase } from "./lib/api.js";
import { getLocalIdentity, LOGIN_HREF, REGISTER_HREF } from "./lib/auth.js";
import {
  buildCosignRequest,
  buildTxFromCosign,
  keyIndexForPub,
  mergeAndVerify,
  parseCosignRequest,
  parseCosignResponse,
  signCosignRequest,
  stringifyCosign,
  verifyCosignResponse,
} from "./lib/cosign.js";
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
import { parseRegistrationRequest, sponsorRegistration } from "./lib/sponsor.js";
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

/** @param {Record<string, unknown>} account @param {number|string|undefined} tipHeight */
function accountMetaHtml(account, tipHeight) {
  const kind = String(account.kind || "—");
  const threshold = Number(account.threshold ?? 1);
  const keys = Array.isArray(account.keys) ? account.keys : [];
  const legacy = account.legacy_locked || account.legacy?.status === "locked" ? " · legacy locked" : "";
  const expires = account.expires_at_height;
  let expiryLine = "";
  if (expires != null && String(expires) !== "18446744073709551615") {
    const exp = Number(expires);
    const tip = Number(tipHeight);
    const remaining = Number.isFinite(tip) && Number.isFinite(exp) ? exp - tip : null;
    let warn = "";
    if (remaining != null && remaining < 5000) {
      warn = remaining <= 0 ? " · overdue for settle" : " · renew soon (keep funded)";
    }
    expiryLine = `<p class="wallet__meta">Expires at height ${escapeHtml(String(expires))}${
      remaining != null ? ` (${remaining} blocks)` : ""
    }${warn}</p>`;
  }
  const keyRows = keys
    .map(
      (k, i) =>
        `<li><span class="wallet__meta">[${i}]</span> <code>${escapeHtml(String(k).slice(0, 18))}…</code></li>`,
    )
    .join("");
  return `
    <p class="wallet__meta">${escapeHtml(kind)} · ${threshold}-of-${keys.length || "?"} keys${escapeHtml(legacy)}</p>
    ${expiryLine}
    ${keys.length ? `<details><summary class="wallet__meta">Keys</summary><ul class="wallet__meta">${keyRows}</ul></details>` : ""}
  `;
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} account
 * @param {string} localPub
 */
function localKeyIndex(account, localPub) {
  const keys = Array.isArray(account.keys) ? account.keys.map(String) : [];
  return keyIndexForPub(keys, localPub);
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
            <a class="btn btn--outline" href="/register/?kind=group" style="margin-left:0.5rem">Create group</a>
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
            <a class="btn btn--outline" href="/register/?kind=group" style="margin-left:0.5rem">Create group</a>
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
    const threshold = Number(account.threshold ?? 1);
    const chainId = Number(st.chainId ?? 1);

    const rows = (activity.items || []).map((row) => {
      const sum = summarizeActivity(row);
      const h = row.height != null ? String(row.height) : "";
      const idx = row.tx_index;
      let when = escapeHtml(formatTime(row.timestamp ?? row.time ?? row.block_time));
      if (h && idx != null && Number.isFinite(Number(idx))) {
        when = `<a href="/explorer/#/tx/${h}/${idx}">h${escapeHtml(h)}:${escapeHtml(String(idx))}</a>`;
      } else if (h) {
        when = `<a href="/explorer/#/block/${h}">h${escapeHtml(h)}</a>`;
      }
      const primary =
        row.counterparty
          ? `<a href="/explorer/#/account/${encodeURIComponent(String(row.counterparty).toLowerCase())}">${escapeHtml(sum.primary)}</a>`
          : escapeHtml(sum.primary);
      return `<li><strong>${escapeHtml(sum.type)}</strong> ${primary} · ${escapeHtml(sum.amount)} GULD <span class="wallet__meta">${when}</span></li>`;
    });

    const local = getLocalIdentity();
    const canAct = local.name === r.name && keyring.hasStoredKey(r.name);
    const unlocked = canAct && keyring.hasLocalKey(r.name);
    const localPub = unlocked ? keyring.getAccount(r.name)?.pubHex : null;
    const myIndex =
      unlocked && localPub ? localKeyIndex(account, localPub) : -1;

    let sendSection = "";
    if (canAct && !unlocked) {
      sendSection = `
        <section class="wallet__send">
          <h2>Unlock</h2>
          <form class="wallet__form" data-unlock-form>
            <label>Passphrase <input name="pass" type="password" autocomplete="current-password" required /></label>
            <button type="submit" class="btn btn--outline">Unlock keyring</button>
          </form>
        </section>`;
    } else if (canAct && unlocked) {
      const suggestions = listSendSuggestions();
      const opts = suggestions
        .map((s) => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.label)}</option>`)
        .join("");
      const spendOk = threshold === 1;
      sendSection = `
        <section class="wallet__send">
          <h2>Send GULD</h2>
          ${
            spendOk
              ? `<form class="wallet__form" data-send-form>
            <label>To
              <input name="to" type="text" list="send-suggestions" spellcheck="false" required placeholder="bob" autocomplete="off" />
              <datalist id="send-suggestions">${opts}</datalist>
            </label>
            <label>Amount (GULD) <input name="amount" type="text" inputmode="decimal" required placeholder="1" /></label>
            <label>Inclusion fee (GULD) <input name="fee" type="text" inputmode="decimal" value="0.000001" /></label>
            <label>Memo (optional) <input name="memo" type="text" maxlength="64" placeholder="order id / invoice" /></label>
            <label class="wallet__check"><input name="favorite" type="checkbox" /> Save recipient as favorite</label>
            <button type="submit" class="btn btn--primary">Send</button>
          </form>`
              : `<p class="wallet__note">This account is ${threshold}-of-n. L0 <code>Transfer</code> still requires threshold 1 — fund a 1-of-1 subaccount or rotate keys to spend.</p>`
          }
          <div data-faucet-drip style="margin-top:1rem"></div>
        </section>
        <section class="wallet__send">
          <h2>Account management</h2>
          <p class="wallet__meta">This device ${
            myIndex >= 0 ? `holds key_index ${myIndex}` : "has no matching on-chain key"
          }.</p>
          <details open>
            <summary>Update master hash</summary>
            <form class="wallet__form" data-update-master-form>
              <label>New master hash (0x…32 bytes) <input name="master" type="text" spellcheck="false" required /></label>
              <label>Inclusion fee (GULD) <input name="fee" type="text" value="0.000001" /></label>
              <button type="submit" class="btn btn--outline">${
                threshold > 1 ? "Start cosign (UpdateMaster)" : "Submit UpdateMaster"
              }</button>
            </form>
          </details>
          <details style="margin-top:0.75rem">
            <summary>Rotate keys</summary>
            <form class="wallet__form" data-rotate-keys-form>
              <label>New public keys (one per line)
                <textarea name="pubs" rows="3" spellcheck="false" required placeholder="0x…"></textarea>
              </label>
              <label>New threshold <input name="threshold" type="number" min="1" value="1" required /></label>
              <label>New private key for keys[0] (0x…, kept locally after rotate)
                <input name="priv" type="password" spellcheck="false" autocomplete="off" required />
              </label>
              <label>Inclusion fee (GULD) <input name="fee" type="text" value="0.000001" /></label>
              <p class="wallet__meta" data-rotate-fee-hint>${
                kind === "group"
                  ? "Group: adding keys charges F_group delta; shrinking is inclusion only."
                  : "Inclusion fee only (individuals / subs)."
              }</p>
              <button type="submit" class="btn btn--outline">${
                threshold > 1 ? "Start cosign (RotateKeys)" : "Submit RotateKeys"
              }</button>
            </form>
          </details>
          <details style="margin-top:0.75rem" ${threshold > 1 ? "open" : ""}>
            <summary>Cosign workstation</summary>
            <p class="wallet__meta">Collect threshold signatures for tip advances and rotations. Copy/paste JSON (spec 14 §9.2.1).</p>
            <div data-cosign-host></div>
          </details>
          ${
            kind === "individual"
              ? `<details style="margin-top:0.75rem">
            <summary>Create subaccount</summary>
            <form class="wallet__form" data-register-sub-form>
              <label>Label (e.g. mobile) <input name="label" type="text" spellcheck="false" pattern="[a-z0-9]+(-[a-z0-9]+)*" required placeholder="mobile" /></label>
              <label>Endowment (GULD) <input name="endowment" type="text" inputmode="decimal" value="0.1" /></label>
              <label>Inclusion fee (GULD) <input name="fee" type="text" value="0.000001" /></label>
              <p class="wallet__meta">Creates <code>${escapeHtml(r.name)}.&lt;label&gt;</code> with a new local key (F_sub ≈ 0.1 GULD).</p>
              <button type="submit" class="btn btn--outline">Register subaccount</button>
            </form>
          </details>`
              : `<p class="wallet__meta" style="margin-top:0.75rem">Groups cannot open subaccounts.</p>`
          }
          <details style="margin-top:0.75rem">
            <summary>Sponsor a name</summary>
            <form class="wallet__form" data-sponsor-form>
              <label>Registration request JSON
                <textarea name="request" rows="6" required placeholder='{"version":1,"type":"register_group",...}'></textarea>
              </label>
              <button type="submit" class="btn btn--outline">Pay &amp; broadcast</button>
            </form>
          </details>
          <details style="margin-top:0.75rem">
            <summary>Export private key</summary>
            ${renderExportKeySection(r.name, { id: `wallet-export-${r.name}` })}
          </details>
          <p style="margin-top:0.75rem">
            <a class="btn btn--outline" href="/register/?kind=group">Create another group</a>
          </p>
        </section>`;
    } else {
      sendSection = `
        <section class="wallet__send">
          <h2>Cosign (any key holder)</h2>
          <p class="wallet__meta">Paste a cosign request to sign with a local key that matches this account, or look up your own account after unlocking.</p>
          <div data-cosign-guest></div>
        </section>`;
    }

    hostEl.innerHTML = `
      <article class="wallet__card">
        <p class="wallet__name">${escapeHtml(r.name)}</p>
        ${accountMetaHtml(account, st.height)}
        <p class="wallet__balance">${escapeHtml(balanceGuld)} <span class="wallet__meta">GULD</span></p>
      </article>
      ${sendSection}
      <section class="wallet__activity">
        <h2>Recent activity</h2>
        ${rows.length ? `<ul>${rows.join("")}</ul>` : `<p class="wallet__empty">No activity yet.</p>`}
      </section>
    `;

    bindExportKeySections(hostEl);

    const dripSlot = hostEl.querySelector("[data-faucet-drip]");
    if (dripSlot instanceof HTMLElement && unlocked) {
      void faucetInfo(apiBase)
        .then((info) => {
          if (!info?.ready) return;
          dripSlot.innerHTML = `
            <p class="wallet__note"><strong>Testnet faucet</strong> — request ${escapeHtml(String(info.dripGuld ?? 10))} GULD (cooldown applies; inclusion may take ~1 min of PoW).</p>
            <button type="button" class="btn btn--outline" data-request-drip>Request faucet drip</button>
          `;
          dripSlot.querySelector("[data-request-drip]")?.addEventListener("click", async () => {
            setStatus("Requesting faucet drip…", "pending");
            try {
              const before = Number(
                (await apiGet(apiBase, `/chain/accounts/${encodeURIComponent(r.name)}`))?.balance
                  ?.quanta ?? 0,
              );
              const out = await faucetDrip(apiBase, r.name);
              const txid = out?.result?.tx_id || "";
              setStatus(
                `Faucet queued ${out?.amountGuld ?? 10} GULD · tx ${txid || "ok"} — waiting for block…`,
                "pending",
              );
              for (let i = 0; i < 45; i++) {
                await new Promise((res) => setTimeout(res, 4000));
                try {
                  if (txid) {
                    const tx = await apiGet(
                      apiBase,
                      `/chain/transactions/${encodeURIComponent(txid)}`,
                    );
                    if (tx && tx.pending !== true && tx.height != null) {
                      setStatus(`Faucet drip included · tx ${txid}`, "ok");
                      route();
                      return;
                    }
                  }
                  const after = Number(
                    (await apiGet(apiBase, `/chain/accounts/${encodeURIComponent(r.name)}`))
                      ?.balance?.quanta ?? 0,
                  );
                  if (after > before) {
                    setStatus(`Faucet drip included · tx ${txid || "ok"}`, "ok");
                    route();
                    return;
                  }
                } catch {
                  /* keep waiting */
                }
              }
              setStatus(
                `Drip still pending · tx ${txid || "ok"} — refresh the wallet shortly.`,
                "pending",
              );
              route();
            } catch (err) {
              setStatus(/** @type {Error} */ (err).message, "error");
            }
          });
        })
        .catch(() => {});
    }

    const cosignMount =
      hostEl.querySelector("[data-cosign-host]") || hostEl.querySelector("[data-cosign-guest]");
    if (cosignMount instanceof HTMLElement) {
      mountCosignWorkstation(cosignMount, {
        name: r.name,
        account,
        chainId,
        localIndex: myIndex,
        canSign: unlocked && myIndex >= 0,
        getPriv: () => keyring.getPriv(r.name),
      });
    }

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
      if (threshold !== 1) {
        setStatus("Threshold > 1 cannot Transfer yet", "error");
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
      try {
        if (threshold === 1 && myIndex === 0) {
          setStatus("Submitting UpdateMaster…", "pending");
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
            cosignatures: [{ key_index: myIndex >= 0 ? myIndex : 0, signature: toHex(sig) }],
            inclusion_fee: feeQ,
          });
          setStatus("UpdateMaster submitted", "ok");
          route();
          return;
        }
        const req = buildCosignRequest({
          op: "update_master",
          name: r.name,
          account,
          chainId,
          inclusionFee: feeQ,
          newMasterHash: master,
          alreadySigned: [],
        });
        if (myIndex >= 0) {
          const res = await signCosignRequest(req, { key_index: myIndex, privHex });
          req.needed = req.needed.filter((i) => i !== myIndex);
          const mount = hostEl.querySelector("[data-cosign-host]");
          if (mount instanceof HTMLElement) {
            mountCosignWorkstation(mount, {
              name: r.name,
              account,
              chainId,
              localIndex: myIndex,
              canSign: true,
              getPriv: () => keyring.getPriv(r.name),
              seedRequest: req,
              seedSigs: new Map([[myIndex, res.signature]]),
            });
            mount.closest("details")?.setAttribute("open", "true");
          }
          setStatus(`Cosign started — ${1}/${threshold} signatures. Share the request.`, "ok");
        } else {
          setStatus("No local key for this account — paste request into Cosign workstation.", "error");
        }
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });

    const rotateForm = hostEl.querySelector("[data-rotate-keys-form]");
    const rotateHint = hostEl.querySelector("[data-rotate-fee-hint]");
    const nOld = Array.isArray(account.keys) ? account.keys.length : 0;

    async function refreshRotateFeeHint() {
      if (!(rotateForm instanceof HTMLFormElement) || !(rotateHint instanceof HTMLElement)) return;
      if (kind !== "group") return;
      const pubsRaw = String(new FormData(rotateForm).get("pubs") || "");
      const nNew = pubsRaw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean).length;
      if (!nNew) {
        rotateHint.textContent =
          "Group: adding keys charges F_group delta; shrinking is inclusion only.";
        return;
      }
      if (nNew <= nOld) {
        rotateHint.textContent = `Key set ${nOld} → ${nNew}: no protocol expansion fee (inclusion only).`;
        return;
      }
      try {
        const [fNew, fOld] = await Promise.all([
          apiGet(
            apiBase,
            `/chain/fees/registration?kind=group&name=${encodeURIComponent(r.name)}&nKeys=${nNew}`,
          ),
          apiGet(
            apiBase,
            `/chain/fees/registration?kind=group&name=${encodeURIComponent(r.name)}&nKeys=${nOld}`,
          ),
        ]);
        const delta = BigInt(String(fNew.fee ?? "0")) - BigInt(String(fOld.fee ?? "0"));
        rotateHint.textContent = `Key set ${nOld} → ${nNew}: expansion fee ≈ ${quantaToGuld(String(delta))} GULD (plus inclusion).`;
      } catch (err) {
        rotateHint.textContent = `Could not estimate expansion fee: ${/** @type {Error} */ (err).message}`;
      }
    }
    rotateForm?.querySelector("[name=pubs]")?.addEventListener("input", () => {
      refreshRotateFeeHint();
    });

    hostEl.querySelector("[data-rotate-keys-form]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
      const pubs = String(fd.get("pubs") || "")
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((h) => (h.startsWith("0x") ? h.toLowerCase() : `0x${h.toLowerCase()}`));
      const newThreshold = Number(fd.get("threshold") || 1);
      let privHexNew = String(fd.get("priv") || "").trim();
      if (!privHexNew.startsWith("0x")) privHexNew = `0x${privHexNew}`;
      const feeQ = guldToQuanta(String(fd.get("fee") || "0"));
      const privHex = keyring.getPriv(r.name);
      if (!privHex) return setStatus("Unlock keyring first", "error");
      if (!pubs.length || newThreshold < 1 || newThreshold > pubs.length) {
        return setStatus("Invalid new keys / threshold", "error");
      }
      if (kind === "group" && pubs.length > nOld) {
        try {
          const [fNew, fOld] = await Promise.all([
            apiGet(
              apiBase,
              `/chain/fees/registration?kind=group&name=${encodeURIComponent(r.name)}&nKeys=${pubs.length}`,
            ),
            apiGet(
              apiBase,
              `/chain/fees/registration?kind=group&name=${encodeURIComponent(r.name)}&nKeys=${nOld}`,
            ),
          ]);
          const delta = BigInt(String(fNew.fee ?? "0")) - BigInt(String(fOld.fee ?? "0"));
          if (
            !confirm(
              `This expands the group ${nOld} → ${pubs.length} keys.\nProtocol expansion fee ≈ ${quantaToGuld(String(delta))} GULD (vested to miners), plus inclusion.\nContinue?`,
            )
          ) {
            return;
          }
        } catch (err) {
          return setStatus(/** @type {Error} */ (err).message, "error");
        }
      }
      try {
        const intent = await rotateKeysIntentMessage(r.name, pubs, newThreshold, feeQ);
        const newSig = await sign(intent, fromHex(privHexNew));
        if (threshold === 1 && myIndex === 0) {
          setStatus("Submitting RotateKeys…", "pending");
          const msg = await rotateKeysMessage(
            account.account_id,
            Number(account.nonce),
            chainId,
            pubs,
            newThreshold,
            feeQ,
          );
          const oldSig = await sign(msg, fromHex(privHex));
          await apiPost(apiBase, "/chain/transactions", {
            type: "rotate_keys",
            name: r.name,
            new_keys: pubs,
            new_threshold: newThreshold,
            cosignatures: [{ key_index: 0, signature: toHex(oldSig) }],
            new_key_signature: toHex(newSig),
            inclusion_fee: feeQ,
          });
          if (keyring.isUnlocked()) {
            await keyring.upsertAccount({
              name: r.name,
              privHex: privHexNew,
              pubHex: pubs[0],
            });
          }
          setStatus("RotateKeys submitted — local key updated", "ok");
          route();
          return;
        }
        const req = buildCosignRequest({
          op: "rotate_keys",
          name: r.name,
          account,
          chainId,
          inclusionFee: feeQ,
          newKeys: pubs,
          newThreshold,
        });
        const mount = hostEl.querySelector("[data-cosign-host]");
        if (mount instanceof HTMLElement) {
          const seedSigs = new Map();
          if (myIndex >= 0) {
            const res = await signCosignRequest(req, { key_index: myIndex, privHex });
            seedSigs.set(myIndex, res.signature);
            req.needed = req.needed.filter((i) => i !== myIndex);
          }
          mountCosignWorkstation(mount, {
            name: r.name,
            account,
            chainId,
            localIndex: myIndex,
            canSign: myIndex >= 0,
            getPriv: () => keyring.getPriv(r.name),
            seedRequest: req,
            seedSigs,
            newKeySignature: toHex(newSig),
            newPrivHex: privHexNew,
            newPubHex: pubs[0],
          });
          mount.closest("details")?.setAttribute("open", "true");
          setStatus(
            `Cosign RotateKeys — ${seedSigs.size}/${threshold} old-key signatures. Share the request.`,
            "ok",
          );
        }
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

    hostEl.querySelector("[data-sponsor-form]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
      try {
        const req = parseRegistrationRequest(String(fd.get("request") || ""));
        setStatus(`Sponsoring “${req.name}”…`, "pending");
        const result = await sponsorRegistration(apiBase, r.name, req);
        setStatus(
          `Sponsored ${req.name} · tx ${result.tx_id || "ok"}${result.mined ? " (mined)" : ""}`,
          "ok",
        );
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });
  } catch (err) {
    setStatus(/** @type {Error} */ (err).message, "error");
    hostEl.innerHTML = `<p class="wallet__empty">${escapeHtml(/** @type {Error} */ (err).message)}</p>`;
  }
}

/**
 * @param {HTMLElement} mount
 * @param {{
 *   name: string,
 *   account: Record<string, unknown>,
 *   chainId: number,
 *   localIndex: number,
 *   canSign: boolean,
 *   getPriv: () => string | null | undefined,
 *   seedRequest?: import("./lib/cosign.js").CosignRequest,
 *   seedSigs?: Map<number, string>,
 *   newKeySignature?: string,
 *   newPrivHex?: string,
 *   newPubHex?: string,
 * }} opts
 */
function mountCosignWorkstation(mount, opts) {
  /** @type {import("./lib/cosign.js").CosignRequest | null} */
  let req = opts.seedRequest || null;
  /** @type {Map<number, string>} */
  const sigs = opts.seedSigs ? new Map(opts.seedSigs) : new Map();
  let newKeySignature = opts.newKeySignature || "";

  function render() {
    const threshold = req ? req.threshold : Number(opts.account.threshold ?? 1);
    const progress = req ? `${sigs.size} / ${threshold}` : "—";
    const ready = req && sigs.size >= threshold;
    mount.innerHTML = `
      <form class="wallet__form" data-cosign-import-req>
        <label>Import / paste cosign request
          <textarea name="req" rows="5" spellcheck="false" placeholder='{"v":1,"type":"guld1cosignreq",...}'>${
            req ? escapeHtml(stringifyCosign(req).trim()) : ""
          }</textarea>
        </label>
        <button type="submit" class="btn btn--outline">Load request</button>
      </form>
      ${
        req
          ? `<p class="wallet__meta">Op <code>${escapeHtml(req.op)}</code> · progress <strong>${progress}</strong> · needed [${req.needed.join(", ")}]</p>
        <p style="margin-top:0.5rem">
          <button type="button" class="btn btn--outline" data-copy-req>Copy request</button>
          ${
            opts.canSign
              ? `<button type="button" class="btn btn--outline" data-sign-local style="margin-left:0.5rem">Sign with key_index ${opts.localIndex}</button>`
              : ""
          }
        </p>
        <form class="wallet__form" data-cosign-import-res style="margin-top:0.75rem">
          <label>Import cosign response
            <textarea name="res" rows="4" spellcheck="false" placeholder='{"v":1,"type":"guld1cosignres",...}'></textarea>
          </label>
          <button type="submit" class="btn btn--outline">Add signature</button>
        </form>
        ${
          req.op === "rotate_keys"
            ? `<label class="wallet__meta" style="display:block;margin-top:0.75rem">new_key_signature (from keys[0] of new set)
                <input data-new-key-sig type="text" spellcheck="false" value="${escapeHtml(newKeySignature)}" />
              </label>`
            : ""
        }
        <p style="margin-top:0.75rem">
          <button type="button" class="btn btn--primary" data-broadcast ${ready ? "" : "disabled"}>Broadcast</button>
        </p>`
          : ""
      }
    `;

    mount.querySelector("[data-cosign-import-req]")?.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
      try {
        req = parseCosignRequest(String(fd.get("req") || ""));
        if (req.name !== opts.name) {
          throw new Error(`Request is for “${req.name}”, this page is “${opts.name}”`);
        }
        if (String(req.account_id) !== String(opts.account.account_id)) {
          throw new Error("account_id mismatch — refresh account and rebuild request");
        }
        if (String(req.nonce) !== String(opts.account.nonce)) {
          throw new Error("Stale nonce — tip moved; rebuild the cosign request");
        }
        sigs.clear();
        newKeySignature = "";
        setStatus(`Loaded ${req.op} cosign request`, "ok");
        render();
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });

    mount.querySelector("[data-copy-req]")?.addEventListener("click", async () => {
      if (!req) return;
      try {
        await navigator.clipboard.writeText(stringifyCosign(req));
        setStatus("Cosign request copied", "ok");
      } catch {
        setStatus("Copy failed — select the textarea", "error");
      }
    });

    mount.querySelector("[data-sign-local]")?.addEventListener("click", async () => {
      if (!req || !opts.canSign) return;
      const priv = opts.getPriv();
      if (!priv) return setStatus("Unlock keyring first", "error");
      try {
        // Ensure this index is still listed as needed (or already collected)
        if (!req.needed.includes(opts.localIndex) && !sigs.has(opts.localIndex)) {
          req.needed = [...req.needed, opts.localIndex];
        }
        const res = await signCosignRequest(req, {
          key_index: opts.localIndex,
          privHex: priv,
        });
        await verifyCosignResponse(res, req.keys);
        sigs.set(opts.localIndex, res.signature);
        req.needed = req.needed.filter((i) => i !== opts.localIndex);
        setStatus(`Signed as key_index ${opts.localIndex}`, "ok");
        render();
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });

    mount.querySelector("[data-cosign-import-res]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!req) return;
      const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
      try {
        const res = parseCosignResponse(String(fd.get("res") || ""));
        if (res.name !== req.name || res.nonce !== req.nonce || res.op !== req.op) {
          throw new Error("Response does not match loaded request");
        }
        await verifyCosignResponse(res, req.keys);
        sigs.set(res.key_index, res.signature);
        req.needed = req.needed.filter((i) => i !== res.key_index);
        setStatus(`Added signature from key_index ${res.key_index}`, "ok");
        render();
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });

    mount.querySelector("[data-broadcast]")?.addEventListener("click", async () => {
      if (!req) return;
      const sigInput = mount.querySelector("[data-new-key-sig]");
      if (sigInput instanceof HTMLInputElement) newKeySignature = sigInput.value.trim();
      try {
        const live = await apiGet(apiBase, `/chain/accounts/${encodeURIComponent(opts.name)}`);
        const liveAcct = live.account || {};
        if (String(liveAcct.nonce) !== req.nonce) {
          throw new Error("Stale nonce on chain — rebuild cosign session");
        }
        if (String(liveAcct.account_id) !== req.account_id) {
          throw new Error("account_id changed");
        }
        const cosignatures = await mergeAndVerify(
          req,
          sigs,
          Array.isArray(liveAcct.keys) ? liveAcct.keys.map(String) : req.keys,
        );
        if (cosignatures.length < req.threshold) {
          throw new Error(`Need ${req.threshold} signatures, have ${cosignatures.length}`);
        }
        if (req.op === "rotate_keys" && !newKeySignature) {
          throw new Error("new_key_signature required for RotateKeys");
        }
        const tx = buildTxFromCosign(req, cosignatures, newKeySignature || undefined);
        setStatus("Broadcasting…", "pending");
        await apiPost(apiBase, "/chain/transactions", tx);
        if (req.op === "rotate_keys" && opts.newPrivHex && opts.newPubHex && keyring.isUnlocked()) {
          await keyring.upsertAccount({
            name: opts.name,
            privHex: opts.newPrivHex,
            pubHex: opts.newPubHex,
          });
        }
        setStatus(`${req.op} submitted`, "ok");
        route();
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });
  }

  render();
}

route();
