/**
 * Local wallet contacts and recent recipients (spec 14 §8.3).
 */

const KEY = "guld.contacts.v1";

/** @typedef {{ name: string, alias?: string, favorite?: boolean }} Contact */
/** @typedef {{ name: string, last_sent_at: string }} RecentRecipient */

/**
 * @returns {{ contacts: Contact[], recent_recipients: RecentRecipient[] }}
 */
export function loadWalletPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { contacts: [], recent_recipients: [] };
    const parsed = JSON.parse(raw);
    return {
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
      recent_recipients: Array.isArray(parsed.recent_recipients)
        ? parsed.recent_recipients
        : [],
    };
  } catch {
    return { contacts: [], recent_recipients: [] };
  }
}

/** @param {{ contacts: Contact[], recent_recipients: RecentRecipient[] }} data */
function saveWalletPrefs(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** @param {string} name */
export function recordSend(name) {
  const n = name.trim().toLowerCase();
  if (!n) return;
  const cur = loadWalletPrefs();
  const recent = cur.recent_recipients.filter((r) => r.name !== n);
  recent.unshift({ name: n, last_sent_at: new Date().toISOString() });
  saveWalletPrefs({
    ...cur,
    recent_recipients: recent.slice(0, 32),
  });
}

/**
 * Ordered send suggestions: favorites → recent → contacts.
 * @param {string} [query]
 */
export function listSendSuggestions(query = "") {
  const q = query.trim().toLowerCase();
  const { contacts, recent_recipients } = loadWalletPrefs();
  const seen = new Set();
  /** @type {{ name: string, label: string }[]} */
  const out = [];
  const push = (name, label) => {
    const n = name.trim().toLowerCase();
    if (!n || seen.has(n)) return;
    if (q && !n.includes(q) && !label.toLowerCase().includes(q)) return;
    seen.add(n);
    out.push({ name: n, label });
  };
  for (const c of contacts.filter((x) => x.favorite)) {
    push(c.name, c.alias ? `${c.alias} (${c.name})` : c.name);
  }
  for (const r of recent_recipients) {
    push(r.name, r.name);
  }
  for (const c of contacts) {
    push(c.name, c.alias ? `${c.alias} (${c.name})` : c.name);
  }
  return out;
}

/**
 * @param {{ name: string, alias?: string, favorite?: boolean }} contact
 */
export function saveContact(contact) {
  const name = contact.name.trim().toLowerCase();
  if (!name) return;
  const cur = loadWalletPrefs();
  const contacts = cur.contacts.filter((c) => c.name !== name);
  contacts.push({
    name,
    alias: contact.alias?.trim() || undefined,
    favorite: Boolean(contact.favorite),
  });
  saveWalletPrefs({ ...cur, contacts });
}
