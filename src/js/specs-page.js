import "./chrome.js";
import { renderMarkdownDoc } from "./lib/doc-render.js";

/** @type {Array<{ id: string, title: string, blurb: string }>} */
const SPECS = [
  { id: "00-overview", title: "00 — System overview", blurb: "Components, planes, trust boundaries" },
  { id: "01-cryptography", title: "01 — Cryptography", blurb: "Hashes, keys, encodings" },
  { id: "02-identity-and-accounts", title: "02 — Identity & accounts", blurb: "Names, homes, reserved guld" },
  { id: "03-transactions", title: "03 — Transactions", blurb: "Fixed tx vocabulary" },
  { id: "04-proofs", title: "04 — Proofs", blurb: "Leaf-consensus proofs" },
  { id: "05-state", title: "05 — State", blurb: "Accounts, roots, nonces" },
  { id: "06-blocks-and-consensus", title: "06 — Blocks & consensus", blurb: "Headers, PoW, fork choice" },
  { id: "07-fees-and-tokenomics", title: "07 — Fees & tokenomics", blurb: "Weight fees, burns, issuance" },
  { id: "08-cas-and-homes", title: "08 — CAS & homes", blurb: "Object store; mandatory guld clone" },
  { id: "09-p2p", title: "09 — P2P", blurb: "Peer protocol (skeleton)" },
  { id: "10-node", title: "10 — Node", blurb: "Full node process & APIs" },
  { id: "11-leaf-host", title: "11 — Leaf host", blurb: "Materialization & host API" },
  { id: "12-rpc", title: "12 — RPC", blurb: "JSON-RPC for wallets and tools" },
  { id: "13-foreign-chains", title: "13 — Foreign chains", blurb: "bitcoin / ethereum namespace" },
  { id: "14-reference-ui", title: "14 — Reference UI", blurb: "Desktop wallet & guld.io webapp" },
  { id: "15-ledger-import", title: "15 — Ledger import", blurb: "1.0 snapshot and ClaimLegacy" },
];

const params = new URLSearchParams(globalThis.location.search);
const docId = (params.get("doc") || "").replace(/\.md$/i, "").trim();

const indexEl = document.querySelector("[data-specs-index]");
const listEl = document.querySelector("[data-spec-list]");
const host = document.querySelector("[data-doc-host]");

if (listEl instanceof HTMLElement) {
  for (const spec of SPECS) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `/specs/?doc=${encodeURIComponent(spec.id)}`;
    a.textContent = spec.title;
    const span = document.createElement("span");
    span.textContent = spec.blurb;
    a.append(span);
    li.append(a);
    listEl.append(li);
  }
}

if (docId && host instanceof HTMLElement && indexEl instanceof HTMLElement) {
  const known = SPECS.some((s) => s.id === docId) || docId === "README";
  if (!known) {
    host.hidden = false;
    host.textContent = "Unknown specification.";
  } else {
    indexEl.hidden = true;
    host.hidden = false;
    const back = document.createElement("p");
    back.className = "doc-status";
    back.innerHTML = `<a href="/specs/">← All specs</a>`;
    host.before(back);
    renderMarkdownDoc(host, `/docs/specs/${docId}.md`);
  }
}
