/**
 * Site chrome wrapper for guld-tic-tac-toe demo.
 * Local tip hashing + optional on-chain UpdateMaster when API + keys are set.
 */

import { createClient } from "../../guld-js/src/client.js";
import { randomPrivateKey, toHex } from "../../guld-js/src/crypto.js";
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

const PKG = "/src/guld-tic-tac-toe";

const statusEl = () => document.querySelector("[data-ttt-status]");
const boardEl = () => document.querySelector("[data-ttt-board]");
const metaEl = () => document.querySelector("[data-ttt-meta]");

/** @type {import("../guld-tic-tac-toe/lib/rules.js").GameState} */
let state = initialState();
/** @type {string|null} */
let lastMaster = null;
let mark = /** @type {"X"|"O"} */ ("X");
/** @type {string|null} */
let key0 = null;
/** @type {string|null} */
let key1 = null;
let chainId = 2;
/** @type {ReturnType<typeof createClient>|null} */
let client = null;

function say(msg, kind = "pending") {
  const el = statusEl();
  if (!el) return;
  el.textContent = msg;
  el.dataset.state = kind;
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

function render() {
  const board = boardEl();
  if (!board) return;
  board.replaceChildren();
  state.board.forEach((cell, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ttt__cell";
    btn.textContent = cell || "";
    btn.disabled = Boolean(state.winner) || cell !== null;
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
          : `turn ${state.turn}`;
    meta.innerHTML = `
      <div>Move <strong>${state.move}</strong> · ${winner}</div>
      <div>X: <code>${state.players.X || "—"}</code> · O: <code>${state.players.O || "—"}</code></div>
      <div>master_hash: <code data-ttt-master>${lastMaster || "(hash tip)"}</code></div>
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
  try {
    const chainMode = document.querySelector("[data-ttt-chain]")?.checked;
    if (chainMode) {
      if (!client || !key0 || !key1) {
        say("Connect API and load/generate group keys first.", "error");
        return;
      }
      say(`On-chain move ${mark} @ ${index}…`, "pending");
      const played = await playMoveOnChain({
        client,
        name: accountName(),
        state,
        index,
        mark,
        chainId,
        key0PrivHex: key0,
        key1PrivHex: key1,
      });
      state = played.state;
      lastMaster = played.home.masterHash;
      render();
      say(
        state.winner
          ? `On-chain tip advanced — ${state.winner === "draw" ? "draw" : state.winner + " wins"}.`
          : `Tip ${lastMaster.slice(0, 18)}… on ${accountName()}`,
        "ok",
      );
      return;
    }

    state = applyMove(state, index, mark);
    say(`Played ${mark} at ${index}.`, "pending");
    render();
    await hashLocal();
    say(
      state.winner
        ? `Game over (${state.winner}). Tip hashed.`
        : `Move ${state.move} — tip ${lastMaster?.slice(0, 18) ?? "?"}…`,
      "ok",
    );
  } catch (err) {
    say(err instanceof Error ? err.message : String(err), "error");
  }
}

function bind() {
  const markSel = document.querySelector("[data-ttt-mark]");
  markSel?.addEventListener("change", () => {
    mark = /** @type {"X"|"O"} */ (
      markSel instanceof HTMLSelectElement && markSel.value === "O" ? "O" : "X"
    );
  });

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
    render();
    say("Reset (local).", "ok");
  });

  document.querySelector("[data-ttt-hash]")?.addEventListener("click", async () => {
    try {
      say("Hashing…", "pending");
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
    key0 = TTT_DEMO_KEY0_PRIV;
    key1 = TTT_DEMO_KEY1_PRIV;
    fillKeyInputs();
    const acct = document.querySelector("[data-ttt-account]");
    if (acct instanceof HTMLInputElement) acct.value = TTT_DEMO_NAME;
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
      client = createClient(apiBase());
      const st = await client.status();
      chainId = Number(st.chain_id ?? st.chainId ?? 2);
      const faucet =
        st.faucet ||
        (await fetch(`${apiBase()}/faucet`)
          .then((r) => r.json())
          .catch(() => null));
      const ttt = faucet?.tttDemo;
      const tip = ttt?.registered
        ? `ttt-demo ready (thr=${ttt.threshold})`
        : ttt
          ? "ttt-demo not registered yet (faucet will ensure on testnet)"
          : "";
      say(
        `Connected — network=${st.network || "?"} chain_id=${chainId} height=${st.height}${tip ? " · " + tip : ""}`,
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
      });
      render();
      say(`Registered ${accountName()} (1-of-2) at tip ${home.masterHash.slice(0, 18)}…`, "ok");
    } catch (err) {
      say(err instanceof Error ? err.message : String(err), "error");
    }
  });
}

say("Local leaf mode — enable chain + keys for UpdateMaster tips.", "pending");
bind();
render();
