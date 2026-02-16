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

## EOQL — Query Language

Queries are DES operations. The query itself becomes an event in the log.

### Root Commands

| Command | Returns |
|---------|---------|
| `state()` | Current projected state of entities |
| `stream()` | Raw operations from the log |

### Filtering

```
state(context.table="users")                     — all users
state(target.id="u1")                            — single entity by ID
state(context.table="users", target.status="active") — filtered
stream(op="INS", context.table="users")          — only INS ops on users
```

### Graph Traversal with `>> CON()`

Chain `>> CON()` after any query to traverse connections:

```
state(target.id="u1") >> CON()                   — direct connections
state(target.id="u1") >> CON(hops=2)             — up to 2 hops
state(target.id="u1") >> CON(hops=2, exclude="accidental")  — skip accidental
state(target.id="u1") >> CON(stance="essential") — only essential links
```

### Query via API

```json
{
  "op": "DES",
  "target": { "query": "state(context.table=\"matters\")" },
  "context": { "type": "query" }
}
```

### Subscriptions (Standing Queries)

```json
{
  "op": "DES",
  "target": { "query": "stream(context.table=\"matters\", op=\"INS\")" },
  "context": { "type": "subscription" }
}
```

Subscriptions push matching operations in real-time via SSE.

## Emergent Entities

No schema declaration needed. Entities emerge from operations. The first INS with a new `context.table` creates the table implicitly.

## Snapshot Ingest Details (REC)

```json
{
  "op": "REC",
  "target": { "rows": [...] },
  "context": { "type": "snapshot_ingest", "table": "users" },
  "frame": {
    "match_on": "id",
    "absence_means": "unchanged",
    "null_fields_mean": "unchanged"
  }
}
```

`absence_means` options:
- `"unchanged"` — missing rows are left as-is (default)
- `"deleted"` — missing rows get a NUL operation

`null_fields_mean` options:
- `"unchanged"` — null fields are ignored
- `"cleared"` — null fields get cleared

## Webhooks (Choreo → Your App)

```python
requests.post(f"{BASE}/{INST}/webhooks", auth=AUTH, json={
    "url": "https://your-app.com/webhook",
    "filter": ["INS", "ALT", "NUL"]
})
```
