import "./chrome.js";
import { apiDelete, apiGet, apiPost, persistApiBase, resolveApiBase } from "./lib/api.js";
import { CLAIM_HREF, GATEWAY_HREF, getLocalIdentity, LOGIN_HREF } from "./lib/auth.js";
import {
  deskInviteUrl,
  isGatewayConfigured,
  loadGatewaySettings,
  saveGatewaySettings,
} from "./lib/gateway-settings.js";
import {
  buildContactCard,
  loadWalletPrefs,
  parseContactCard,
  removeContact,
  saveContact,
} from "./lib/contacts.js";
import {
  bindExportKeySections,
  renderExportKeySection,
} from "./lib/key-export.js";
import { keyring } from "./lib/keyring.js";
import { currencyTicker, loadNetworkInfo, NETWORK_PRESETS } from "./lib/network.js";
import { accountDetailsHtml, registrationExpiryHtml } from "./lib/account-meta.js";
import { docsViewerHref } from "./lib/doc-paths.js";
import { qrSvgDataUrl } from "./lib/qr.js";
import { escapeHtml } from "./lib/rpc.js";

const statusEl = document.querySelector("[data-settings-status]");
const hostEl = document.querySelector("[data-settings-host]");

/**
 * @param {string} msg
 * @param {"pending"|"ok"|"error"} [kind]
 */
function setStatus(msg, kind = "pending") {
  if (!(statusEl instanceof HTMLElement)) return;
  statusEl.textContent = msg;
  statusEl.dataset.state = kind;
}

async function loadPeerInfo(apiBase) {
  try {
    return await apiGet(apiBase, "/registrar");
  } catch {
    return null;
  }
}

