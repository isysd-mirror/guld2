import "./chrome.js";
import {
  accountExists,
  apiGet,
  apiPost,
  faucetDrip,
  faucetInfo,
  resolveApiBase,
  searchAccounts,
} from "./lib/api.js";
import { AUTH_EVENT, getLocalIdentity, LOGIN_HREF, REGISTER_HREF } from "./lib/auth.js";
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
import {
  backfillRecentFromActivity,
  listSendSuggestions,
  recordSend,
  saveContact,
} from "./lib/contacts.js";
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
  activityConfirmations,
  activityIsUnconfirmed,
} from "./lib/rpc.js";
import { parseRegistrationRequest, sponsorRegistration } from "./lib/sponsor.js";
import {
  extractTxId,
  explorerPendingTxHref,
  formatTxSubmittedHtml,
  statusSlotHtml,
} from "./lib/tx-feedback.js";
import { currencyTicker, loadNetworkInfo } from "./lib/network.js";
import { setActiveName } from "./lib/wallet-session.js";
import { walletAccountHref, walletNameFromHash } from "./lib/wallet-nav.js";

const statusEl = document.querySelector("[data-wallet-status]");
const hostEl = document.querySelector("[data-wallet-host]");

/** @type {string} */
let apiBase = resolveApiBase();

/** Survives route() remount so explorer links stay visible after refresh. */
/** @type {{ html: string, state: string, selector: string } | null} */
let statusFlash = null;

/** Survives keyring→AUTH remount after Generate public key. */
/** @type {{ name: string, pubHex: string } | null} */
let pendingPubkeyReveal = null;

/**
 * @param {string} html
 * @param {"ok"|"error"|"pending"} [state]
 * @param {string} [selector]
 */
function flashStatus(html, state = "ok", selector = "[data-send-form]") {
  statusFlash = { html, state, selector };
}

/**
 * @param {ParentNode | Element | null | undefined} root
 * @param {{ name: string, pubHex: string }} reveal
 */
function revealGeneratedPubkey(root, reveal) {
  if (!root) return;
  const result = root.querySelector("[data-generate-pubkey-result]");
  const pubInput = root.querySelector("[data-gen-pub]");
  const nameInput = root.querySelector("[data-generate-pubkey-form] [name=name]");
  if (result instanceof HTMLElement) result.hidden = false;
  if (pubInput instanceof HTMLInputElement) pubInput.value = reveal.pubHex;
  if (nameInput instanceof HTMLInputElement && !nameInput.value) {
    nameInput.value = reveal.name;
  }
}

window.addEventListener("hashchange", () => route());
document.addEventListener(AUTH_EVENT, () => route());

/** Ignore stale async route() results when a newer navigation starts. */
let routeGen = 0;

/**
 * @returns {{ view: "gate" } | { view: "account", name: string }}
 */
function parseRoute() {
  const id = getLocalIdentity();
  if (!id.hasKey || !id.name) return { view: "gate" };
  const fromHash = walletNameFromHash(location.hash);
  const name = (fromHash || id.name).trim().toLowerCase();
  if (!keyring.hasStoredKey(name)) {
    return { view: "account", name: id.name };
  }
  return { view: "account", name };
}

function setStatus(text, state = "ok") {
  if (!(statusEl instanceof HTMLElement)) return;
  statusEl.textContent = text;
  statusEl.dataset.state = state;
}

/**
 * @param {ParentNode | Element | null | undefined} scope
 * @param {string} text
 * @param {"ok"|"error"|"pending"} [state]
 * @param {{ html?: boolean }} [opts]
 */
function setPanelStatus(scope, text, state = "ok", opts = {}) {
  const el =
    scope instanceof Element && scope.matches?.("[data-panel-status]")
      ? scope
      : scope?.querySelector?.("[data-panel-status]");
  if (!(el instanceof HTMLElement)) return;
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    el.removeAttribute("data-state");
    return;
  }
  el.hidden = false;
  if (opts.html) el.innerHTML = text;
  else el.textContent = text;
  el.dataset.state = state;
}

