/**
 * Site chrome wrapper for guld-tic-tac-toe demo.
 * Default: on-chain hot-seat (turns follow state.turn) with Simba demo keys.
 */

import { createClient } from "../guld-js/src/client.js";
import { randomPrivateKey, toHex } from "../guld-js/src/crypto.js";
import {
  TTT_DEMO_KEY0_PRIV,
  TTT_DEMO_KEY1_PRIV,
  TTT_DEMO_NAME,
} from "../guld-tic-tac-toe/lib/demo-keys.js";
import {
  applyMove,
  encodeState,
  initialState,
  seatPlayer,
} from "../guld-tic-tac-toe/lib/rules.js";
import {
  genesisGameHome,
  playMoveOnChain,
  registerGameGroup,
} from "../guld-tic-tac-toe/lib/play.js";
import {
  explorerPendingTxHref,
  extractTxId,
  formatTxSubmittedHtml,
} from "./lib/tx-feedback.js";
import { escapeHtml } from "./lib/rpc.js";

const PKG = "/src/guld-tic-tac-toe";

const statusEl = () => document.querySelector("[data-ttt-status]");
const boardEl = () => document.querySelector("[data-ttt-board]");
const metaEl = () => document.querySelector("[data-ttt-meta]");

/** @type {import("../guld-tic-tac-toe/lib/rules.js").GameState} */
let state = initialState();
/** @type {string|null} */
let lastMaster = null;
/** @type {string|null} */
let lastTxId = null;
/** @type {string|null} */
let key0 = null;
/** @type {string|null} */
let key1 = null;
let chainId = 2;
/** @type {ReturnType<typeof createClient>|null} */
let client = null;
/** @type {Promise<void>|null} */
let readyChain = null;
/** Optimistic on-chain tip after mempool submits (nonce + master_hash). */
let optimisticAccount = null;
/** Serialize submits so nonce chain stays ordered. */
let submitLock = false;

/**
 * @param {string} msg plain text, or HTML when html=true
 * @param {string} [kind]
 * @param {{ html?: boolean }} [opts]
 */
function say(msg, kind = "pending", opts = {}) {
  const el = statusEl();
  if (!el) return;
  if (opts.html) el.innerHTML = msg;
  else el.textContent = msg;
  el.dataset.state = kind;
}

/** @param {import("../guld-tic-tac-toe/lib/rules.js").GameState} s */
function turnPrompt(s) {
  if (s.winner === "draw") return "Draw — New game to play again.";
  if (s.winner) return `${s.winner} wins — New game to play again.`;
  return `${s.turn} to move — click a cell.`;
}

/** @param {string|null|undefined} txid */
function shortTx(txid) {
  const id = String(txid || "");
  return id.length > 20 ? `${id.slice(0, 18)}…` : id;
}

/** @param {string|null|undefined} txid */
function txExplorerHtml(txid) {
  const id = String(txid || "").trim();
  if (!id || id === "ok") return "";
  const href = explorerPendingTxHref(id);
  return `<a href="${href}">${escapeHtml(shortTx(id))}</a>`;
}

function apiBase() {
  const input = document.querySelector("[data-ttt-api]");
  if (input instanceof HTMLInputElement && input.value.trim()) {
    return input.value.trim().replace(/\/$/, "");
  }
  return "/api/v1";
}

function accountName() {
  const input = document.querySelector("[data-ttt-account]");
  return input instanceof HTMLInputElement
    ? input.value.trim().toLowerCase() || TTT_DEMO_NAME
    : TTT_DEMO_NAME;
}

function fillKeyInputs() {
  const k0 = document.querySelector("[data-ttt-key0]");
  const k1 = document.querySelector("[data-ttt-key1]");
  if (k0 instanceof HTMLInputElement && key0) k0.value = key0;
  if (k1 instanceof HTMLInputElement && key1) k1.value = key1;
}

function loadDemoKeys() {
  key0 = TTT_DEMO_KEY0_PRIV;
  key1 = TTT_DEMO_KEY1_PRIV;
  fillKeyInputs();
  const acct = document.querySelector("[data-ttt-account]");
  if (acct instanceof HTMLInputElement) acct.value = TTT_DEMO_NAME;
}

function chainModeOn() {
  return Boolean(document.querySelector("[data-ttt-chain]")?.checked);
}

function setChainMode(on) {
  const el = document.querySelector("[data-ttt-chain]");
  if (el instanceof HTMLInputElement) el.checked = on;
}

async function connectPeer() {
  client = createClient(apiBase());
  const st = await client.status();
  chainId = Number(st.chain_id ?? st.chainId ?? 2);
  try {
    await client.faucetEnsureTttDemo?.();
  } catch {
    /* optional — peer may already have ttt-demo */
  }
  return st;
}

