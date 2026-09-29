# Faucet / registrar hardening checklist

**Operator surfaces** on public peers — not consensus. Misconfig is an ops incident. Normative product: [GIP-8](../gips/gip-8.md), [spec 16](../specs/16-sponsored-registration.md), [spec 12](../specs/12-rpc.md). Runbook: [`deploy/SIMBA.md`](../../deploy/SIMBA.md).

Use this before exposing faucet or Paymento webhooks on a public host (Simba bootstrap, mainnet desk, …).

## Checklist

| # | Control | Requirement | Status (2026-09-29) |
|---|---------|-------------|---------------------|
| 1 | **Key storage** | Faucet sk and Paymento HMAC only via env (`GULD_FAUCET_KEY`, `PAYMENTO_WEBHOOK_SECRET`) or datadir keys — **never git** | **Pass** — gitignore + static deny; `.env.example` placeholders only |
| 2 | **Faucet mainnet off** | `mode: mainnet` → faucet `None`; routes report `enabled: false` | **Pass** — `data/networks/main.json` + `main.rs` |
| 3 | **HMAC verify** | Webhook fails closed without secrets; constant-time verify of raw body | **Pass** — 503 if no secrets; 401 on bad sig |
| 4 | **Faucet cooldown** | Per-name drip/register cooldown (default 1 h) | **Pass** (+ race hardened: reserve slot before submit) |
| 5 | **Edge rate limits** | nginx `limit_req` on faucet mutate + webhook (guld.io) | **Pass** — `deploy/snippets/guld-limit-req-zones.conf` + api-proxy locations (install zones into `http{}`) |
| 6 | **Desk mutate auth** | When `GULD_REGISTRAR_MUTATE_TOKEN` set, POST/DELETE `/registrar/desks` require `Authorization: Bearer` | **Pass** (optional; **set on public hosts**) |
| 7 | **Log / response redaction** | Logs omit raw webhook body and secrets; webhook HTTP ack does not echo order/IPN payloads | **Pass** |
| 8 | **Testnet-only faucet key** | No faucet key on mainnet process; `--no-faucet` available on testnet | **Pass** |

## Known gaps (accepted for now)

| Gap | Why deferred |
|-----|----------------|
| No IP/global faucet budget in-node | nginx edge limits cover guld.io; rotating names still possible |
| `GET /registrar/orders` lists all peer orders | Gateway UI needs it; treat as **peer operator trust** — do not multi-tenant hostile merchants on one node without a later auth model |
| Desk secrets plaintext in datadir | Datadir is already secret material (faucet keys); protect disk |
| No webhook timestamp / replay window | Idempotent persist by `event_id`; Paymento retries OK |
| Registrar not mode-gated | Paid desk may run on mainnet by operator choice; turn off by omitting link/secret |

## guld.io Simba pass

| Item | Expected |
|------|----------|
| Profile | `--network simba` (`mode=testnet`) |
| Faucet | `GULD_FAUCET_KEY` or `datadir/keys/isysd.sk`; never in repo |
| Registrar | `PAYMENTO_WEBHOOK_SECRET` + `--registrar-payment-link default` |
| Mutate token | Set `GULD_REGISTRAR_MUTATE_TOKEN`; paste same value in Settings → peer desk publish token |
| nginx | Install snippets; `include` zones from `http{}`; reload |
| Mainnet | Do not run faucet; when `main` goes live, profile keeps faucet off ([031](../tasks/open/031-mainnet-genesis-ceremony.md)) |

## Quick verify

```bash
# Mainnet stub — faucet disabled
curl -s "$BASE/api/v1/faucet"   # enabled:false, reason contains testnet-only when mode=mainnet

# Webhook without secret / bad sig → 503 or 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/v1/payment-gateway-webhook" -d '{}'

# Desk mutate without Bearer when token configured → 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/v1/registrar/desks" \
  -H 'content-type: application/json' -d '{"registrarName":"x","paymentLink":"https://example.com"}'
```

## Related

- Task [054](../tasks/done/2026-09/054-faucet-registrar-hardening.md)  
- External review §6 — [`external-code-review-beta.md`](../research/external-code-review-beta.md)  
- Help: [`help/paymento.md`](../help/paymento.md)  
