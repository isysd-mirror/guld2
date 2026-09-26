import { escapeHtml } from "./rpc.js";

/** @param {Record<string, unknown>} account @param {number|string|undefined} tipHeight */
export function registrationExpiryHtml(account, tipHeight) {
  const expires = account.expires_at_height;
  if (expires == null || String(expires) === "18446744073709551615") {
    return `<p class="wallet__meta">Registration does not expire (settled name).</p>`;
  }
  const exp = Number(expires);
  const tip = Number(tipHeight);
  const remaining = Number.isFinite(tip) && Number.isFinite(exp) ? exp - tip : null;
  let warn = "";
  if (remaining != null && remaining < 5000) {
    warn =
      remaining <= 0
        ? `<p class="wallet__note">Overdue for settle — keep the account funded.</p>`
        : `<p class="wallet__note">Renew soon (${remaining} blocks left) — keep the account funded.</p>`;
  }
  return `<p class="wallet__meta">Expires at height ${escapeHtml(String(expires))}${
    remaining != null ? ` (${remaining} blocks remaining)` : ""
  }</p>${warn}`;
}

/** @param {Record<string, unknown>} account */
export function accountDetailsHtml(account) {
  const kind = String(account.kind || "—");
  const threshold = Number(account.threshold ?? 1);
  const keys = Array.isArray(account.keys) ? account.keys : [];
  const legacy =
    account.legacy_locked || account.legacy?.status === "locked" ? " · legacy locked" : "";
  const keyRows = keys
    .map(
      (k, i) =>
        `<li><span class="wallet__meta">[${i}]</span> <code>${escapeHtml(String(k).slice(0, 18))}…</code></li>`,
    )
    .join("");
  return `
    <p class="wallet__meta">${escapeHtml(kind)} · ${threshold}-of-${keys.length || "?"} keys${escapeHtml(legacy)}</p>
    ${keys.length ? `<ul class="wallet__meta">${keyRows}</ul>` : ""}`;
}