function applyStatusFlash() {
  if (!statusFlash || !(hostEl instanceof HTMLElement)) return;
  const { html, state, selector } = statusFlash;
  statusFlash = null;
  const scope =
    hostEl.querySelector(selector) ||
    hostEl.querySelector("[data-send-form]") ||
    hostEl.querySelector("[data-unlock-form]") ||
    hostEl.querySelector(".wallet__view") ||
    hostEl;
  setPanelStatus(scope, html, state, { html: true });
  const details = scope instanceof Element ? scope.closest("details") : null;
  if (details instanceof HTMLDetailsElement) details.open = true;
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

/**
 * @param {string} content
 */
function renderWalletView(content) {
  return `<section class="wallet__view">${content}</section>`;
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

/** Normalize pubkey hex for comparison. */
function normPub(h) {
  const s = String(h || "").trim().toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

/**
 * Fetch tip account and ensure the local key still controls spend.
 * @param {string} name
 * @param {string} localPub
 */
async function requireLiveSpendKey(name, localPub) {
  const live = await apiGet(apiBase, `/chain/accounts/${encodeURIComponent(name)}`);
  const account = /** @type {Record<string, unknown>} */ (live.account || {});
  const idx = localKeyIndex(account, localPub);
  const thr = Number(account.threshold ?? 1);
  if (idx < 0) {
    const onChain = Array.isArray(account.keys) ? account.keys.map(String)[0] : "";
    throw new Error(
      `Local key does not match on-chain keys[0] (${String(onChain).slice(0, 18)}…). ` +
        `After RotateKeys, re-import the new private key (Log in → paste key) or your spends will be rejected.`,
    );
  }
  if (thr === 1 && idx !== 0) {
    throw new Error("Threshold-1 transfers must be signed by keys[0]");
  }
  return account;
}

async function route() {
  const gen = ++routeGen;
  const r = parseRoute();
  if (!(hostEl instanceof HTMLElement)) return;

  if (r.view === "gate") {
    const net = await loadNetworkInfo(apiBase);
    if (gen !== routeGen) return;
    const ticker = currencyTicker(net);
    const next = `${location.pathname}${location.search}${location.hash || ""}`;
    hostEl.innerHTML = `
      <article class="wallet__card">
        <p class="wallet__name">Wallet</p>
        <p class="wallet__meta">Log in with a local key to send ${ticker} and review your activity.</p>
        <p class="wallet__actions">
          <a class="btn btn--primary" href="${LOGIN_HREF}?next=${encodeURIComponent(next)}">Log in</a>
          <a class="btn btn--outline" href="${REGISTER_HREF}">Sign up</a>
        </p>
      </article>`;
    setStatus("Sign in required", "pending");
    return;
  }

  // Normalize hash synchronously before any await. Concurrent route() calls used to
  // resume after loadNetworkInfo with a stale account and location.replace each other
  // (e.g. isysd ↔ isysd.mobile) in a tight loop when switching accounts.
  const wantHash = `#/account/${encodeURIComponent(r.name)}`;
  if ((location.hash || "") !== wantHash) {
    location.replace(`${location.pathname}${location.search}${wantHash}`);
    return;
  }

  setActiveName(r.name);
  hostEl.innerHTML = `<p class="doc-status">Loading ${escapeHtml(r.name)}…</p>`;
  setStatus("Loading…", "pending");

  try {
    const net = await loadNetworkInfo(apiBase);
    if (gen !== routeGen) return;
    const ticker = currencyTicker(net);
    const [st, acct] = await Promise.all([
      apiGet(apiBase, "/chain/status"),
      apiGet(apiBase, `/chain/accounts/${encodeURIComponent(r.name)}`),
    ]);
    if (gen !== routeGen) return;
    const activity = await apiGet(
      apiBase,
      `/chain/accounts/${encodeURIComponent(r.name)}/activity?limit=25`,
    );
    if (gen !== routeGen) return;
    backfillRecentFromActivity(activity.items || []);

    setStatus(`Height ${st.height ?? "—"}`);
    const account = acct.account || {};
    const balanceGuld = acct.balance?.guld ?? quantaToGuld(acct.balance?.quanta || "0");
    const kind = account.kind || "—";
    const threshold = Number(account.threshold ?? 1);
    const chainId = Number(st.chainId ?? 1);
    const tipHeight = Number(st.height ?? 0);

    const rows = (activity.items || []).map((row) => {
      const sum = summarizeActivity(row);
      const h = row.height != null ? String(row.height) : "";
      const idx = row.tx_index;
      const unconfirmed = activityIsUnconfirmed(row);
      const conf = activityConfirmations(row, tipHeight);
      let when = "";
      if (unconfirmed) {
        const href = explorerPendingTxHref(row.tx_id);
        when = `<a href="${href}" class="wallet__conf wallet__conf--unconfirmed">Unconfirmed</a>`;
      } else {
        const confLabel =
          conf != null
            ? `<span class="wallet__conf">${conf === 1 ? "1 confirmation" : `${conf} confirmations`}</span>`
            : "";
        if (h && idx != null && Number.isFinite(Number(idx))) {
          when = `<a href="/explorer/#/tx/${h}/${idx}">h${escapeHtml(h)}:${escapeHtml(String(idx))}</a>${
            confLabel ? ` · ${confLabel}` : ""
          }`;
        } else if (h) {
          when = `<a href="/explorer/#/block/${h}">h${escapeHtml(h)}</a>${
            confLabel ? ` · ${confLabel}` : ""
          }`;
        } else {
          when = confLabel || escapeHtml(formatTime(row.timestamp ?? row.time ?? row.block_time));
        }
      }
      const primary =
        row.counterparty
          ? `<a href="/explorer/#/account/${encodeURIComponent(String(row.counterparty).toLowerCase())}">${escapeHtml(sum.primary)}</a>`
          : escapeHtml(sum.primary);
      const liClass = unconfirmed ? ` class="wallet__activity-item wallet__activity-item--unconfirmed"` : "";
      return `<li${liClass}><strong>${escapeHtml(sum.type)}</strong> ${primary} · ${escapeHtml(sum.amount)} ${ticker} <span class="wallet__meta">${when}</span></li>`;
    });

    const unlocked = keyring.hasLocalKey(r.name);
    const localPub = unlocked ? keyring.getAccount(r.name)?.pubHex : null;
    const myIndex =
      unlocked && localPub ? localKeyIndex(account, localPub) : -1;

    let sendPanel = "";
    if (!unlocked) {
      sendPanel = `
        <article class="wallet__card wallet__card--plain">
          <h2 class="wallet__panel-title">Unlock to send</h2>
          <form class="wallet__form" data-unlock-form>
            <label>Passphrase <input name="pass" type="password" autocomplete="current-password" required /></label>
            <button type="submit" class="btn btn--primary">Unlock keyring</button>
            ${statusSlotHtml()}
          </form>
        </article>`;
    } else {
      const canSpend = myIndex >= 0;
      sendPanel = `
        <article class="wallet__card wallet__card--plain">
          <h2 class="wallet__panel-title">Send ${ticker}</h2>
          ${
            !canSpend
              ? `<p class="wallet__note">This device’s key no longer matches any on-chain key for this account. ` +
                `That usually means a RotateKeys completed but the local keyring was not updated ` +
                `(e.g. the browser timed out while PoW sealed the block). ` +
                `Re-import the <strong>new</strong> private key via <a href="${LOGIN_HREF}">Log in</a>, ` +
                `or rotate again from a device that still holds a controlling key.</p>
            ${statusSlotHtml()}`
              : `<form class="wallet__form" data-send-form>
            <label>To
              <input name="to" type="text" spellcheck="false" required placeholder="bob" autocomplete="off" />
            </label>
            <div data-send-suggest class="wallet__suggest" hidden></div>
            <p class="wallet__meta" data-send-to-hint aria-live="polite"></p>
            <label>Amount (${ticker}) <input name="amount" type="text" inputmode="decimal" required placeholder="1" /></label>
            <label>Inclusion fee (${ticker}) <input name="fee" type="text" inputmode="decimal" value="0.000001" /></label>
            <label>Memo (optional) <input name="memo" type="text" maxlength="64" placeholder="order id / invoice" /></label>
            <label class="wallet__check"><input name="favorite" type="checkbox" /> Save recipient as favorite</label>
            <button type="submit" class="btn btn--primary">${
              threshold > 1 ? "Start cosign (Transfer)" : "Send"
            }</button>
            ${
              threshold > 1
                ? `<p class="wallet__meta">This account is ${threshold}-of-n — collect signatures in the cosign workstation below.</p>`
                : ""
            }
            ${statusSlotHtml()}
          </form>`
          }
          <div class="wallet__spacer" data-faucet-drip></div>
        </article>`;
    }

    const historyPanel = `
      <article class="wallet__card wallet__card--plain">
        <h2 class="wallet__panel-title">Recent activity</h2>
        <div class="wallet__activity">${rows.length ? `<ul>${rows.join("")}</ul>` : `<p class="wallet__empty">No activity yet.</p>`}</div>
        <p class="wallet__actions">
          <a class="btn btn--outline" href="/explorer/#/account/${encodeURIComponent(r.name)}">Open in explorer</a>
        </p>
      </article>`;

    let advancedPanel = "";
    if (unlocked) {
      advancedPanel = `
        <details class="wallet__advanced" id="advanced">
          <summary>Advanced</summary>
          <p class="wallet__meta">This device ${
            myIndex >= 0 ? `holds key_index ${myIndex}` : "has no matching on-chain key"
          }.</p>
          <article class="wallet__card wallet__card--plain">
            <h2 class="wallet__panel-title">Update master hash</h2>
            <form class="wallet__form" data-update-master-form>
              <label>New master hash (0x…32 bytes) <input name="master" type="text" spellcheck="false" required /></label>
              <label>Inclusion fee (${ticker}) <input name="fee" type="text" value="0.000001" /></label>
              <button type="submit" class="btn btn--outline">${
                threshold > 1 ? "Start cosign (UpdateMaster)" : "Submit UpdateMaster"
              }</button>
              ${statusSlotHtml()}
            </form>
          </article>
          <article class="wallet__card wallet__card--plain">
            <h2 class="wallet__panel-title">Rotate keys</h2>
            <form class="wallet__form" data-rotate-keys-form>
              <p class="wallet__actions wallet__actions--flush">
                <button type="button" class="btn btn--outline" data-rotate-generate>Generate new key</button>
              </p>
              <p class="wallet__meta">Shortcut fills <code>keys[0]</code> and the private-key field with a fresh Ed25519 pair.</p>
              <label>New public keys (one per line)
                <textarea name="pubs" rows="3" spellcheck="false" required placeholder="0x…"></textarea>
              </label>
              <label>New threshold <input name="threshold" type="number" min="1" value="1" required /></label>
              <label>New private key for keys[0] (0x…, kept locally after rotate)
                <input name="priv" type="password" spellcheck="false" autocomplete="off" required />
              </label>
              <label>Inclusion fee (${ticker}) <input name="fee" type="text" value="0.000001" /></label>
              <p class="wallet__meta" data-rotate-fee-hint>${
                kind === "group"
                  ? "Group: adding keys charges F_group delta; shrinking is inclusion only."
                  : "Inclusion fee only (individuals / subs)."
              }</p>
              <button type="submit" class="btn btn--outline">${
                threshold > 1 ? "Start cosign (RotateKeys)" : "Submit RotateKeys"
              }</button>
              ${statusSlotHtml()}
            </form>
          </article>
          <article class="wallet__card wallet__card--plain">
            <h2 class="wallet__panel-title">Cosign workstation</h2>
            <p class="wallet__meta">Collect threshold signatures for tip advances and rotations.</p>
            <div data-cosign-host></div>
          </article>
          ${
            kind === "individual"
              ? `<article class="wallet__card wallet__card--plain">
            <h2 class="wallet__panel-title">Create subaccount</h2>
            <form class="wallet__form" data-register-sub-form>
              <label>Label (e.g. mobile) <input name="label" type="text" spellcheck="false" pattern="[a-z0-9]+(-[a-z0-9]+)*" required placeholder="mobile" /></label>
              <label>Endowment (${ticker}) <input name="endowment" type="text" inputmode="decimal" value="0.1" /></label>
              <label>Inclusion fee (${ticker}) <input name="fee" type="text" value="0.000001" /></label>
              <p class="wallet__meta">Creates <code>${escapeHtml(r.name)}.&lt;label&gt;</code> with a new local key.</p>
              <button type="submit" class="btn btn--outline">Register subaccount</button>
              ${statusSlotHtml()}
            </form>
          </article>`
              : `<p class="wallet__meta">Groups cannot open subaccounts.</p>`
          }
          <article class="wallet__card wallet__card--plain">
            <h2 class="wallet__panel-title">Generate public key</h2>
            <p class="wallet__meta">Make a local key for a name that is not on this device yet — typically a group you will co-sign. Share the public key with the registrant; the private key stays encrypted in your keyring under that name.</p>
            <form class="wallet__form" data-generate-pubkey-form>
              <label>Account name
                <input name="name" type="text" spellcheck="false" autocomplete="off" required
                  placeholder="treasury" pattern="[a-zA-Z][a-zA-Z0-9_\\-]{1,31}" />
              </label>
              <button type="submit" class="btn btn--outline">Generate &amp; save to keyring</button>
              ${statusSlotHtml()}
            </form>
            <div class="wallet__spacer--sm" data-generate-pubkey-result hidden>
              <label>Public key (share this)
                <input data-gen-pub type="text" readonly spellcheck="false" />
              </label>
              <p class="wallet__actions wallet__actions--flush">
                <button type="button" class="btn btn--outline" data-copy-gen-pub>Copy public key</button>
              </p>
            </div>
          </article>
          <article class="wallet__card wallet__card--plain">
            <h2 class="wallet__panel-title">Sponsor a name</h2>
            <form class="wallet__form" data-sponsor-form>
              <label>Registration request JSON
                <textarea name="request" rows="6" required placeholder='{"version":1,"type":"register_group",...}'></textarea>
              </label>
              <button type="submit" class="btn btn--outline">Pay &amp; broadcast</button>
              ${statusSlotHtml()}
            </form>
          </article>
          <article class="wallet__card wallet__card--plain">
            <h2 class="wallet__panel-title">Export private key</h2>
            ${renderExportKeySection(r.name, { id: `wallet-export-${r.name}` })}
          </article>
          <p class="wallet__actions"><a class="btn btn--outline" href="/register/?kind=group">Create another group</a></p>
        </details>`;
    } else {
      advancedPanel = `
        <details class="wallet__advanced" id="advanced">
          <summary>Advanced</summary>
          <p class="wallet__empty">Unlock your keyring to use advanced tools.</p>
        </details>`;
    }

    if (gen !== routeGen) return;
    hostEl.innerHTML = `
      <article class="wallet__card wallet__card--summary">
        <div class="wallet__name-row">
          <p class="wallet__name">${escapeHtml(r.name)}</p>
          <button type="button" class="btn btn--outline btn--small" data-copy-name>Copy</button>
        </div>
        <p class="wallet__balance">${escapeHtml(balanceGuld)} <span class="wallet__meta">${ticker}</span></p>
      </article>
      ${renderWalletView(`${sendPanel}${historyPanel}${advancedPanel}`)}
    `;

    /** @param {string} text @param {"ok"|"error"|"pending"} [state] @param {ParentNode | Element | null} [scope] @param {{ html?: boolean }} [opts] */
    const say = (text, state = "ok", scope = null, opts = {}) => {
      const root =
        scope ||
        hostEl.querySelector("[data-send-form]") ||
        hostEl.querySelector("[data-unlock-form]") ||
        hostEl.querySelector(".wallet__view") ||
        hostEl;
      setPanelStatus(root, text, state, opts);
    };

    applyStatusFlash();

    bindBusyClick(hostEl.querySelector("[data-copy-name]"), async () => {
      try {
        await navigator.clipboard.writeText(r.name);
        say("Name copied", "ok");
      } catch {
        say("Copy failed", "error");
      }
    });

    bindExportKeySections(hostEl);

    const dripSlot = hostEl.querySelector("[data-faucet-drip]");
    if (dripSlot instanceof HTMLElement && unlocked) {
      void faucetInfo(apiBase)
        .then((info) => {
          if (!info?.ready) return;
          dripSlot.innerHTML = `
            <p class="wallet__note"><strong>Testnet faucet</strong> — request ${escapeHtml(String(info.dripGuld ?? 10))} ${ticker} (cooldown applies; next block ~10 min).</p>
            <button type="button" class="btn btn--outline" data-request-drip>Request faucet drip</button>
            ${statusSlotHtml()}
          `;
          bindBusyClick(dripSlot.querySelector("[data-request-drip]"), async () => {
            say("Requesting faucet drip…", "pending", dripSlot);
            try {
              const out = await faucetDrip(apiBase, r.name);
              flashStatus(
                formatTxSubmittedHtml(
                  `Faucet sent ${out?.amountGuld ?? 10} ${ticker}`,
                  out,
                ),
                "ok",
                "[data-send-form]",
              );
              say(
                formatTxSubmittedHtml(
                  `Faucet sent ${out?.amountGuld ?? 10} ${ticker}`,
                  out,
                ),
                "ok",
                dripSlot,
                { html: true },
              );
              route();
            } catch (err) {
              say(/** @type {Error} */ (err).message, "error", dripSlot);
            }
          });
        })
        .catch(() => {});
    }

    const cosignMount = hostEl.querySelector("[data-cosign-host]");
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

    bindBusyForm(hostEl.querySelector("[data-unlock-form]"), async (form) => {
      const fd = new FormData(form);
      try {
        await keyring.unlock(String(fd.get("pass") || ""));
        if (!keyring.getPriv(r.name)) throw new Error("Wrong passphrase");
        route();
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error", form);
      }
    });

    bindSendRecipientCheck(hostEl.querySelector("[data-send-form]"));

    bindBusyForm(hostEl.querySelector("[data-send-form]"), async (form) => {
      const fd = new FormData(form);
      const to = String(fd.get("to") || "")
        .trim()
        .toLowerCase();
      const amountQ = guldToQuanta(String(fd.get("amount") || "0"));
      const feeQ = guldToQuanta(String(fd.get("fee") || "0"));
      const memoRaw = String(fd.get("memo") || "").trim();
      const memoBytes = memoRaw ? new TextEncoder().encode(memoRaw) : undefined;
      if (memoBytes && memoBytes.length > 64) {
        say("Memo exceeds 64 bytes", "error", form);
        return;
      }
      const privHex = keyring.getPriv(r.name);
      if (!privHex) {
        say("Unlock your keyring first", "error", form);
        return;
      }
      if (myIndex < 0) {
        say("No matching on-chain key on this device", "error", form);
        return;
      }
      if (!to) {
        say("Enter a recipient name", "error", form);
        return;
      }
      say("Checking recipient…", "pending", form);
      try {
        if (!(await accountExists(apiBase, to))) {
          say(`“${to}” is not registered — transfers require a registered name`, "error", form);
          return;
        }
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error", form);
        return;
      }
      try {
        const livePub = keyring.getAccount(r.name)?.pubHex;
        if (!livePub) {
          say("No local public key for this name", "error", form);
          return;
        }
        const live = await requireLiveSpendKey(r.name, livePub);
        const liveThr = Number(live.threshold ?? 1);
        const liveIdx = localKeyIndex(live, livePub);

        // Fast path: threshold 1 + keys[0] single signature (BARE v1).
        if (liveThr === 1 && liveIdx === 0) {
          say("Sending…", "pending", form);
          const msg = await transferMessage(
            String(live.account_id),
            Number(live.nonce),
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
          const out = await apiPost(apiBase, "/chain/transactions", body);
          recordSend(to);
          if (fd.get("favorite")) saveContact({ name: to, favorite: true });
          flashStatus(formatTxSubmittedHtml("Transfer submitted", out), "ok", "[data-send-form]");
          route();
          return;
        }

        // Cosign path: threshold > 1, or 1-of-n with a non-zero key_index.
        say("Starting Transfer cosign…", "pending", form);
        const seedSigs = new Map();
        const msg = await transferMessage(
          String(live.account_id),
          Number(live.nonce),
          to,
          amountQ,
          feeQ,
          memoBytes,
        );
        const sig = await sign(msg, fromHex(privHex));
        seedSigs.set(liveIdx, toHex(sig));
        const req = buildCosignRequest({
          op: "transfer",
          name: r.name,
          account: live,
          chainId,
          inclusionFee: feeQ,
          to,
          amount: amountQ,
          alreadySigned: [liveIdx],
          memo: memoRaw || undefined,
        });
        const mount = hostEl.querySelector("[data-cosign-host]");
        if (mount instanceof HTMLElement) {
          mount.scrollIntoView({ behavior: "smooth", block: "nearest" });
          mountCosignWorkstation(mount, {
            name: r.name,
            account: live,
            chainId,
            localIndex: liveIdx,
            canSign: true,
            getPriv: () => keyring.getPriv(r.name),
            seedRequest: req,
            seedSigs,
          });
        }
        if (liveThr === 1 && seedSigs.size >= 1) {
          // Single cosignature is enough — broadcast immediately.
          const cosignatures = await mergeAndVerify(req, seedSigs, live.keys.map(String));
          const body = buildTxFromCosign(req, cosignatures);
          say("Sending…", "pending", form);
          const out = await apiPost(apiBase, "/chain/transactions", body);
          recordSend(to);
          if (fd.get("favorite")) saveContact({ name: to, favorite: true });
          flashStatus(formatTxSubmittedHtml("Transfer submitted", out), "ok", "[data-send-form]");
          route();
          return;
        }
        say(
          `Cosign started — ${seedSigs.size}/${liveThr} signatures. Share the request from the workstation.`,
          "ok",
          form,
        );
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error", form);
      }
    });

    bindBusyForm(hostEl.querySelector("[data-update-master-form]"), async (form) => {
      const fd = new FormData(form);
      let master = String(fd.get("master") || "").trim();
      if (!master.startsWith("0x")) master = `0x${master}`;
      const feeQ = guldToQuanta(String(fd.get("fee") || "0"));
      const privHex = keyring.getPriv(r.name);
      if (!privHex) {
        say("Unlock keyring first", "error", form);
        return;
      }
      try {
        if (threshold === 1 && myIndex === 0) {
          say("Submitting UpdateMaster…", "pending", form);
          const msg = await cosignMessage(
            account.account_id,
            account.master_hash,
            master,
            Number(account.nonce),
            chainId,
          );
          const sig = await sign(msg, fromHex(privHex));
          const out = await apiPost(apiBase, "/chain/transactions", {
            type: "update_master",
            name: r.name,
            new_master_hash: master,
            cosignatures: [{ key_index: myIndex >= 0 ? myIndex : 0, signature: toHex(sig) }],
            inclusion_fee: feeQ,
          });
          flashStatus(
            formatTxSubmittedHtml("UpdateMaster submitted", out),
            "ok",
            "[data-update-master-form]",
          );
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
            document.getElementById('advanced')?.setAttribute('open', '');
          }
          say(`Cosign started — ${1}/${threshold} signatures. Share the request.`, "ok", form);
        } else {
          say("No local key for this account — paste request into Cosign workstation.", "error", form);
        }
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error", form);
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
        rotateHint.textContent = `Key set ${nOld} → ${nNew}: expansion fee ≈ ${quantaToGuld(String(delta))} ${ticker} (plus inclusion).`;
      } catch (err) {
        rotateHint.textContent = `Could not estimate expansion fee: ${/** @type {Error} */ (err).message}`;
      }
    }
    rotateForm?.querySelector("[name=pubs]")?.addEventListener("input", () => {
      refreshRotateFeeHint();
    });

    bindBusyClick(rotateForm?.querySelector("[data-rotate-generate]"), async () => {
      if (!(rotateForm instanceof HTMLFormElement)) return;
      try {
        say("Generating key…", "pending", rotateForm);
        const priv = await randomPrivateKey();
        const pubHex = await pubkeyHex(priv);
        const privHex = toHex(priv);
        const pubsEl = rotateForm.querySelector("[name=pubs]");
        const privEl = rotateForm.querySelector("[name=priv]");
        if (pubsEl instanceof HTMLTextAreaElement) {
          const rest = pubsEl.value
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(1);
          pubsEl.value = [pubHex, ...rest].join("\n");
          pubsEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (privEl instanceof HTMLInputElement) {
          privEl.value = privHex;
          privEl.type = "text";
        }
        const thrEl = rotateForm.querySelector("[name=threshold]");
        if (thrEl instanceof HTMLInputElement && (!thrEl.value || Number(thrEl.value) < 1)) {
          thrEl.value = "1";
        }
        say(`New key ready — keys[0]=${pubHex.slice(0, 18)}… Submit when ready.`, "ok", rotateForm);
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error", rotateForm);
      }
    });

    bindBusyForm(hostEl.querySelector("[data-rotate-keys-form]"), async (form) => {
      const fd = new FormData(form);
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
      if (!privHex) {
        say("Unlock keyring first", "error", form);
        return;
      }
      if (!pubs.length || newThreshold < 1 || newThreshold > pubs.length) {
        say("Invalid new keys / threshold", "error", form);
        return;
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
              `This expands the group ${nOld} → ${pubs.length} keys.\nProtocol expansion fee ≈ ${quantaToGuld(String(delta))} ${ticker} (vested to miners), plus inclusion.\nContinue?`,
            )
          ) {
            return;
          }
        } catch (err) {
          say(/** @type {Error} */ (err).message, "error", form);
          return;
        }
      }
      try {
        const derived = await pubkeyHex(fromHex(privHexNew));
        if (normPub(derived) !== normPub(pubs[0])) {
          say("New private key does not match keys[0] — generate again or paste the matching pair",
            "error",
            form,
          );
          return;
        }
        const intent = await rotateKeysIntentMessage(r.name, pubs, newThreshold, feeQ);
        const newSig = await sign(intent, fromHex(privHexNew));
        if (threshold === 1 && myIndex === 0) {
          say("Submitting RotateKeys…", "pending", form);
          const msg = await rotateKeysMessage(
            account.account_id,
            Number(account.nonce),
            chainId,
            pubs,
            newThreshold,
            feeQ,
          );
          const oldSig = await sign(msg, fromHex(privHex));
          const out = await apiPost(apiBase, "/chain/transactions", {
            type: "rotate_keys",
            name: r.name,
            new_keys: pubs,
            new_threshold: newThreshold,
            cosignatures: [{ key_index: 0, signature: toHex(oldSig) }],
            new_key_signature: toHex(newSig),
            inclusion_fee: feeQ,
          });
          // Persist the new key immediately so a later timeout / refresh cannot leave
          // the keyring on the old controller after the rotate is mined.
          if (keyring.isUnlocked()) {
            await keyring.upsertAccount({
              name: r.name,
              privHex: privHexNew,
              pubHex: pubs[0],
            });
          }
          flashStatus(
            formatTxSubmittedHtml("RotateKeys submitted — local key updated", out),
            "ok",
            "[data-rotate-keys-form]",
          );
          say(
            formatTxSubmittedHtml("RotateKeys submitted — local key updated", out),
            "ok",
            form,
            { html: true },
          );
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
          document.getElementById('advanced')?.setAttribute('open', '');
          say(`Cosign RotateKeys — ${seedSigs.size}/${threshold} old-key signatures. Share the request.`,
            "ok",
            form,
          );
        }
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error", form);
      }
    });

    bindBusyForm(hostEl.querySelector("[data-register-sub-form]"), async (form) => {
      const fd = new FormData(form);
      const label = String(fd.get("label") || "")
        .trim()
        .toLowerCase();
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(label)) {
        say("Invalid label (use lowercase letters, digits, hyphens)", "error", form);
        return;
      }
      const fullName = `${r.name}.${label}`;
      const endowmentQ = guldToQuanta(String(fd.get("endowment") || "0"));
      const feeQ = guldToQuanta(String(fd.get("fee") || "0"));
      const privHex = keyring.getPriv(r.name);
      if (!privHex) {
        say("Unlock keyring first", "error", form);
        return;
      }
      say("Submitting subaccount…", "pending", form);
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
        const out = await apiPost(apiBase, "/chain/transactions", {
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
        // Stay on the parent — the sub name is not on-chain until the next block.
        flashStatus(
          formatTxSubmittedHtml(`Subaccount ${fullName} submitted`, out),
          "ok",
          "[data-register-sub-form]",
        );
        say(
          formatTxSubmittedHtml(`Subaccount ${fullName} submitted`, out),
          "ok",
          form,
          { html: true },
        );
        route();
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error", form);
      }
    });

    bindBusyForm(hostEl.querySelector("[data-generate-pubkey-form]"), async (form) => {
      const fd = new FormData(form);
      const name = String(fd.get("name") || "")
        .trim()
        .toLowerCase();
      if (!/^[a-z][a-z0-9_-]{1,31}$/.test(name)) {
        say("Name must start with a letter and use a–z, 0–9, _ or - (2–32 chars)", "error", form);
        return;
      }
      if (keyring.hasStoredKey(name)) {
        if (
          !confirm(
            `This browser already has a key for “${name}”. Replace it with a newly generated key?`,
          )
        ) {
          return;
        }
      }
      say("Generating key…", "pending", form);
      try {
        try {
          if (await accountExists(apiBase, name)) {
            say(
              `“${name}” is already on-chain. Use Rotate keys on that account’s wallet, or pick another name.`,
              "error",
              form,
            );
            return;
          }
        } catch {
          /* offline / RPC blip — still allow local key prep */
        }
        const priv = await randomPrivateKey();
        const pubHex = await pubkeyHex(priv);
        const privHex = toHex(priv);
        await keyring.upsertAccount({
          name,
          privHex,
          pubHex,
          pending: true,
        });
        // upsertAccount → KEYRING → AUTH remounts the wallet; stash for re-reveal.
        pendingPubkeyReveal = { name, pubHex };
        flashStatus(
          `Saved under “${escapeHtml(name)}” (pending). Copy the public key below into the group registration form.`,
          "ok",
          "[data-generate-pubkey-form]",
        );
        document.getElementById("advanced")?.setAttribute("open", "");
        say(
          `Saved under “${name}” (pending). Copy the public key below into the group registration form.`,
          "ok",
          form,
        );
        revealGeneratedPubkey(hostEl, pendingPubkeyReveal);
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error", form);
      }
    });

    if (pendingPubkeyReveal) {
      revealGeneratedPubkey(hostEl, pendingPubkeyReveal);
      document.getElementById("advanced")?.setAttribute("open", "");
    }

    bindBusyClick(hostEl.querySelector("[data-copy-gen-pub]"), async () => {
      const pubInput = hostEl.querySelector("[data-gen-pub]");
      const form = hostEl.querySelector("[data-generate-pubkey-form]");
      const pub =
        pubInput instanceof HTMLInputElement ? pubInput.value.trim() : "";
      if (!pub) {
        say("Generate a key first", "error", form);
        return;
      }
      try {
        await navigator.clipboard.writeText(pub);
        say("Public key copied", "ok", form);
      } catch {
        say("Copy failed — select the public key field", "error", form);
      }
    });

    bindBusyForm(hostEl.querySelector("[data-sponsor-form]"), async (form) => {
      const fd = new FormData(form);
      try {
        const req = parseRegistrationRequest(String(fd.get("request") || ""));
        say(`Sponsoring “${req.name}”…`, "pending", form);
        const result = await sponsorRegistration(apiBase, r.name, req);
        const mined = result.mined ? " (mined)" : "";
        say(
          formatTxSubmittedHtml(`Sponsored ${req.name}${mined}`, result),
          "ok",
          form,
          { html: true },
        );
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error", form);
      }
    });
  } catch (err) {
    if (gen !== routeGen) return;
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
/** @param {HTMLFormElement | null | undefined} form */
function bindSendRecipientCheck(form) {
  if (!(form instanceof HTMLFormElement)) return;
  const toInput = form.querySelector('[name="to"]');
  const hintEl = form.querySelector("[data-send-to-hint]");
  const suggestEl = form.parentElement?.querySelector("[data-send-suggest]")
    || form.querySelector("[data-send-suggest]");
  const submitBtn = form.querySelector('[type="submit"]');
  if (!(toInput instanceof HTMLInputElement)) return;

  /** @param {boolean | null} registered null = unknown */
  function setHint(registered) {
    if (!(hintEl instanceof HTMLElement)) return;
    if (registered === null) {
      hintEl.textContent = "";
      hintEl.removeAttribute("data-state");
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
      return;
    }
    if (registered) {
      hintEl.textContent = "Registered on-chain";
      hintEl.dataset.state = "ok";
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    } else {
      hintEl.textContent = "Not registered — register this name before sending";
      hintEl.dataset.state = "error";
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
    }
  }

  /**
   * @param {{ name: string, label: string, source: string }[]} rows
   */
  function renderSuggest(rows) {
    if (!(suggestEl instanceof HTMLElement)) return;
    if (!rows.length) {
      suggestEl.hidden = true;
      suggestEl.innerHTML = "";
      return;
    }
    suggestEl.hidden = false;
    suggestEl.innerHTML = `<ul>${rows
      .map(
        (s) =>
          `<li><button type="button" data-suggest-name="${escapeHtml(s.name)}">${escapeHtml(s.label)}</button>` +
          `<span class="wallet__meta">${escapeHtml(s.source)}</span></li>`,
      )
      .join("")}</ul>`;
  }

  suggestEl?.addEventListener("click", (ev) => {
    const btn = /** @type {HTMLElement} */ (ev.target).closest("[data-suggest-name]");
    if (!(btn instanceof HTMLElement)) return;
    const name = btn.getAttribute("data-suggest-name") || "";
    toInput.value = name;
    renderSuggest([]);
    toInput.dispatchEvent(new Event("input", { bubbles: true }));
  });

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let debounce;
  toInput.addEventListener("input", () => {
    clearTimeout(debounce);
    const name = toInput.value.trim().toLowerCase();
    if (!name) {
      setHint(null);
      renderSuggest([]);
      return;
    }
    const local = listSendSuggestions(name).slice(0, 8);
    renderSuggest(local);
    setHint(null);
    debounce = setTimeout(async () => {
      try {
        const chain = await searchAccounts(apiBase, name, 8);
        const seen = new Set(local.map((s) => s.name));
        /** @type {{ name: string, label: string, source: string }[]} */
        const merged = [...local];
        for (const a of chain) {
          const n = String(a.name || "")
            .trim()
            .toLowerCase();
          if (!n || seen.has(n)) continue;
          seen.add(n);
          merged.push({
            name: n,
            label: n,
            source: a.kind ? String(a.kind) : "chain",
          });
        }
        if (toInput.value.trim().toLowerCase() === name) {
          renderSuggest(merged.slice(0, 10));
        }
        setHint(await accountExists(apiBase, name));
      } catch (err) {
        if (hintEl instanceof HTMLElement) {
          hintEl.textContent = /** @type {Error} */ (err).message;
          hintEl.dataset.state = "error";
        }
        if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
      }
    }, 250);
  });

  toInput.addEventListener("blur", () => {
    // Delay so suggestion click can fire first.
    setTimeout(() => renderSuggest([]), 150);
  });
}

function mountCosignWorkstation(mount, opts) {
  /** @type {import("./lib/cosign.js").CosignRequest | null} */
  let req = opts.seedRequest || null;
  /** @type {Map<number, string>} */
  const sigs = opts.seedSigs ? new Map(opts.seedSigs) : new Map();
  let newKeySignature = opts.newKeySignature || "";
  /** @type {{ text: string, state: string, html: boolean }} */
  let lastStatus = { text: "", state: "ok", html: false };
  /**
   * @param {string} text
   * @param {"ok"|"error"|"pending"} [state]
   * @param {{ html?: boolean }} [optsSay]
   */
  const say = (text, state = "ok", optsSay = {}) => {
    lastStatus = { text, state, html: Boolean(optsSay.html) };
    setPanelStatus(mount, text, state, optsSay);
  };

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
        <p class="wallet__actions wallet__spacer--sm">
          <button type="button" class="btn btn--outline" data-copy-req>Copy request</button>
          ${
            opts.canSign
              ? `<button type="button" class="btn btn--outline" data-sign-local>Sign with key_index ${opts.localIndex}</button>`
              : ""
          }
        </p>
        <form class="wallet__form wallet__spacer--sm" data-cosign-import-res>
          <label>Import cosign response
            <textarea name="res" rows="4" spellcheck="false" placeholder='{"v":1,"type":"guld1cosignres",...}'></textarea>
          </label>
          <button type="submit" class="btn btn--outline">Add signature</button>
        </form>
        ${
          req.op === "rotate_keys"
            ? `<label class="wallet__meta wallet__spacer--sm">new_key_signature (from keys[0] of new set)
                <input data-new-key-sig type="text" spellcheck="false" value="${escapeHtml(newKeySignature)}" />
              </label>`
            : ""
        }
        <p class="wallet__spacer--sm">
          <button type="button" class="btn btn--primary" data-broadcast ${ready ? "" : "disabled"}>Broadcast</button>
        </p>
        ${statusSlotHtml()}`
          : statusSlotHtml()
      }
    `;
    if (lastStatus.text) {
      setPanelStatus(mount, lastStatus.text, lastStatus.state, { html: lastStatus.html });
    }
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
        say(`Loaded ${req.op} cosign request`, "ok");
        render();
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error");
      }
    });

    mount.querySelector("[data-copy-req]")?.addEventListener("click", async () => {
      if (!req) return;
      try {
        await navigator.clipboard.writeText(stringifyCosign(req));
        say("Cosign request copied", "ok");
      } catch {
        say("Copy failed — select the textarea", "error");
      }
    });

    mount.querySelector("[data-sign-local]")?.addEventListener("click", async () => {
      if (!req || !opts.canSign) return;
      const priv = opts.getPriv();
      if (!priv) {
        say("Unlock keyring first", "error");
        return;
      }
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
        say(`Signed as key_index ${opts.localIndex}`, "ok");
        render();
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error");
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
        say(`Added signature from key_index ${res.key_index}`, "ok");
        render();
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error");
      }
    });

    bindBusyClick(mount.querySelector("[data-broadcast]"), async () => {
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
        say("Broadcasting…", "pending");
        const out = await apiPost(apiBase, "/chain/transactions", tx);
        if (req.op === "rotate_keys" && opts.newPrivHex && opts.newPubHex && keyring.isUnlocked()) {
          await keyring.upsertAccount({
            name: opts.name,
            privHex: opts.newPrivHex,
            pubHex: opts.newPubHex,
          });
          flashStatus(
            formatTxSubmittedHtml("RotateKeys submitted — local key updated", out),
            "ok",
            "[data-send-form]",
          );
          say(
            formatTxSubmittedHtml("RotateKeys submitted — local key updated", out),
            "ok",
            { html: true },
          );
        } else {
          if (req.op === "transfer" && req.to) {
            recordSend(req.to);
          }
          flashStatus(
            formatTxSubmittedHtml(`${req.op} submitted`, out),
            "ok",
            "[data-send-form]",
          );
        }
        route();
      } catch (err) {
        say(/** @type {Error} */ (err).message, "error");
      }
    });
  }

  render();
}

route();
