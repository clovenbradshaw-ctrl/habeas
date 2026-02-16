# Habeas — n8n Workflow Documentation (v3)

## Overview

The Habeas frontend communicates with a single n8n webhook that routes all actions through an **operation-sourcing** architecture. Instead of separate Airtable tables for each entity type, all state changes are recorded as immutable operation rows in a single **Habeas Operations** table. Entity state is reconstructed ("materialized") by replaying operations in chronological order.

## Architecture

### Single Webhook Entry Point

All requests are `POST` to the n8n webhook path `/habeas` with `responseMode: responseNode`. The webhook accepts JSON bodies and supports CORS (`Access-Control-Allow-Origin: *`).

### Request Flow

```
Webhook (POST /habeas)
  → Parse Request (extract action, email, recordId, entityId)
    → Route (switch on action)
      → [action-specific pipeline]
        → Respond to Webhook (JSON with CORS headers)
```

### Operation-Sourcing Model

Every write operation creates one or more rows in the Habeas Operations table. Reads reconstruct state by replaying those rows. This gives full provenance, version history, and auditability for every field change.

**Operator codes:**

| Operator | Meaning | Target Structure |
|----------|---------|-----------------|
| `INS` | Insert — create a new entity | `{ id, name, ...fields }` |
| `ALT` | Alter — change a single field | `{ id, field, from?, to }` |
| `DES` | Describe — set a descriptive field | `{ field, value }` |
| `CON` | Connect — create a relationship | `{ from: {type, id}, to: {type, id}, relation }` |
| `REC` | Record — log a recognition or event | `{ recognition?, bond_amount?, ...data }` |
| `SUP` | Supply — attach supporting values | `{ field, values }` |
| `NUL` | Nullify — soft-delete an entity | `{ reason }` |

**Entity types:** `matter`, `facility`, `warden`, `relationship`, `template`

## Airtable Schema

### Single Table: Habeas Operations

**Base:** Habeas (`appI0mBBQRoQTMZOc`)
**Table:** Habeas Operations (`tblcalDWX2zHThdR0`)

| Field | Type | Description |
|-------|------|-------------|
| `RecordId` | Auto (readonly) | Airtable record ID |
| `operator` | Single Select | Operation code: `INS`, `ALT`, `DES`, `CON`, `REC`, `SUP`, `NUL` |
| `Target` | Text (JSON) | Serialized payload — structure depends on operator (see table above) |
| `context` | Text (JSON) | `{ type, source }` — entity type and where the op originated |
| `frame` | Text (JSON) | Metadata: circuit, owner, demo flag, template version, etc. |
| `agent` | Text | Email of the user who performed the action |
| `entity_id` | Text | Deterministic ID of the entity this op belongs to |
| `entity_type` | Text | `matter`, `facility`, `warden`, `relationship`, `template` |
| `Content` | Text | Free-text content (used for template ops) |
| `Attachments` | Attachment | File attachments |
| `Attachment Summary` | Text | Summary of attached files |
| `Status` | Text | Status flag (used to mark active templates) |
| `Created` | DateTime (readonly) | Airtable auto-timestamp |

### Entity ID Conventions

| Entity Type | ID Pattern | Example |
|-------------|-----------|---------|
| Matter | `mat_{slug}_{timestamp}` | `mat_john_doe_1708100000000` |
| Facility | `fac_{slug}` | `fac_farmville_detention_center` |
| Warden | `war_{slug}` | `war_jane_smith` |
| Relationship | `{entity1_id}::{entity2_id}` | `mat_john_doe_123::fac_farmville` |

Slugs are derived from names: lowercased, non-alphanumeric characters replaced with `_`, truncated to 30–40 chars. Facility and warden IDs are deterministic (idempotent on repeated creation).

## API Actions

### Request Format

All requests are `POST` with JSON body:

```json
{
  "action": "action_name",
  "email": "user@example.com",
  ...action-specific fields
}
```

### Parse Request Node

Extracts a clean routing object from the raw webhook input:

```json
{
  "action": "body.action || query.action",
  "email": "body.email || query.email",
  "recordId": "body.recordId || query.recordId",
  "entityId": "body.entityId || query.entityId",
  "body": { ...full body }
}
```

### Route (Switch Node)

Routes on `action` to 9 pipelines:

| Output | Action | Pipeline |
|--------|--------|----------|
| 0 | `list_matters` | Search All Matter Ops → Materialize All Matters → Respond |
| 1 | `get_matter` | Search Entity Ops → Search Active Template → Materialize Single Matter → Respond |
| 2 | `create_matter` | Build Create Ops → Insert Create Ops → Collect Results → Respond |
| 3 | `save_fields` | Build Save Ops → Insert Save Ops → Respond |
| 4 | `advance_stage` | Build Stage Op → Insert Stage Op → Respond |
| 5 | `list_directory` | Search Directory Ops → Search Directory Relationships → Materialize Directory → Respond |
| 6 | `get_facility` | Search Facility Ops → Search Facility Relationships → Materialize Facility Detail → Respond |
| 7 | `save_facility` | Build Facility Save Ops → Insert Facility Ops → Respond |
| 8 | `get_entity_history` | Search History Ops → Format Entity History → Respond |

---

## Action Details

### 1. `list_matters`

**Purpose:** List all matters the requesting user has access to.

**Request:**
```json
{ "action": "list_matters", "email": "user@example.com" }
```

**Pipeline:**
1. **Search All Matter Ops** — Airtable search: `{entity_type}='matter'` (returns all ops)
2. **Materialize All Matters** — Code node that:
   - Groups operations by `entity_id`
   - Replays ops in chronological order to reconstruct each matter's current state
   - Computes `daysInStage` from the timestamp of the last stage-setting op
   - Skips matters destroyed by `NUL` ops
   - **Attorney scoping:** Filters to matters where `owner === requestEmail`, or `demo === true`, or `requestEmail === 'dev@local'`

**Response:**
```json
{
  "matters": [
    {
      "id": "mat_...",
      "name": "John Doe — Habeas",
      "petitionerName": "John Doe",
      "stage": "Intake",
      "circuit": "4th",
      "facility": "Farmville Detention Center",
      "facilityLocation": "Farmville, VA",
      "daysInStage": 5,
      "filingDate": "",
      "daysToFiling": null,
      "bondGranted": null,
      "caseNumber": "",
      "country": "Guatemala",
      "owner": "attorney@firm.com",
      "demo": false,
      "lastUpdated": "2025-06-01T12:00:00.000Z",
      "lastUpdatedBy": "attorney@firm.com"
    }
  ]
}
```

### 2. `get_matter`

**Purpose:** Get a single matter's full state, template, provenance, and ops log.

**Request:**
```json
{ "action": "get_matter", "email": "user@example.com", "recordId": "mat_..." }
```

**Pipeline:**
1. **Search Entity Ops** — Airtable search: `{entity_id}='<recordId>'`
2. **Search Active Template** — Airtable search: `AND({entity_type}='template', {Status}='Active')` (returns first match)
3. **Materialize Single Matter** — Code node that:
   - Replays all ops chronologically to reconstruct state
   - Builds a `variables` map for the template editor (all uppercase keys like `PETITIONER_NAME`, `DETENTION_FACILITY`, etc.)
   - Builds a `provenance` map tracking which agent last set each field and when
   - Extracts `connections` from CON ops
   - Attaches the active template HTML

**Response:**
```json
{
  "matter": {
    "id": "mat_...",
    "name": "...",
    "petitionerName": "...",
    "stage": "Intake",
    "circuit": "4th",
    "owner": "attorney@firm.com",
    "demo": false,
    "variables": {
      "PETITIONER_NAME": "...",
      "PETITIONER_COUNTRY": "...",
      "ENTRY_DATE": "...",
      "YEARS_RESIDENCE": "...",
      "APPREHENSION_LOCATION": "...",
      "APPREHENSION_DATE": "...",
      "CRIMINAL_HISTORY": "...",
      "COMMUNITY_TIES": "...",
      "DETENTION_FACILITY": "...",
      "FACILITY_LOCATION": "...",
      "WARDEN_NAME": "...",
      "FOD_NAME": "...",
      "FIELD_OFFICE": "...",
      "ICE_DIRECTOR": "Todd M. Lyons",
      "DHS_SECRETARY": "Kristi Noem",
      "AG_NAME": "Pamela Bondi",
      "DISTRICT_FULL": "...",
      "DIVISION": "...",
      "COURT_LOCATION": "...",
      "CASE_NUMBER": "...",
      "JUDGE_CODE": "...",
      "FILING_DATE": "...",
      "ATTORNEY_1_NAME": "...",
      "ATTORNEY_1_BAR": "...",
      "ATTORNEY_1_FIRM": "...",
      "ATTORNEY_1_ADDR": "...",
      "ATTORNEY_1_PHONE": "...",
      "ATTORNEY_1_EMAIL": "...",
      "ATTORNEY_2_NAME": "...",
      "ATTORNEY_2_BAR": "...",
      "ATTORNEY_2_FIRM": "...",
      "ATTORNEY_2_ADDR": "...",
      "ATTORNEY_2_PHONE": "...",
      "ATTORNEY_2_EMAIL": "..."
    },
    "connections": [
      { "from": { "type": "matter", "id": "..." }, "to": { "type": "facility", "id": "..." }, "relation": "detained_at" }
    ],
    "provenance": {
      "petitioner_name": { "agent": "user@firm.com", "at": "2025-06-01T...", "source": "intake_form" },
      "stage": { "agent": "user@firm.com", "at": "2025-06-05T...", "source": "pipeline", "from": "Intake" }
    }
  },
  "template": {
    "html": "<html>...",
    "name": "Habeas Petition v1",
    "version": "1.0"
  },
  "ops": [
    {
      "op": "INS",
      "target": { "id": "mat_...", "name": "..." },
      "context": { "type": "matter", "source": "intake_form" },
      "frame": { "circuit": "4th", "owner": "user@firm.com" },
      "agent": "user@firm.com",
      "at": "2025-06-01T12:00:00.000Z"
    }
  ]
}
```

