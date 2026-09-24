import "./chrome.js";
import { escapeHtml } from "./lib/rpc.js";

/**
 * @typedef {{ name: string, balance: string, balance_quanta: string, pgp_fingerprints: string[], claim_state: string, claimed_at_height?: number }} Row
 * @typedef {{ version: number, note: string, manifest_hash: string, accounts: number, with_pgp: number, unbound: number, claimed: number, total_guld: string, accounts_rows: Row[] }} Snapshot
 */

/** @type {Snapshot | null} */
let snapshot = null;
/** @type {"name" | "balance" | "claim_state"} */
let sortKey = "balance";
let sortDir = -1;

const metaEl = document.querySelector("[data-explorer-meta]");
const tableHost = document.querySelector("[data-explorer-table]");
const qEl = document.querySelector("[data-explorer-q]");
const stateEl = document.querySelector("[data-explorer-state]");

async function boot() {
  try {
    const res = await fetch("/data/legacy-accounts.json", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    snapshot = /** @type {Snapshot} */ (await res.json());
    if (metaEl instanceof HTMLElement) {
      metaEl.textContent = `${snapshot.accounts.toLocaleString()} accounts · ${snapshot.total_guld} GULD · ${snapshot.with_pgp} PGP-ready · ${snapshot.unbound} unbound · ${snapshot.claimed} claimed · manifest ${snapshot.manifest_hash.slice(0, 18)}…`;
    }
    render();
  } catch (err) {
    if (tableHost instanceof HTMLElement) {
      tableHost.innerHTML = `<p class="explorer__empty">Could not load legacy snapshot.</p>`;
    }
    console.warn("legacy-explorer:", err);
  }
}

function render() {
  if (!(tableHost instanceof HTMLElement) || !snapshot) return;
  const q = (qEl instanceof HTMLInputElement ? qEl.value : "").trim().toLowerCase();
  const stateFilter = stateEl instanceof HTMLSelectElement ? stateEl.value : "all";

  let rows = snapshot.accounts_rows.filter((row) => {
    if (stateFilter !== "all" && row.claim_state !== stateFilter) return false;
    if (!q) return true;
    if (row.name.toLowerCase().includes(q)) return true;
    return row.pgp_fingerprints.some((fp) => fp.toLowerCase().includes(q));
  });

  rows = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "balance") {
      const aq = BigInt(a.balance_quanta || "0");
      const bq = BigInt(b.balance_quanta || "0");
      cmp = aq < bq ? -1 : aq > bq ? 1 : 0;
    } else if (sortKey === "claim_state") {
      cmp = a.claim_state.localeCompare(b.claim_state);
    } else {
      cmp = a.name.localeCompare(b.name);
    }
    return cmp * sortDir;
  });

  if (!rows.length) {
    tableHost.innerHTML = `<p class="explorer__empty">No rows match.</p>`;
    return;
  }

  const table = document.createElement("table");
  table.className = "explorer-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th><button type="button" data-sort="name">Name</button></th>
        <th class="num"><button type="button" data-sort="balance">Balance (GULD)</button></th>
        <th>PGP fingerprints</th>
        <th><button type="button" data-sort="claim_state">Claim state</button></th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement("tbody");
  const frag = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement("tr");
    const fps =
      row.pgp_fingerprints.length > 0
        ? row.pgp_fingerprints.map((fp) => `<div class="explorer-fp">${escapeHtml(fp)}</div>`).join("")
        : `<span class="explorer-fp">—</span>`;
    tr.innerHTML = `
      <td><strong>${escapeHtml(row.name)}</strong></td>
      <td class="num">${escapeHtml(row.balance)}</td>
      <td>${fps}</td>
      <td><span class="claim-pill claim-pill--${escapeHtml(row.claim_state)}">${escapeHtml(row.claim_state)}</span></td>
    `;
    frag.append(tr);
  }
  tbody.append(frag);
  table.append(tbody);
  tableHost.replaceChildren(table);

  table.querySelectorAll("[data-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = /** @type {"name"|"balance"|"claim_state"} */ (btn.getAttribute("data-sort"));
      if (sortKey === key) sortDir *= -1;
      else {
        sortKey = key;
        sortDir = key === "balance" ? -1 : 1;
      }
      render();
    });
  });
}

qEl?.addEventListener("input", () => render());
stateEl?.addEventListener("change", () => render());
boot();
