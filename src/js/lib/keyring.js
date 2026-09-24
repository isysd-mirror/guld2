/**
 * Browser keyring (localStorage). Dev-grade — encrypt with passphrase later.
 */

const KEY = "guld.keyring.v1";
export const KEYRING_EVENT = "guld:keyring";

/**
 * @typedef {{ name: string, privHex: string, pubHex: string, pending?: boolean }} KeyAccount
 */

/**
 * @returns {{ accounts: KeyAccount[], activeName: string | null }}
 */
function loadRaw() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { accounts: [], activeName: null };
    const parsed = JSON.parse(raw);
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      activeName: parsed.activeName ?? null,
    };
  } catch {
    return { accounts: [], activeName: null };
  }
}

/** @param {{ accounts: KeyAccount[], activeName: string | null }} data */
function saveRaw(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
  document.dispatchEvent(new CustomEvent(KEYRING_EVENT));
}

export const keyring = {
  load() {
    return loadRaw();
  },

  /**
   * @param {{ name: string, privHex: string, pubHex: string, pending?: boolean }} account
   */
  upsertAccount(account) {
    const cur = loadRaw();
    const name = account.name.trim().toLowerCase();
    const accounts = cur.accounts.filter((a) => a.name !== name);
    accounts.push({ ...account, name });
    const next = {
      accounts,
      activeName: cur.activeName || name,
    };
    saveRaw(next);
    return next;
  },

  /** @param {string | null} name */
  setActive(name) {
    const cur = loadRaw();
    const next = {
      ...cur,
      activeName: name ? name.trim().toLowerCase() : null,
    };
    saveRaw(next);
    return next;
  },

  /** @param {string} name */
  removeAccount(name) {
    const cur = loadRaw();
    const n = name.trim().toLowerCase();
    const accounts = cur.accounts.filter((a) => a.name !== n);
    const activeName =
      cur.activeName === n ? accounts[0]?.name ?? null : cur.activeName;
    const next = { accounts, activeName };
    saveRaw(next);
    return next;
  },

  /** @param {string} name */
  getAccount(name) {
    const n = name.trim().toLowerCase();
    return loadRaw().accounts.find((a) => a.name === n) ?? null;
  },

  /** @param {string} name */
  getPriv(name) {
    return this.getAccount(name)?.privHex ?? null;
  },

  /** True when a private key exists for the active (or given) name. */
  hasLocalKey(name) {
    const n = name ?? loadRaw().activeName;
    if (!n) return false;
    const a = this.getAccount(n);
    return Boolean(a?.privHex);
  },
};