### 3. `create_matter`

**Purpose:** Create a new matter with facility and warden entities plus relationships.

**Request:**
```json
{
  "action": "create_matter",
  "email": "attorney@firm.com",
  "petitionerName": "John Doe",
  "country": "Guatemala",
  "entryDate": "2015-03-15",
  "yearsResidence": "10",
  "apprehensionLocation": "Richmond, VA",
  "apprehensionDate": "2025-01-20",
  "criminalHistory": "None",
  "communityTies": "Two U.S. citizen children, church membership",
  "facility": "Farmville Detention Center",
  "facilityLocation": "Farmville, Virginia",
  "warden": "Jane Smith",
  "fieldOffice": "Washington Field Office",
  "fodName": "John Director",
  "circuit": "4th",
  "_updateDirectory": false,
  "_directoryUpdates": {}
}
```

**Pipeline:**
1. **Build Create Ops** — Code node that generates up to 6+ operations:
   - `INS` for the matter (entity_type: `matter`) — includes all intake fields, stage set to `Intake`, owner set to requesting email in frame
   - `INS` for the facility (entity_type: `facility`) — idempotent by deterministic ID
   - `INS` for the warden (entity_type: `warden`) — idempotent by deterministic ID
   - `CON` for matter ↔ facility (relation: `detained_at`, entity_type: `relationship`)
   - `CON` for matter ↔ warden (relation: `respondent`, entity_type: `relationship`)
   - `ALT` ops for directory updates if `_updateDirectory` is set (updates facility fields from `_directoryUpdates`)
2. **Insert Create Ops** — Airtable create: inserts all ops as rows. Column mapping: `operator`, `Target`, `frame`, `agent`, `Content`, `entityType`
3. **Collect Create Results** — Finds the matter op and returns its entity_id

**Response:**
```json
{
  "success": true,
  "recordId": "mat_john_doe_1708100000000",
  "opsCreated": 5
}
```

### 4. `save_fields`

**Purpose:** Update one or more fields on a matter.

**Request:**
```json
{
  "action": "save_fields",
  "email": "attorney@firm.com",
  "recordId": "mat_...",
  "fields": {
    "CASE_NUMBER": "1:25-cv-00123",
    "JUDGE_CODE": "TSE"
  }
}
```

**Pipeline:**
1. **Build Save Ops** — Creates one `ALT` operation per changed field. Keys are lowercased. Skips null/undefined values. If no fields changed, returns `{ _skip: true }`.
   - `context.source`: `"editor"`
   - `entity_type`: `"matter"`
2. **Insert Save Ops** — Airtable create: inserts all ops
3. **Respond Save** — Returns `{ success: true }`

**Response:**
```json
{ "success": true }
```

### 5. `advance_stage`

**Purpose:** Move a matter to the next pipeline stage.

**Request:**
```json
{
  "action": "advance_stage",
  "email": "attorney@firm.com",
  "recordId": "mat_...",
  "stage": "Filed",
  "fromStage": "Drafted"
}
```

**Pipeline:**
1. **Build Stage Op** — Creates a single `ALT` operation for the `stage` field. If advancing to `"Filed"`, also records `filing_date` in the frame.
   - `context.source`: `"pipeline"`
   - `entity_type`: `"matter"`