/**
 * Connect + demo keys so on-chain clicks work without Advanced.
 * @returns {Promise<void>}
 */
async function ensureOnChainReady() {
  if (client && key0 && key1) return;
  if (readyChain) return readyChain;
  readyChain = (async () => {
    say("Connecting to peer + loading ttt-demo keys…", "pending");
    loadDemoKeys();
    setChainMode(true);
    const st = await connectPeer();
    const tip = `${st.network || "peer"} · chain ${chainId}`;
    say(`${turnPrompt(state)} On-chain · ${tip}`, "ok");
  })().catch((err) => {
    readyChain = null;
    client = null;
    throw err;
  });
  return readyChain;
}

function render() {
  const board = boardEl();
  if (!board) return;
  board.replaceChildren();
  state.board.forEach((cell, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ttt__cell";
    btn.textContent = cell || "";
    btn.disabled = submitLock || Boolean(state.winner) || cell !== null;
    btn.setAttribute("aria-label", cell ? `Cell ${i + 1}: ${cell}` : `Cell ${i + 1}, empty`);
    btn.addEventListener("click", () => onCell(i));
    board.append(btn);
  });

  const meta = metaEl();
  if (meta) {
    const winner =
      state.winner === "draw"
        ? "draw"
        : state.winner
          ? `${state.winner} wins`
          : `${state.turn}'s turn`;
    const acct = accountName();
    const tipHtml = lastMaster
      ? `<a href="/explorer/#/account/${encodeURIComponent(acct)}"><code data-ttt-master>${escapeHtml(lastMaster)}</code></a>`
      : `<code data-ttt-master>(hash tip after a move)</code>`;
    const txHtml = lastTxId
      ? `<div>txid: ${txExplorerHtml(lastTxId)} <span class="ttt__muted">(explorer)</span></div>`
      : "";
    meta.innerHTML = `
      <div>Move <strong>${state.move}</strong> · ${escapeHtml(winner)}</div>
      <div>master_hash: ${tipHtml}</div>
      ${txHtml}
    `;
  }
}

async function fetchText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`fetch ${path}: ${res.status}`);
  return res.text();
}

async function hashLocal() {
  const { buildFlatHome } = await import("/src/guld-js/src/leaf.js");
  const files = {
    "state.json": encodeState(state),
    "leaf.json": await fetchText(`${PKG}/leaf.json`),
    "game/index.html": await fetchText(`${PKG}/game/index.html`),
    "game/app.js": await fetchText(`${PKG}/game/app.js`),
    "game/ttt.css": await fetchText(`${PKG}/game/ttt.css`),
    "lib/rules.js": await fetchText(`${PKG}/lib/rules.js`),
  };
  const home = await buildFlatHome(files);
  lastMaster = home.masterHash;
  const code = document.querySelector("[data-ttt-master]");
  if (code) code.textContent = lastMaster;
  return home;
}

async function onCell(index) {
  if (submitLock) return;
  try {
    const mark = state.turn;
    if (chainModeOn()) {
      try {
        await ensureOnChainReady();
      } catch (err) {
        say(
          err instanceof Error
            ? `On-chain setup failed: ${err.message}`
            : String(err),
          "error",
        );
        return;
      }
      if (!client || !key0 || !key1) {
        say("On-chain mode needs a peer + ttt-demo keys (see Advanced).", "error");
        return;
      }
      say(`Submitting ${mark}…`, "pending");
      submitLock = true;
      render();
      try {
        const played = await playMoveOnChain({
          client,
          name: accountName(),
          state,
          index,
          mark,
          chainId,
          key0PrivHex: key0,
          key1PrivHex: key1,
          waitInclusion: false,
          account: optimisticAccount || undefined,
        });
        state = played.state;
        lastMaster = played.home.masterHash;
        lastTxId = extractTxId(played.out) || lastTxId;
        optimisticAccount = played.account;
        const label = turnPrompt(state);
        say(
          formatTxSubmittedHtml(`${mark} in mempool · ${label}`, played.out) ||
            escapeHtml(`${mark} in mempool · ${label}`),
          "ok",
          { html: true },
        );
      } finally {
        submitLock = false;
        render();
      }
      return;
    }

    state = applyMove(state, index, mark);
    lastTxId = null;
    render();
    say(turnPrompt(state), state.winner ? "ok" : "pending");
    void hashLocal()
      .then(() => {
        const code = document.querySelector("[data-ttt-master]");
        if (code && lastMaster) code.textContent = lastMaster;
      })
      .catch(() => {
        /* keep playing even if hash helpers fail */
      });
  } catch (err) {
    submitLock = false;
    say(err instanceof Error ? err.message : String(err), "error");
    render();
  }
}

