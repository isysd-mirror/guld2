# Spec 12 — Node API (HTTP + transitional JSON-RPC)

**Status:** draft  
**Canonical transport:** HTTP `/api/v1/…` on `guld-node --http`  
**Transitional:** HTTP POST JSON-RPC 2.0 on `--rpc` (`POST /`, `POST /rpc`) and optional Unix socket  

**Related:** [`00-overview.md`](00-overview.md), [`14-reference-ui.md`](14-reference-ui.md), [`../research/jsonrpc-vs-http-api.md`](../research/jsonrpc-vs-http-api.md)

## 1. Purpose

One **operation set** for wallets, exchanges, dapps, and tools. Encoding differs; validation does not.

| Audience | Prefer |
|----------|--------|
| Exchanges, dapps, reference PWA | **HTTP** `/api/v1/…` |
| Existing Rust/Python tooling | JSON-RPC until migrated |

Implementations MUST keep handlers shared so HTTP and JSON-RPC cannot diverge in consensus meaning.

## 2. Conventions

- Hashes/keys: `0x` + hex lowercase  
- Amounts: decimal string of integer quanta  
- HTTP errors: status + `{ "detail": "…" }` with optional `code` matching the table below  
- JSON-RPC errors: JSON-RPC envelope with `error.code` from the same table  
- Method names below are the **logical** operation ids (`guld_*`); HTTP maps them to resource routes  

## 3. HTTP routes (shipped / target)

Prefix: `/api/v1`. Shipped today on `guld-node --http`:

| Method | Path | Logical ops | Status |
|--------|------|-------------|--------|
| `GET` | `/health` | — | shipped |
| `GET` | `/chain/status` | `guld_blockNumber`, `guld_chainId`, `guld_ready`, `guld_syncing` | shipped |
| `GET` | `/chain/accounts/{name}` | `guld_getAccount`, `guld_getBalance` | shipped |
| `GET` | `/chain/accounts/{name}/activity` | `guld_getAccountActivity` | shipped |
| `GET` | `/chain/accounts/{name}/exists` | `guld_accountExists` | shipped |
| `GET` | `/registrar` | — (optional paid desk config) | shipped |
| `POST` | `/payment-gateway-webhook` | — (Paymento HMAC webhook) | shipped |
| `POST` | `/chain/transactions` | `guld_sendTransaction` / `guld_sendRawTransaction` | **target** (PWA write path) |

Further routes (blocks, CAS, estimates, net) SHOULD be added as resources with the same coverage as §4 — not a looser subset.

Optional: `guld-node --http-static <dir>` serves the reference wallet tree from the same process (same-origin `/api/v1`).

### Optional paid registrar (out of consensus)