2. **Insert Stage Op** — Airtable create
3. **Respond Advance** — Returns `{ success: true }`

**Response:**
```json
{ "success": true }
```

### 6. `list_directory`

**Purpose:** List all facilities with active matter counts and changelogs.

**Request:**
```json
{ "action": "list_directory", "email": "user@example.com" }
```

**Pipeline:**
1. **Search Directory Ops** — Airtable search: `OR({entity_type}='facility', {entity_type}='warden')`
2. **Search Directory Relationships** — Airtable search: `OR({entity_type}='relationship', {entity_type}='matter')` (needed to count matters per facility and determine their stages)
3. **Materialize Directory** — Code node that:
   - Groups ops by entity_id, replays to reconstruct each facility and warden
   - Builds per-facility changelogs from ALT ops
   - Counts total and active (non-Resolved) matters per facility using CON relationships and matter stage data

**Response:**
```json
{
  "facilities": [
    {
      "id": "fac_farmville_detention_center",
      "name": "Farmville Detention Center",
      "city": "Farmville",
      "state": "Virginia",
      "warden_name": "Jane Smith",
      "field_office": "Washington Field Office",
      "fod_name": "John Director",
      "circuit": "4th",
      "activeMatters": 3,
      "totalMatters": 5,
      "lastUpdated": "2025-06-01T...",
      "lastUpdatedBy": "admin@firm.com",
      "changelog": [
        {
          "field": "warden_name",
          "from": "Old Warden",
          "to": "Jane Smith",
          "agent": "admin@firm.com",
          "at": "2025-05-15T..."
        }
      ]
    }
  ]
}
```

### 7. `get_facility`

**Purpose:** Get a single facility's full detail with changelog and linked matters.

**Request:**
```json
{
  "action": "get_facility",
  "email": "user@example.com",
  "entityId": "fac_farmville_detention_center"
}
```

**Pipeline:**
1. **Search Facility Ops** — Airtable search: `{entity_id}='<entityId>'`
2. **Search Facility Relationships** — Airtable search: `AND({entity_type}='relationship', FIND('<entityId>', {entity_id}))` (finds CON ops referencing this facility)
3. **Materialize Facility Detail** — Code node that:
   - Replays facility ops to build current state and changelog
   - Builds per-field provenance map
   - Extracts linked matters from `detained_at` relationships

**Response:**
```json
{
  "facility": {
    "id": "fac_...",
    "name": "Farmville Detention Center",
    "city": "Farmville",
    "state": "Virginia",
    "warden_name": "Jane Smith",
    "field_office": "Washington Field Office",
    "fod_name": "John Director",
    "circuit": "4th",
    "fieldProvenance": {
      "name": { "agent": "admin@firm.com", "at": "...", "source": "creation" },
      "warden_name": { "agent": "admin@firm.com", "at": "...", "source": "edit" }
    }
  },
  "changelog": [
    { "type": "created", "agent": "...", "at": "...", "fields": { ... } },
    { "type": "changed", "field": "warden_name", "from": "...", "to": "...", "agent": "...", "at": "..." }
  ],
  "linkedMatters": [
    { "matterId": "mat_...", "relation": "detained_at", "linkedAt": "...", "linkedBy": "..." }
  ]
}
```

### 8. `save_facility`

**Purpose:** Update fields on a facility (or other directory entity).

**Request:**
```json
{
  "action": "save_facility",
  "email": "admin@firm.com",
  "entityId": "fac_farmville_detention_center",
  "entityType": "facility",
  "fields": {
    "warden_name": "New Warden",
    "fod_name": "New Director"
  }
}
```

**Pipeline:**
1. **Build Facility Save Ops** — Creates one `ALT` operation per changed field. `context.source` is `"directory"`. Entity type taken from request (defaults to `"facility"`).
2. **Insert Facility Ops** — Airtable create
3. **Respond Facility Save** — Returns `{ success: true }`

**Response:**
```json
{ "success": true }
```

### 9. `get_entity_history`

**Purpose:** Get a complete chronological changelog for any entity, with per-field history and version snapshots.

**Request:**
```json
{
  "action": "get_entity_history",
  "email": "user@example.com",
  "entityId": "mat_..."
}
```

**Pipeline:**
1. **Search History Ops** — Airtable search: `{entity_id}='<entityId>'`
2. **Format Entity History** — Code node that:
   - Builds a chronological `history` array with human-readable entry types (`created`, `changed`, `described`, `connected`, `recorded`, `destroyed`)
   - Builds a `fieldHistory` map: for each field, an ordered list of every change with agent, timestamp, and source
   - Clusters ops into `versions` using a 5-second window — ops within 5s of each other are grouped into a single version snapshot