function bind() {
  document.querySelector("[data-ttt-seat]")?.addEventListener("click", () => {
    try {
      const x = /** @type {HTMLInputElement|null} */ (document.querySelector("[data-ttt-name-x]"));
      const o = /** @type {HTMLInputElement|null} */ (document.querySelector("[data-ttt-name-o]"));
      if (x?.value) state = seatPlayer(state, "X", x.value);
      if (o?.value) state = seatPlayer(state, "O", o.value);
      render();
      say("Seated players on local state.", "ok");
    } catch (err) {
      say(err instanceof Error ? err.message : String(err), "error");
    }
  });

  document.querySelector("[data-ttt-reset]")?.addEventListener("click", () => {
    state = initialState();
    lastMaster = null;
    lastTxId = null;
    optimisticAccount = null;
    submitLock = false;
    render();
    say(turnPrompt(state), "pending");
  });

  document.querySelector("[data-ttt-hash]")?.addEventListener("click", async () => {
    try {
      say("Hashing tip…", "pending");
      const home = await hashLocal();
      say(`Tip ${home.masterHash}`, "ok");
      render();
    } catch (err) {
      say(err instanceof Error ? err.message : String(err), "error");
    }
  });

  document.querySelector("[data-ttt-export]")?.addEventListener("click", () => {
    const blob = new Blob([encodeState(state)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "state.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.querySelector("[data-ttt-load-demo]")?.addEventListener("click", () => {
    loadDemoKeys();
    say("Loaded published Simba ttt-demo keys (1-of-2 throwaways).", "ok");
  });

  document.querySelector("[data-ttt-gen-keys]")?.addEventListener("click", async () => {
    key0 = toHex(await randomPrivateKey());
    key1 = toHex(await randomPrivateKey());
    fillKeyInputs();
    say("Generated throwaway 1-of-2 keys (keep private).", "ok");
  });

  document.querySelector("[data-ttt-connect]")?.addEventListener("click", async () => {
    try {
      readyChain = null;
      const st = await connectPeer();
      say(
        `Connected — network=${st.network || "?"} chain_id=${chainId} height=${st.height}`,
        "ok",
      );
    } catch (err) {
      client = null;
      say(err instanceof Error ? err.message : String(err), "error");
    }
  });

  document.querySelector("[data-ttt-register]")?.addEventListener("click", async () => {
    try {
      if (!client) throw new Error("Connect to a node first");
      const k0el = document.querySelector("[data-ttt-key0]");
      const k1el = document.querySelector("[data-ttt-key1]");
      const payerEl = document.querySelector("[data-ttt-payer-key]");
      key0 = k0el instanceof HTMLInputElement ? k0el.value.trim() : key0;
      key1 = k1el instanceof HTMLInputElement ? k1el.value.trim() : key1;
      const payerPriv = payerEl instanceof HTMLInputElement ? payerEl.value.trim() : "";
      if (!key0 || !key1 || !payerPriv) {
        throw new Error("Need payer key + both group keys");
      }
      say("Building genesis home + register_group (1-of-2)…", "pending");
      const { state: genesis, home } = await genesisGameHome({
        x: /** @type {HTMLInputElement} */ (document.querySelector("[data-ttt-name-x]"))?.value,
        o: /** @type {HTMLInputElement} */ (document.querySelector("[data-ttt-name-o]"))?.value,
      });
      state = genesis;
      lastMaster = home.masterHash;
      const payerName =
        /** @type {HTMLInputElement} */ (document.querySelector("[data-ttt-payer]"))?.value.trim() ||
        "alice";
      await registerGameGroup({
        client,
        name: accountName(),
        payerName,
        payerPrivHex: payerPriv,
        key0PrivHex: key0,
        key1PrivHex: key1,
        initialMasterHash: home.masterHash,
      }).then((reg) => {
        lastTxId = extractTxId(reg.out) || lastTxId;
        return reg;
      });
      render();
      say(
        formatTxSubmittedHtml(
          `Registered ${accountName()} (1-of-2)`,
          { tx_id: lastTxId },
        ),
        "ok",
        { html: true },
      );
    } catch (err) {
      say(err instanceof Error ? err.message : String(err), "error");
    }
  });
}

bind();
render();
setChainMode(true);
void ensureOnChainReady().catch((err) => {
  say(
    err instanceof Error
      ? `Could not auto-connect (${err.message}). Uncheck On-chain for local play, or use Advanced.`
      : String(err),
    "error",
  );
});
