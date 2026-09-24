import "./chrome.js";
import { apiDelete, apiGet, apiPost, persistApiBase, resolveApiBase } from "./lib/api.js";
import { CLAIM_HREF, GATEWAY_HREF, getLocalIdentity, LOGIN_HREF } from "./lib/auth.js";
import {
  deskInviteUrl,
  isGatewayConfigured,
  loadGatewaySettings,
  saveGatewaySettings,
} from "./lib/gateway-settings.js";
import { loadWalletPrefs, saveContact } from "./lib/contacts.js";
import {
  bindExportKeySections,
  renderExportKeySection,
} from "./lib/key-export.js";
import { keyring } from "./lib/keyring.js";
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

  hostEl.innerHTML = `
    <form class="wallet__form" data-settings-form>
      <fieldset>
        <legend>Node</legend>
        <label>
          API base
          <input name="apiBase" type="text" value="${escapeHtml(apiBase)}" spellcheck="false" />
        </label>
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
          After you hold GULD, you can sell sponsorships for BTC, ETH, USDT, USDC, and
          other rails Paymento supports — at <em>your</em> price. Friends open your invite
          link, pay your store, and you sign <code>RegisterUsername</code> on
          <a href="${GATEWAY_HREF}">Gateway</a>.
          This overrides the peer’s bootstrap desk for <strong>your</strong> sales;
          new users still pay the peer desk unless they use your invite.
          Guide: <a href="/help/paymento/">Paymento pairing</a>.
        </p>
        ${
          peer?.paymentLink
            ? `<p class="wallet__note">Peer bootstrap desk: <code>${escapeHtml(String(peer.paymentLink))}</code> · $${escapeHtml(String(peer.feeUsd ?? 10))}</p>`
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
          Desk fee (USD)
          <input name="feeUsd" type="number" min="1" max="10000" step="1" value="${escapeHtml(String(gw.feeUsd))}" />
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

      <fieldset>
        <legend>Contacts</legend>
        <p class="wallet__meta">Favorites appear first in the wallet send combobox (spec 14 §8.3).</p>
        <ul class="wallet__meta">${loadWalletPrefs()
          .contacts.map(
            (c) =>
              `<li>${escapeHtml(c.alias || c.name)}${c.favorite ? " ★" : ""} · <code>${escapeHtml(c.name)}</code></li>`,
          )
          .join("") || "<li>No contacts yet</li>"}</ul>
        <label>Name <input name="contactName" type="text" spellcheck="false" placeholder="bob" /></label>
        <label>Alias (optional) <input name="contactAlias" type="text" placeholder="Bob" /></label>
        <label class="wallet__check"><input name="contactFavorite" type="checkbox" /> Favorite</label>
      </fieldset>

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