**Response:**
```json
{
  "entityId": "mat_...",
  "history": [
    {
      "op": "INS",
      "type": "created",
      "agent": "attorney@firm.com",
      "at": "2025-06-01T12:00:00.000Z",
      "source": "intake_form",
      "entityType": "matter",
      "fields": { "id": "mat_...", "name": "...", "stage": "Intake" }
    },
    {
      "op": "ALT",
      "type": "changed",
      "agent": "attorney@firm.com",
      "at": "2025-06-05T09:00:00.000Z",
      "source": "pipeline",
      "entityType": "matter",
      "field": "stage",
      "from": "Intake",
      "to": "Drafted"
    }
  ],
  "fieldHistory": {
    "stage": [
      { "action": "set", "value": "Intake", "agent": "attorney@firm.com", "at": "...", "source": "intake_form" },
      { "action": "changed", "from": "Intake", "to": "Drafted", "agent": "attorney@firm.com", "at": "...", "source": "pipeline" }
    ]
  },
  "versions": [
    {
      "startTime": 1717243200000,
      "endTime": 1717243200000,
      "at": "2025-06-01T12:00:00.000Z",
      "agent": "attorney@firm.com",
      "source": "intake_form",
      "changes": [ ... ]
    }
  ],
  "totalOps": 12
}
```

## Materialization Logic

### How State is Reconstructed

Operations are sorted by `Created` ascending and replayed:

```
INS  → Object.assign(state, target)  (also extracts circuit/owner/demo from frame)
ALT  → state[target.field] = target.to
DES  → state[target.field] = target.value
CON  → appended to connections array
REC  → state['_rec_' + target.recognition] = true; Object.assign(state, target)
SUP  → state['_sup_' + target.field] = target.values
NUL  → marks entity as destroyed (excluded from results)
```

### Attorney Scoping

`list_matters` filters materialized matters to only return those where:
- `owner === requestEmail` (owner is set from the `frame.owner` field of the INS op), **OR**
- `demo === true` (demo flag set in frame), **OR**
- `requestEmail === 'dev@local'` (development bypass)

### Template Variables

The `get_matter` response maps internal snake_case state fields to uppercase template variables:

| Internal Field | Template Variable |
|---------------|-------------------|
| `petitioner_name` | `PETITIONER_NAME` |
| `country` | `PETITIONER_COUNTRY` |
| `entry_date` | `ENTRY_DATE` |
| `years_residence` | `YEARS_RESIDENCE` |
| `apprehension_location` | `APPREHENSION_LOCATION` |
| `apprehension_date` | `APPREHENSION_DATE` |
| `criminal_history` | `CRIMINAL_HISTORY` |
| `community_ties` | `COMMUNITY_TIES` |
| `facility_name` | `DETENTION_FACILITY` |
| `facility_location` | `FACILITY_LOCATION` |
| `warden_name` | `WARDEN_NAME` |
| `fod_name` | `FOD_NAME` |
| `field_office` | `FIELD_OFFICE` |
| `ice_director` | `ICE_DIRECTOR` (default: "Todd M. Lyons") |
| `dhs_secretary` | `DHS_SECRETARY` (default: "Kristi Noem") |
| `ag_name` | `AG_NAME` (default: "Pamela Bondi") |
| `district_full` | `DISTRICT_FULL` |
| `division` | `DIVISION` |
| `court_location` | `COURT_LOCATION` |
| `case_number` | `CASE_NUMBER` |
| `judge_code` | `JUDGE_CODE` |
| `filing_date` | `FILING_DATE` |
| `attorney_1_name` | `ATTORNEY_1_NAME` |
| `attorney_1_bar` | `ATTORNEY_1_BAR` |
| `attorney_1_firm` | `ATTORNEY_1_FIRM` |
| `attorney_1_addr` | `ATTORNEY_1_ADDR` |
| `attorney_1_phone` | `ATTORNEY_1_PHONE` |
| `attorney_1_email` | `ATTORNEY_1_EMAIL` |
| `attorney_2_name` | `ATTORNEY_2_NAME` |
| `attorney_2_bar` | `ATTORNEY_2_BAR` |
| `attorney_2_firm` | `ATTORNEY_2_FIRM` |
| `attorney_2_addr` | `ATTORNEY_2_ADDR` |
| `attorney_2_phone` | `ATTORNEY_2_PHONE` |
| `attorney_2_email` | `ATTORNEY_2_EMAIL` |

