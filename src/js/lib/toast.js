/**
 * Lightweight toast / notification for gateway payment alerts.
 */

const HOST_ID = "guld-toast-host";

function ensureHost() {
  let host = document.getElementById(HOST_ID);
  if (host) return host;
  host = document.createElement("div");
  host.id = HOST_ID;
  host.className = "guld-toast-host";
  host.setAttribute("aria-live", "polite");
  document.body.append(host);
  return host;
}

/**
 * @param {{ title: string, body?: string, href?: string, hrefLabel?: string, timeoutMs?: number }} opts
 */
export function showToast(opts) {
  const host = ensureHost();
  const el = document.createElement("div");
  el.className = "guld-toast";
  el.setAttribute("role", "status");

  const title = document.createElement("p");
  title.className = "guld-toast__title";
  title.textContent = opts.title;
  el.append(title);

  if (opts.body) {
    const body = document.createElement("p");
    body.className = "guld-toast__body";
    body.textContent = opts.body;
    el.append(body);
  }

  if (opts.href) {
    const a = document.createElement("a");
    a.className = "btn btn--primary guld-toast__action";
    a.href = opts.href;
    a.textContent = opts.hrefLabel || "Open";
    el.append(a);
  }

  const close = document.createElement("button");
  close.type = "button";
  close.className = "guld-toast__close";
  close.setAttribute("aria-label", "Dismiss");
  close.textContent = "×";
  close.addEventListener("click", () => el.remove());
  el.append(close);

  host.append(el);
  const ms = opts.timeoutMs ?? 20_000;
  if (ms > 0) {
    setTimeout(() => el.remove(), ms);
  }
  return el;
}