async function render() {
  const apiBase = resolveApiBase();
  const gw = loadGatewaySettings();
  const id = getLocalIdentity();
  const peer = await loadPeerInfo(apiBase);
  const invite = deskInviteUrl(gw);
  const net = await loadNetworkInfo(apiBase);
  const ticker = currencyTicker(net);
  let accountBlock = "";
  if (id.name) {
    try {
      const [st, acct] = await Promise.all([
        apiGet(apiBase, "/chain/status"),
        apiGet(apiBase, `/chain/accounts/${encodeURIComponent(id.name)}`),
      ]);
      const account = acct.account || {};
      accountBlock = `
      <fieldset>
        <legend>Account · ${escapeHtml(id.name)}</legend>
        ${accountDetailsHtml(account)}
        ${registrationExpiryHtml(account, st.height)}
        <p class="wallet__meta">Chain height ${escapeHtml(String(st.height ?? "—"))}.</p>
      </fieldset>`;
    } catch (err) {
      accountBlock = `
      <fieldset>
        <legend>Account · ${escapeHtml(id.name)}</legend>
        <p class="wallet__meta">${escapeHtml(/** @type {Error} */ (err).message)}</p>
      </fieldset>`;
    }
  }
  const presets = NETWORK_PRESETS.map(
    (p) =>
      `<button type="button" class="btn btn--outline" data-preset="${escapeHtml(p.id)}" style="margin:0.25rem 0.35rem 0.25rem 0">${escapeHtml(p.label)}</button>`,
  ).join("");

  hostEl.innerHTML = `
    <form class="wallet__form" data-settings-form>
      ${accountBlock}
      <fieldset>
        <legend>Network</legend>
        <p class="wallet__meta">
          Connected mode: <strong>${escapeHtml(net.mode)}</strong>
          ${net.network ? ` · <code>${escapeHtml(net.network)}</code>` : ""}
          · chain ${escapeHtml(String(net.chainId))}
          ${net.faucet?.ready ? " · faucet ready" : net.mode === "testnet" ? " · faucet off on this peer" : ""}
        </p>
        <label>
          API base
          <input name="apiBase" type="text" value="${escapeHtml(apiBase)}" spellcheck="false" />
        </label>
        <p class="wallet__meta">Presets (testnet and mainnet stay available forever — pick the peer URL):</p>
        <p>${presets}</p>
        <p class="wallet__meta">Same-origin <code>/api/v1</code> when the node serves this tree.</p>
      </fieldset>

      <fieldset>
        <legend>Legacy 1.0 claim</legend>
        <p class="wallet__meta">
          ~2,217 imported holders unlock balances with a PGP proof — not part of normal
          registration. Same flow as the desktop wallet and extension.
        </p>
        <a class="btn btn--outline" href="${CLAIM_HREF}">Open legacy claim</a>
      </fieldset>

      <fieldset>
        <legend>Your OTC desk (Paymento)</legend>
        <p class="wallet__meta">
          After you hold ${ticker}, you can sell sponsorships for BTC, ETH, USDT, USDC, and
          other rails Paymento supports — at <em>your</em> price. Friends open your invite
          link, pay your store, and you sign <code>RegisterUsername</code> on
          <a href="${GATEWAY_HREF}">Gateway</a>.
          This overrides the peer’s bootstrap desk for <strong>your</strong> sales;
          new users still pay the peer desk unless they use your invite.
          Guide: <a href="${docsViewerHref("help/paymento.md")}">Paymento pairing</a>.
        </p>
        ${
          peer?.paymentLink
            ? `<p class="wallet__note">Peer bootstrap desk: <code>${escapeHtml(String(peer.paymentLink))}</code>${
                peer.feeUsd != null
                  ? ` · operator asks $${escapeHtml(String(peer.feeUsd))} (not a ${ticker} market price)`
                  : ""
              }</p>`
            : `<p class="wallet__note">This peer has no bootstrap payment link — publish yours to sell here.</p>`
        }
        <label class="wallet__check">
          <input name="enabled" type="checkbox" ${gw.enabled ? "checked" : ""} />
          Enable my OTC desk in this browser
        </label>
        <label>
          Provider
          <select name="provider">
            <option value="paymento" selected>Paymento</option>
          </select>
        </label>
        <label>
          Your registrar name (payer)
          <input name="registrarName" type="text" value="${escapeHtml(gw.registrarName)}"
            placeholder="${escapeHtml(id.name || "yourname")}" spellcheck="false" />
        </label>
        <label>
          Your Paymento payment link
          <input name="paymentLink" type="url" value="${escapeHtml(gw.paymentLink)}"
            placeholder="https://app.paymento.io/payment-link/…" spellcheck="false" />
        </label>
        <label>
          Your desk asking price (USD)
          <input name="feeUsd" type="number" min="1" max="10000" step="1" value="${escapeHtml(String(gw.feeUsd))}" />
          <span class="wallet__meta">What you charge off-chain — not a protocol or ${ticker} market price.</span>
        </label>
        <label>
          Paymento API key <span class="wallet__meta">(optional)</span>
          <input name="apiKey" type="password" value="${escapeHtml(gw.apiKey)}" autocomplete="off" />
        </label>
        <label>
          Paymento webhook HMAC secret
          <input name="webhookSecret" type="password" value="" placeholder="${gw.webhookSecret ? "(unchanged — leave blank)" : "paste from Paymento"}" autocomplete="off" />
        </label>
        <p class="wallet__meta">
          Point your Paymento Payment Link webhook <strong>and</strong> store IPN to this peer’s
          <code>/api/v1/payment-gateway-webhook</code>. Publishing your desk uploads the HMAC
          secret to the node so multi-merchant OTC works on guld.io.
        </p>
        <label>
          Poll interval (ms)
          <input name="pollMs" type="number" min="5000" step="1000" value="${escapeHtml(String(gw.pollMs))}" />
        </label>
        <label class="wallet__check">
          <input name="publish" type="checkbox" ${gw.published || gw.enabled ? "checked" : ""} />
          Publish desk to this peer (list + webhook secret)
        </label>
      </fieldset>

      ${
        id.name && keyring.hasStoredKey(id.name)
          ? renderExportKeySection(id.name, { id: "key-export" })
          : ""
      }

      ${(() => {
        const prefs = loadWalletPrefs();
        const acct = id.name ? keyring.getAccount(id.name) : null;
        let cardBlock = "";
        if (id.name && acct?.pubHex) {
          try {
            const payload = buildContactCard({ name: id.name, pub: acct.pubHex });
            const qr = qrSvgDataUrl(payload, 200);
            cardBlock = `
              <div class="wallet__contact-card">
                <p class="wallet__meta">Your contact card (in-person exchange — local save only):</p>
                <figure>
                  <img alt="Contact card QR" width="200" height="200" src="${qr}" />
                  <figcaption class="wallet__meta"><code>${escapeHtml(id.name)}</code></figcaption>
                </figure>
                <label>
                  Payload
                  <input type="text" readonly data-contact-card-payload value="${escapeHtml(payload)}" spellcheck="false" />
                </label>
                <button type="button" class="btn btn--outline" data-copy-contact-card style="margin-top:0.5rem">Copy payload</button>
              </div>`;
          } catch {
            cardBlock = "";
          }
        }
        const list =
          prefs.contacts
            .map(
              (c) =>
                `<li>${escapeHtml(c.alias || c.name)}${c.favorite ? " ★" : ""} · <code>${escapeHtml(c.name)}</code>` +
                ` <button type="button" class="btn btn--outline" data-remove-contact="${escapeHtml(c.name)}">Remove</button></li>`,
            )
            .join("") || "<li>No contacts yet</li>";
        return `
      <fieldset>
        <legend>Contacts</legend>
        <p class="wallet__meta">Favorites appear first in the wallet send typeahead (spec 14 §8.3).</p>
        <ul class="wallet__contacts-list">${list}</ul>
        <label>Name <input name="contactName" type="text" spellcheck="false" placeholder="bob" /></label>
        <label>Alias (optional) <input name="contactAlias" type="text" placeholder="Bob" /></label>
        <label class="wallet__check"><input name="contactFavorite" type="checkbox" /> Favorite</label>
        <label>
          Import contact card
          <input name="contactImport" type="text" spellcheck="false" placeholder="guld1contact:{…}" />
        </label>
        ${cardBlock}
      </fieldset>`;
      })()}

      <button type="submit" class="btn btn--primary">Save</button>
      ${
        isGatewayConfigured(gw)
          ? `<a class="btn btn--outline" href="${GATEWAY_HREF}" style="margin-left:0.5rem">Open gateway</a>`
          : ""
      }
      ${
        !id.hasKey
          ? `<a class="btn btn--outline" href="${LOGIN_HREF}?next=/settings/" style="margin-left:0.5rem">Log in</a>`
          : ""
      }
    </form>
    ${
      invite
        ? `<article class="wallet__card" style="margin-top:1.25rem">
            <p class="wallet__name">Invite friends</p>
            <p class="wallet__meta">They register on this peer but pay <strong>your</strong> Paymento store.</p>
            <label>
              Invite URL
              <input type="text" readonly data-invite-url value="${escapeHtml(invite)}" />
            </label>
            <button type="button" class="btn btn--outline" data-copy-invite style="margin-top:0.65rem">Copy invite link</button>
          </article>`
        : ""
    }
  `;

  bindExportKeySections(hostEl);

  hostEl.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-preset");
      const preset = NETWORK_PRESETS.find((p) => p.id === id);
      if (!preset) return;
      const input = hostEl.querySelector('input[name="apiBase"]');
      if (input instanceof HTMLInputElement) input.value = preset.apiBase;
      persistApiBase(preset.apiBase);
      setStatus(`${preset.label}: ${preset.hint}`, "ok");
      void render();
    });
  });

  hostEl.querySelector("[data-copy-invite]")?.addEventListener("click", async () => {
    const input = hostEl.querySelector("[data-invite-url]");
    if (!(input instanceof HTMLInputElement)) return;
    try {
      await navigator.clipboard.writeText(input.value);
      setStatus("Invite link copied.", "ok");
    } catch {
      input.select();
      setStatus("Select and copy the invite URL.", "pending");
    }
  });

  hostEl.querySelectorAll("[data-remove-contact]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-remove-contact");
      if (!name) return;
      removeContact(name);
      setStatus(`Removed contact ${name}.`, "ok");
      void render();
    });
  });

  hostEl.querySelector("[data-copy-contact-card]")?.addEventListener("click", async () => {
    const input = hostEl.querySelector("[data-contact-card-payload]");
    if (!(input instanceof HTMLInputElement)) return;
    try {
      await navigator.clipboard.writeText(input.value);
      setStatus("Contact card copied.", "ok");
    } catch {
      input.select();
      setStatus("Select and copy the contact payload.", "pending");
    }
  });

  hostEl.querySelector("[data-settings-form]")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
    const contactName = String(fd.get("contactName") || "").trim().toLowerCase();
    if (contactName) {
      saveContact({
        name: contactName,
        alias: String(fd.get("contactAlias") || "").trim() || undefined,
        favorite: fd.get("contactFavorite") === "on",
      });
    }
    const importRaw = String(fd.get("contactImport") || "").trim();
    if (importRaw) {
      try {
        const card = parseContactCard(importRaw);
        saveContact({
          name: card.name,
          alias: card.alias,
          favorite: false,
        });
        setStatus(`Imported contact ${card.name}.`, "ok");
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
        return;
      }
    }
    const nextApi = String(fd.get("apiBase") || "").trim() || "/api/v1";
    persistApiBase(nextApi);
    const secretInput = String(fd.get("webhookSecret") || "").trim();
    const next = saveGatewaySettings({
      enabled: fd.get("enabled") === "on",
      provider: "paymento",
      registrarName: String(fd.get("registrarName") || ""),
      paymentLink: String(fd.get("paymentLink") || ""),
      apiKey: String(fd.get("apiKey") || ""),
      webhookSecret: secretInput || loadGatewaySettings().webhookSecret,
      feeUsd: Number(fd.get("feeUsd") || 10),
      pollMs: Number(fd.get("pollMs") || 12_000),
      published: fd.get("publish") === "on",
    });
    if (next.enabled && !next.registrarName) {
      setStatus("Set your registrar name (the funded account that will pay).", "error");
      return;
    }
    if (next.enabled && !next.paymentLink && !next.apiKey) {
      setStatus("Add your Paymento payment link (or API key).", "error");
      return;
    }

    if (next.enabled && next.published && next.paymentLink) {
      try {
        const body = {
          registrarName: next.registrarName,
          paymentLink: next.paymentLink,
          feeUsd: next.feeUsd,
        };
        if (secretInput) body.webhookSecret = secretInput;
        await apiPost(nextApi, "/registrar/desks", body);
        setStatus("Saved and published to this peer. Gateway is in the nav.", "ok");
      } catch (err) {
        setStatus(`Saved locally; publish failed: ${/** @type {Error} */ (err).message}`, "error");
        render();
        return;
      }
    } else if (!next.enabled || !next.published) {
      try {
        if (next.registrarName) {
          await apiDelete(nextApi, `/registrar/desks/${encodeURIComponent(next.registrarName)}`).catch(
            () => null,
          );
        }
      } catch {
        /* ignore */
      }
      setStatus(isGatewayConfigured(next) ? "Saved. Gateway is in the nav." : "Saved.", "ok");
    } else {
      setStatus("Saved.", "ok");
    }

    if (next.enabled && !getLocalIdentity().hasKey) {
      setStatus("Log in with your registrar key before signing sponsorships.", "pending");
    }
    render();
  });

  if (!id.hasKey) {
    setStatus("Not logged in — log in to sign as registrar.", "pending");
  } else {
    setStatus(`Active: ${id.name}${gw.enabled ? " · OTC desk on" : ""}`, "ok");
  }
}

render();
