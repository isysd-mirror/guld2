# Spec 11 — Leaf host

**Status:** draft

## 1. Role

The **leaf host** materializes account homes for clients and MAY run leaf-defined processes. It is **not** required for consensus validation (except that a full node’s CAS MUST hold the on-chain **`guld` rule bundle** — not protocol source trees).

Typical deployment: embedded in `guld-node --leaf-host`, or standalone talking to a node’s RPC + CAS.

## 2. Responsibilities

| Duty | Requirement |
|------|-------------|
| Resolve name → `master_hash` | Via node RPC |
| Fetch home objects | CAS / P2P / `remotes[]` |
| Expose files | HTTP or FUSE-like **MAY**; simplest: HTTP file API |
| Optional runtime | Start leaf-declared server/binary **MAY** |
| Assist updates | Build trees, collect cosigns, submit `UpdateMaster` |

## 3. HTTP API (draft)

Base: `http://leaf-host/` (local auth **TBD**).

| Method | Path | Semantics |
|--------|------|-----------|
| `GET` | `/v1/accounts/{name}/tip` | `{ master_hash, height_seen }` |
| `GET` | `/v1/accounts/{name}/tree` | List root entries |
| `GET` | `/v1/accounts/{name}/blob/{object_id}` | Raw bytes |
| `POST` | `/v1/accounts/{name}/materialize` | Ensure tree present |
| `POST` | `/v1/accounts/{name}/update` | Body: new tree push + cosignatures → builds tx, returns txid or raw tx |
| `GET` | `/v1/health` | Host health |

Auth: draft **unix socket + local token**; remote leaf-host MUST use TLS + capability tokens.

## 4. Runtime hooks (optional)

Leaf MAY include a manifest object (path **TBD**, e.g. `leaf.json`):

```json
{
  "runtime": "none" | "http-static" | "exec",
  "exec": { "argv": ["./bin/server"], "port": 8080 },
  "http_static": { "root": "/var/www/guld.io" }
}
```

Host MAY refuse unknown runtimes. Refusal does not affect on-chain validity of the tip.

## 5. Git remotes

Host MAY `git clone` / `git fetch` URLs from account `remotes[]` when objects missing, then `cas.put` resulting blobs and verify they match expected `ObjectId`s / tree root. Mismatch ⇒ error (do not trust forge alone).

## 6. Component API

```text
trait LeafHost {
  fn materialize(&self, name: &Name) -> Result<PathBuf, HostError>;
  fn read_blob(&self, name: &Name, id: &ObjectId) -> Result<Vec<u8>, HostError>;
  fn prepare_update(&self, name: &Name, new_root: Hash32, proof: LeafConsensusProof) -> Result<Tx, HostError>;
}
```

## 7. Open parameters

- Manifest schema  
- Sandbox policy for `exec`  
- Multi-tenant hosted leaf-host product needs
