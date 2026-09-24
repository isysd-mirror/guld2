/**
 * Browser keyring (localStorage). Private keys encrypted at rest (spec 01 §3.1).
 */

import { decryptPriv, encryptPriv } from "./keyring-crypto.js";

const KEY = "guld.keyring.v1";
export const KEYRING_EVENT = "guld:keyring";

/**
 * @typedef {{ v: number, alg: string, kdf: string, iter: number, salt: string, iv: string, ciphertext: string }} EncRecord
 * @typedef {{ name: string, pubHex: string, pending?: boolean, enc?: EncRecord, privHex?: string }} StoredAccount
 */

/** @type {Map<string, string>} name → privHex (memory only while unlocked) */
const mem = new Map();
let unlocked = false;
/** @type {string | null} */
let passphrase = null;

/**
 * @returns {{ accounts: StoredAccount[], activeName: string | null }}
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

/** @param {{ accounts: StoredAccount[], activeName: string | null }} data */
function saveRaw(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
  document.dispatchEvent(new CustomEvent(KEYRING_EVENT));
}

async function persistEncryptedAccounts(accounts, activeName) {
  if (!passphrase) throw new Error("Keyring locked");
  const stored = [];
  for (const acct of accounts) {
    const privHex = mem.get(acct.name);
    if (!privHex) {
      stored.push(acct);
      continue;
    }
    const enc = await encryptPriv(privHex, passphrase);
    stored.push({
      name: acct.name,
      pubHex: acct.pubHex,
      pending: acct.pending,
      enc,
    });
  }
  saveRaw({ accounts: stored, activeName });
}

export const keyring = {
  load() {
    const raw = loadRaw();
    return {
      accounts: raw.accounts.map(({ name, pubHex, pending }) => ({ name, pubHex, pending })),
      activeName: raw.activeName,
    };
  },

  isUnlocked() {
    return unlocked;
  },

  /** True when ciphertext (or legacy plaintext) exists for the name. */
  hasStoredKey(name) {
    const n = name.trim().toLowerCase();
    const acct = loadRaw().accounts.find((a) => a.name === n);
    return Boolean(acct?.enc || acct?.privHex);
  },

  /**
   * Decrypt all stored keys into memory. Migrates legacy plaintext records.
   * @param {string} pass
   */
  async unlock(pass) {
    const raw = loadRaw();
    mem.clear();
    for (const acct of raw.accounts) {
      let privHex = null;
      if (acct.enc) {
        privHex = await decryptPriv(acct.enc, pass);
      } else if (acct.privHex) {
        privHex = acct.privHex;
      }
      if (privHex) mem.set(acct.name, privHex);
    }
    unlocked = true;
    passphrase = pass;
    await persistEncryptedAccounts(raw.accounts, raw.activeName);
  },

  lock() {
    mem.clear();
    unlocked = false;
    passphrase = null;
  },

  /**
   * @param {{ name: string, privHex: string, pubHex: string, pending?: boolean }} account
   */
  async upsertAccount(account) {
    if (!unlocked || !passphrase) {
      throw new Error("Unlock keyring with your passphrase first");
    }
    const cur = loadRaw();
    const name = account.name.trim().toLowerCase();
    mem.set(name, account.privHex);
    const accounts = cur.accounts.filter((a) => a.name !== name);
    accounts.push({
      name,
      pubHex: account.pubHex,
      pending: account.pending,
    });
    await persistEncryptedAccounts(accounts, cur.activeName || name);
    return this.load();
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
    mem.delete(n);
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
    const stored = loadRaw().accounts.find((a) => a.name === n);
    if (!stored) return null;
    return {
      name: stored.name,
      pubHex: stored.pubHex,
      pending: stored.pending,
      hasKey: Boolean(stored.enc || stored.privHex),
    };
  },

  /** @param {string} name */
  getPriv(name) {
    if (!unlocked) return null;
    return mem.get(name.trim().toLowerCase()) ?? null;
  },

  /** True when a decrypted private key is available for the active (or given) name. */
  hasLocalKey(name) {
    const n = (name ?? loadRaw().activeName)?.trim().toLowerCase();
    if (!n || !unlocked) return false;
    return mem.has(n);
  },

  /**
   * Verify passphrase without changing unlock state (unless legacy-only migration runs).
   * @param {string} pass
   */
  async verifyPassphrase(pass) {
    if (!pass) throw new Error("Passphrase required");
    const raw = loadRaw();
    const encAcct = raw.accounts.find((a) => a.enc);
    if (encAcct) {
      try {
        await decryptPriv(encAcct.enc, pass);
        return;
      } catch {
        throw new Error("Wrong passphrase");
      }
    }
    const legacy = raw.accounts.find((a) => a.privHex);
    if (!legacy) throw new Error("No keys stored");
    if (unlocked) {
      if (passphrase === pass) return;
      throw new Error("Wrong passphrase");
    }
    await this.unlock(pass);
    this.lock();
  },

  /**
   * Return decrypted private key after passphrase check. Does not require prior unlock.
   * @param {string} name
   * @param {string} pass
   */
  async revealPriv(name, pass) {
    const n = name.trim().toLowerCase();
    const acct = loadRaw().accounts.find((a) => a.name === n);
    if (!acct || !(acct.enc || acct.privHex)) {
      throw new Error("No key stored for this name");
    }
    await this.verifyPassphrase(pass);
    const fresh = loadRaw().accounts.find((a) => a.name === n);
    if (fresh?.enc) {
      try {
        return await decryptPriv(fresh.enc, pass);
      } catch {
        throw new Error("Wrong passphrase");
      }
    }
    if (unlocked) return mem.get(n) ?? fresh?.privHex ?? null;
    return fresh?.privHex ?? null;
  },
};
