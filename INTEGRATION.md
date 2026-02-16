# Choreo Integration Guide

**Base URL:** `https://choreo.intelechia.com`
**Auth:** HTTP Basic (`-u user:pass`)

## Operation Format

Every write is one POST:

```
POST /{instance}/operations
Content-Type: application/json
```

```json
{
  "op": "INS",
  "target": { "id": "u1", "name": "Alice" },
  "context": { "table": "users" },
  "frame": { "source": "my-app", "epistemic": "given" }
}
```

## The 9 Operators

| Op | Use | Target |
|----|-----|--------|
| `INS` | Create/add fields | `{"id": "u1", "name": "Alice"}` |
| `ALT` | Update fields | `{"id": "u1", "status": "active"}` |
| `NUL` | Delete entity or field | `{"id": "u1"}` |
| `CON` | Link two entities | `{"source": "u1", "target": "org1", "stance": "essential", "type": "member_of"}` |
| `SYN` | Merge duplicates | `{"merge_into": "u1", "merge_from": "u1-dupe"}` |
| `SUP` | Store conflicting values | `{"id": "u1", "field": "role", "variants": [...]}` |
| `DES` | Tag/categorize or query | `{"query": "state(context.table=\"users\")"}` |
| `SEG` | Assign to a scope | `{"id": "u1", "boundary": "west-region"}` |
| `REC` | Bulk snapshot ingest | See below |

## Python

```python
import requests

BASE = "https://choreo.intelechia.com"
AUTH = ("user", "pass")
INST = "my-app"

# Create
requests.post(f"{BASE}/{INST}/operations", auth=AUTH, json={
    "op": "INS",
    "target": {"id": "u1", "name": "Alice", "role": "admin"},
    "context": {"table": "users"},
    "frame": {"source": "signup-flow"}
})

# Update
requests.post(f"{BASE}/{INST}/operations", auth=AUTH, json={
    "op": "ALT",
    "target": {"id": "u1", "role": "superadmin"},
    "context": {"table": "users"}
})

# Connect
requests.post(f"{BASE}/{INST}/operations", auth=AUTH, json={
    "op": "CON",
    "target": {"source": "u1", "target": "org1", "stance": "essential", "type": "member_of"},
    "context": {"table": "cross"}
})

# Query
r = requests.post(f"{BASE}/{INST}/operations", auth=AUTH, json={
    "op": "DES",
    "target": {"query": 'state(context.table="users")'},
    "context": {"type": "query"}
})

# Graph traversal — everything non-accidentally connected within 2 hops
r = requests.post(f"{BASE}/{INST}/operations", auth=AUTH, json={
    "op": "DES",
    "target": {"query": 'state(target.id="u1") >> CON(hops=2, exclude="accidental")'},
    "context": {"type": "query"}
})
```

## Snapshot Ingest (Scraper/Sync)

Dump current state. Choreo diffs it automatically.

```python
requests.post(f"{BASE}/{INST}/operations", auth=AUTH, json={
    "op": "REC",
    "target": {
        "rows": [
            {"id": "u1", "name": "Alice", "status": "active"},
            {"id": "u2", "name": "Bob", "status": "active"}
        ]
    },
    "context": {"type": "snapshot_ingest", "table": "users"},
    "frame": {
        "match_on": "id",
        "absence_means": "unchanged",
        "null_fields_mean": "unchanged"
    }
})
```

## Batch Seed

```python
requests.post(f"{BASE}/instances/{INST}/seed", auth=AUTH, json={
    "operations": [
        {"op": "INS", "target": {"id": "u1", "name": "Alice"}, "context": {"table": "users"}},
        {"op": "INS", "target": {"id": "u2", "name": "Bob"}, "context": {"table": "users"}},
        {"op": "CON", "target": {"source": "u1", "target": "u2", "stance": "generative", "type": "collaborates"}, "context": {"table": "cross"}}
    ]
})
```

## Reading

```
GET /{instance}/state/{table}          — all entities
GET /{instance}/state/{table}/{id}     — single entity
GET /{instance}/biography/{id}         — full operation history
GET /{instance}/gaps/{table}           — what's missing
GET /{instance}/stream                 — real-time SSE
```

## CON Stances

| Stance | Meaning |
|--------|---------|
| `accidental` | Contingent — could be different |
| `essential` | Structural — entity depends on it |
| `generative` | Productive — creates new capacity |

## Frame (Provenance)

```json
{"frame": {"epistemic": "given", "source": "hr-api", "authority": "admin"}}
```

`"given"` = observed fact, `"meant"` = human interpretation, `"derived"` = computed

## Webhooks (Choreo → Your App)

```python
requests.post(f"{BASE}/{INST}/webhooks", auth=AUTH, json={
    "url": "https://your-app.com/webhook",
    "filter": ["INS", "ALT", "NUL"]
})
```
