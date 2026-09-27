/**
 * Local wallet contacts and recent recipients (spec 14 §8.3).
 */

const KEY = "guld.contacts.v1";

export const CONTACT_CARD_PREFIX = "guld1contact:";

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
 * Merge counterparties from activity into recent recipients (first open / refresh).
 * @param {Array<{ counterparty?: string, timestamp?: string, time?: string, block_time?: string }>} items
 */
export function backfillRecentFromActivity(items) {
  if (!Array.isArray(items) || !items.length) return;
  const cur = loadWalletPrefs();
  /** @type {Map<string, RecentRecipient>} */
  const byName = new Map(cur.recent_recipients.map((r) => [r.name, r]));
  for (const item of items) {
    const n = String(item.counterparty || "")
      .trim()
      .toLowerCase();
    if (!n) continue;
    const ts = String(item.timestamp ?? item.time ?? item.block_time ?? "").trim();
    const stamp = ts || new Date().toISOString();
    const existing = byName.get(n);
    if (!existing || stamp > existing.last_sent_at) {
      byName.set(n, { name: n, last_sent_at: stamp });
    }
  }
  const recent = [...byName.values()]
    .sort((a, b) => b.last_sent_at.localeCompare(a.last_sent_at))
    .slice(0, 32);
  saveWalletPrefs({ ...cur, recent_recipients: recent });
}

/**
 * Ordered send suggestions: favorites → recent → contacts.
 * @param {string} [query]
 */
export function listSendSuggestions(query = "") {
  const q = query.trim().toLowerCase();
  const { contacts, recent_recipients } = loadWalletPrefs();
  const seen = new Set();
  /** @type {{ name: string, label: string, source: string }[]} */
  const out = [];
  const push = (name, label, source) => {
    const n = name.trim().toLowerCase();
    if (!n || seen.has(n)) return;
    if (q && !n.includes(q) && !label.toLowerCase().includes(q)) return;
    seen.add(n);
    out.push({ name: n, label, source });
  };
  for (const c of contacts.filter((x) => x.favorite)) {
    push(c.name, c.alias ? `${c.alias} (${c.name})` : c.name, "favorite");
  }
  for (const r of recent_recipients) {
    push(r.name, r.name, "recent");
  }
  for (const c of contacts) {
    push(c.name, c.alias ? `${c.alias} (${c.name})` : c.name, "contact");
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

/** @param {string} name */
export function removeContact(name) {
  const n = name.trim().toLowerCase();
  if (!n) return;
  const cur = loadWalletPrefs();
  saveWalletPrefs({
    ...cur,
    contacts: cur.contacts.filter((c) => c.name !== n),
  });
}

/**
 * @param {{ name: string, pub?: string, alias?: string }} card
 */
export function buildContactCard(card) {
  const name = card.name.trim().toLowerCase();
  if (!name) throw new Error("Contact card needs a name");
  /** @type {{ v: number, name: string, pub?: string, alias?: string }} */
  const body = { v: 1, name };
  const pub = card.pub?.trim();
  if (pub) body.pub = pub.startsWith("0x") ? pub : `0x${pub}`;
  const alias = card.alias?.trim();
  if (alias) body.alias = alias;
  return `${CONTACT_CARD_PREFIX}${JSON.stringify(body)}`;
}

/**
 * Parse pasted/scanned `guld1contact:` payload (or bare JSON).
 * @param {string} raw
 * @returns {{ name: string, pub?: string, alias?: string }}
 */
export function parseContactCard(raw) {
  const trimmed = raw.trim();
  let payload = trimmed;
  if (payload.startsWith(CONTACT_CARD_PREFIX)) {
    payload = payload.slice(CONTACT_CARD_PREFIX.length);
  }
  if (!payload.startsWith("{")) {
    throw new Error("Expected guld1contact: JSON payload");
  }
  const json = JSON.parse(payload);
  const name = String(json.name || "")
    .trim()
    .toLowerCase();
  if (!name) throw new Error("Contact card missing name");
  const pubRaw = json.pub ? String(json.pub).trim() : "";
  const alias = json.alias ? String(json.alias).trim() : "";
  return {
    name,
    pub: pubRaw ? (pubRaw.startsWith("0x") ? pubRaw : `0x${pubRaw}`) : undefined,
    alias: alias || undefined,
  };
}