When `--registrar-payment-link` (or `GULD_REGISTRAR_PAYMENT_LINK`) is set:

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/registrar` | `{ enabled, provider, paymentLink }` for wallet UI |
| `POST` | `/payment-gateway-webhook` | Paymento Payment Link webhooks; requires `PAYMENTO_WEBHOOK_SECRET` |

See [`../intents/bootstrap-gateway-registrar.md`](../intents/bootstrap-gateway-registrar.md).

## 4. Logical operations (JSON-RPC method names)

### Chain / node

| Method | Params | Result |
|--------|--------|--------|
| `guld_chainId` | [] | `Number` |
| `guld_blockNumber` | [] | `Quantity` height |
| `guld_getBlockByNumber` | `[height, fullTxs]` | Block object |
| `guld_getBlockByHash` | `[hash, fullTxs]` | Block object |
| `guld_syncing` | [] | `false` \| sync status |
| `guld_getGuldRulesHash` | [] | `Hash` active rules |
| `guld_ready` | [] | bool |

### Accounts / state

| Method | Params | Result |
|--------|--------|--------|
| `guld_getAccount` | `[name]` | Account object or `null` |
| `guld_findAccountsByPubkey` | `[pubkey]` | `Account[]` whose key set includes the pubkey |
| `guld_getBalance` | `[name]` | Amount string |
| `guld_getMasterHash` | `[name]` | Hash |
| `guld_accountExists` | `[name]` | bool |
| `guld_getAccountActivity` | `[name, limit]` | `ActivityItem[]` |
| `guld_searchAccounts` | `[prefix, limit]` | `[AccountSummary]` — **draft / not implemented** |

`guld_searchAccounts` (when added): case-sensitive prefix match on registered names; `limit` default 20, max 100. Large deployments SHOULD use an off-consensus indexer.

Draft `AccountSummary`: `{ "name", "balance", "kind" }`.

### Transactions

| Method | Params | Result |
|--------|--------|--------|
| `guld_estimateWeight` | `[txJson]` | `Quantity` weight |
| `guld_estimateRegistrationFee` | `[name, kind?, nKeys?, height?]` | Fee object (see §5.1) |
| `guld_estimateRegistrationBurn` | *(deprecated alias)* | Same as `guld_estimateRegistrationFee` |
| `guld_sendRawTransaction` | `[rawHex]` | `TxId` |
| `guld_sendTransaction` | `[txJson]` | `TxId` (node MAY refuse if unsigned) |
| `guld_getTransaction` | `[txid]` | Tx + receipt meta |
| `guld_getMempoolFeeHints` | [] | `{ fee_rate_min, fee_rate_recommended }` |

### CAS

| Method | Params | Result |
|--------|--------|--------|
| `guld_hasObject` | `[objectId]` | bool |
| `guld_getObject` | `[objectId]` | base64 or hex bytes (size-limited) |
| `guld_putObject` | `[bytes]` | `objectId` (content-addressed; size/rate limits) |

### Net

| Method | Params | Result |
|--------|--------|--------|
| `guld_peerCount` | [] | Number |

## 5. Registration fee estimate

`guld_estimateRegistrationFee` MUST accept **`name`** (required for individuals and groups) and return letter-based fees per [`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md). `guld_estimateRegistrationBurn` is a **deprecated alias** (same params/result).

```json
{
  "fee": "<quanta>",
  "height": "<h>",
  "kind": "individual|group|subaccount",
  "nKeys": <n>,
  "letterCount": <L>,
  "feeGuld": "<decimal GULD string>"
}
```

- `kind` default `"individual"`; `nKeys` default `1` (group initial signer count).  
- `fee` is the protocol registration fee (paid to the block miner — **not** burned).  
- Subaccounts: `letterCount` omitted; fee = `F_sub`.

## 6. Account JSON shape (draft)

```json
{
  "name": "alice",
  "account_id": "0x…",
  "kind": "individual",
  "keys": ["0x…"],
  "threshold": 1,
  "nonce": "0",
  "master_hash": "0x…",
  "balance": "100000000",
  "remotes": [{ "url": "https://github.com/…", "kind": "git" }]
}
```

## 7. Error codes

| Code | Meaning | Typical HTTP |
|------|---------|--------------|
| `-32000` | Tx rejected (validation) | 502 / 400 |
| `-32001` | Unknown name | 404 |
| `-32002` | Insufficient balance | 400 |
| `-32003` | Bad proof | 400 |
| `-32004` | Object too large / missing | 400 / 404 |
| `-32005` | Name reserved (`guld`) | 400 |
| `-32006` | Node not ready (e.g. `guld` rule bundle incomplete) | 503 |
| `-32601` | Method / route not found | 404 |
| `-32602` | Bad params | 400 |

## 8. Auth (permissionless proofs)

| Operation class | Authorization |
|-----------------|---------------|
| Public reads | None (DoS rate limits only) |
| Submit tx | Embedded signatures / dual-register / leaf proofs |
| Put CAS object | Content hash match + size/rate limits |
| Local admin | Bind to localhost / unix socket |

Remote TLS authenticates the **server name** to the client. It does not replace tx proofs. Operator API keys are **deployment policy**, not protocol.

## 9. Open parameters

- Complete HTTP route table for all §4 ops + OpenAPI  
- SSE / WebSocket for `newHeads`  
- `guld_searchAccounts` index strategy  
- Deprecation timeline for JSON-RPC adapter  