## n8n Node Inventory

### Trigger
| Node | Type | Purpose |
|------|------|---------|
| Webhook1 | Webhook (POST /habeas) | Single entry point for all actions |

### Routing
| Node | Type | Purpose |
|------|------|---------|
| Parse Request1 | Code | Extract action, email, recordId, entityId from request |
| Route1 | Switch | Route to action-specific pipeline based on `action` field |

### list_matters Pipeline
| Node | Type | Purpose |
|------|------|---------|
| Search All Matter Ops1 | Airtable Search | Fetch all ops where `entity_type='matter'` |
| Materialize All Matters1 | Code | Replay ops, reconstruct matters, apply attorney scoping |
| Respond List1 | Respond to Webhook | Return `{ matters: [...] }` |

### get_matter Pipeline
| Node | Type | Purpose |
|------|------|---------|
| Search Entity Ops1 | Airtable Search | Fetch all ops for the requested `entity_id` |
| Search Active Template1 | Airtable Search | Fetch active template (`entity_type='template'`, `Status='Active'`) |
| Materialize Single Matter1 | Code | Replay ops, build variables/provenance, attach template |
| Respond Get1 | Respond to Webhook | Return `{ matter, template, ops }` |

### create_matter Pipeline
| Node | Type | Purpose |
|------|------|---------|
| Build Create Ops1 | Code | Generate INS/CON/ALT ops for matter, facility, warden, relationships |
| Insert Create Ops1 | Airtable Create | Insert all ops into Habeas Operations |
| Collect Create Results1 | Code | Extract matter entity_id from created records |
| Respond Create1 | Respond to Webhook | Return `{ success, recordId, opsCreated }` |

### save_fields Pipeline
| Node | Type | Purpose |
|------|------|---------|
| Build Save Ops1 | Code | Generate ALT ops for each changed field |
| Insert Save Ops1 | Airtable Create | Insert ops |
| Respond Save1 | Respond to Webhook | Return `{ success: true }` |

### advance_stage Pipeline
| Node | Type | Purpose |
|------|------|---------|
| Build Stage Op1 | Code | Generate ALT op for stage field (records filing_date if advancing to Filed) |
| Insert Stage Op1 | Airtable Create | Insert op |
| Respond Advance1 | Respond to Webhook | Return `{ success: true }` |

### list_directory Pipeline
| Node | Type | Purpose |
|------|------|---------|
| Search Directory Ops | Airtable Search | Fetch all `facility` and `warden` entity ops |
| Search Directory Relationships | Airtable Search | Fetch all `relationship` and `matter` entity ops |
| Materialize Directory | Code | Reconstruct facilities, count linked matters, build changelogs |
| Respond Directory | Respond to Webhook | Return `{ facilities: [...] }` |

### get_facility Pipeline
| Node | Type | Purpose |
|------|------|---------|
| Search Facility Ops | Airtable Search | Fetch all ops for the requested facility entity_id |
| Search Facility Relationships | Airtable Search | Fetch CON ops referencing this facility |
| Materialize Facility Detail | Code | Reconstruct facility, build changelog and per-field provenance, find linked matters |
| Respond Facility | Respond to Webhook | Return `{ facility, changelog, linkedMatters }` |

### save_facility Pipeline
| Node | Type | Purpose |
|------|------|---------|
| Build Facility Save Ops | Code | Generate ALT ops for each changed field |
| Insert Facility Ops | Airtable Create | Insert ops |
| Respond Facility Save | Respond to Webhook | Return `{ success: true }` |

### get_entity_history Pipeline
| Node | Type | Purpose |
|------|------|---------|
| Search History Ops | Airtable Search | Fetch all ops for the requested entity_id |
| Format Entity History | Code | Build chronological history, per-field history, and version snapshots |
| Respond History | Respond to Webhook | Return `{ entityId, history, fieldHistory, versions, totalOps }` |

## Credentials

All Airtable nodes use the credential `Habeas` (ID: `WPVUCrmWAyxs7UXo`) with token-based authentication.

## Pipeline Stages

Matters progress through these stages:

```
Intake → Drafted → Filed → Served → Hearing → Resolved
```

The `advance_stage` action transitions between stages. When advancing to `Filed`, the system automatically records the filing date.

## CORS Configuration

All response nodes include these headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type
```

The webhook node also has `allowedOrigins: *` configured.
