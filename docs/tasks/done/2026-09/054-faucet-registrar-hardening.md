# Task: Faucet / registrar webhook hardening checklist

Status: done  
Priority: normal  
GIP: ../gips/gip-8.md  
Spec: ../specs/16-sponsored-registration.md, ../specs/12-rpc.md  
Related: ../fragments/faucet-registrar-hardening.md, ../../deploy/SIMBA.md, ../whitepaper/guld-2.0.md §12, ../research/external-code-review-beta.md §6  

## Problem

Faucet and registrar / Paymento HMAC surfaces are **operator** paths on public peers. Misconfig is not a consensus failure but will be probed on beta/mainnet hosts. Whitepaper roadmap calls for a security pass; no dedicated checklist exists.

## Done when

- [x] Checklist: key storage (env/datadir only), rate limits, HMAC verify, disable-on-mainnet, log redaction  
- [x] Code/docs pass against checklist on guld.io Simba config  
- [x] Mainnet profile: faucet off (align [031](../open/031-mainnet-genesis-ceremony.md))  

## Non-goals

- Consensus changes  
- Mandatory paid registrar  

## Notes

```
2026-09-29: Opened from external review §6 + whitepaper security-pass note.
2026-09-29: Done — fragments/faucet-registrar-hardening.md; mutate token; webhook
           ack redaction; faucet cooldown race; nginx rate-limit snippets; main.json
           already mode=mainnet (faucet off); 031 checklist updated.
```
