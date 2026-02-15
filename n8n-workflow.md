# Habeas - n8n Workflow & Airtable Schema

## Overview

The Habeas frontend communicates with an n8n webhook backend that manages data in Airtable. This document describes the data model, reference tables, and API contract.

## API Endpoints

All requests are `POST` to `{webhook_url}?action={action}` with JSON body containing `action` and `email`.

### Existing Actions

| Action | Description | Extra Params | Returns |
|--------|-------------|-------------|---------|
| `list_matters` | List all matters | — | `{ matters: [...] }` |
| `get_matter` | Get single matter | `recordId` | `{ matter, template }` |
| `save_fields` | Update matter variables | `recordId, fields` | `{ success }` |
| `create_matter` | Create new matter | intake fields (see below) | `{ recordId }` |
| `advance_stage` | Move stage forward | `recordId, stage, fromStage` | `{ success }` |

### New Actions (Reference Data)

| Action | Description | Extra Params | Returns |
|--------|-------------|-------------|---------|
| `list_ref_data` | Get all reference tables | — | `{ wardens, facilities, attorneys, fieldOffices, courts, officials }` |
| `save_ref_record` | Create/update a ref record | `table, record` | `{ id }` |
| `delete_ref_record` | Delete a ref record | `table, id` | `{ success }` |

## Airtable Schema

### Matters Table (existing)

Primary table tracking habeas corpus petitions through the pipeline.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto | Airtable record ID |
| `petitionerName` | Text | Client full name |
| `name` | Text | Case surname |
| `stage` | Single Select | Pipeline stage (Intake through Resolved) |
| `circuit` | Single Select | Circuit court (1st-11th, D.C.) |
| `facility` | Link | Link to Facilities table |
| `facilityLocation` | Lookup | Auto from Facilities |
| `attorney` | Link | Link to Attorneys table |
| `daysInStage` | Number | Computed days in current stage |
| `filingDate` | Date | Date petition filed |
| `caseNumber` | Text | Federal case number |
| `bondGranted` | Single Select | Granted / Denied / (empty) |
| `daysToFiling` | Number | Days from intake to filing |
| `variables` | Long Text (JSON) | Template variable overrides |

### Facilities Table (reference)

Tracks detention facilities with provenance.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto | Record ID |
| `name` | Text | Facility name (e.g., "Farmville Detention Center") |
| `location` | Text | City, State (e.g., "Farmville, Virginia") |
| `createdBy` | Email | User who created the record |
| `createdAt` | DateTime | Creation timestamp |
| `updatedBy` | Email | User who last updated |
| `updatedAt` | DateTime | Last update timestamp |

**Used in template variables:** `DETENTION_FACILITY`, `FACILITY_LOCATION`

### Wardens Table (reference)

Tracks facility wardens with provenance and facility linkage.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto | Record ID |
| `name` | Text | Warden's full name |
| `facility` | Link | Link to Facilities table |
| `createdBy` | Email | User who created the record |
| `createdAt` | DateTime | Creation timestamp |
| `updatedBy` | Email | User who last updated |
| `updatedAt` | DateTime | Last update timestamp |

**Used in template variable:** `WARDEN_NAME`

**Linked data:** Selecting a warden auto-fills the facility and location. Selecting a facility filters the wardens dropdown to only wardens at that facility.

### Attorneys Table (reference)

Tracks attorneys with full contact details and provenance.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto | Record ID |
| `name` | Text | Attorney full name |
| `bar` | Text | Bar number (e.g., "VA Bar No. 89590") |
| `firm` | Text | Law firm name |
| `addr` | Text | Mailing address |
| `phone` | Text | Phone number |
| `email` | Email | Email address |
| `createdBy` | Email | User who created the record |
| `createdAt` | DateTime | Creation timestamp |
| `updatedBy` | Email | User who last updated |
| `updatedAt` | DateTime | Last update timestamp |

**Used in template variables:** `ATTORNEY_1_NAME`, `ATTORNEY_1_BAR`, `ATTORNEY_1_FIRM`, `ATTORNEY_1_ADDR`, `ATTORNEY_1_PHONE`, `ATTORNEY_1_EMAIL` (and same for `ATTORNEY_2_*`)

**Linked data:** Selecting an attorney name auto-fills bar, firm, address, phone, and email.

### Field Offices Table (reference)

Tracks ICE field offices and their directors.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto | Record ID |
| `name` | Text | Office name (e.g., "Washington Field Office") |
| `director` | Text | Field Office Director name |
| `createdBy` | Email | User who created the record |
| `createdAt` | DateTime | Creation timestamp |
| `updatedBy` | Email | User who last updated |
| `updatedAt` | DateTime | Last update timestamp |

**Used in template variables:** `FIELD_OFFICE`, `FOD_NAME`

**Linked data:** Selecting a field office auto-fills the FOD name.

### Courts Table (reference)

Tracks federal district courts with division and location.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto | Record ID |
| `district` | Text | Full district name (e.g., "Eastern District of Virginia") |
| `division` | Text | Division name (e.g., "Alexandria Division") |
| `location` | Text | City, State (e.g., "Alexandria, Virginia") |
| `createdBy` | Email | User who created the record |
| `createdAt` | DateTime | Creation timestamp |
| `updatedBy` | Email | User who last updated |
| `updatedAt` | DateTime | Last update timestamp |

**Used in template variables:** `DISTRICT_FULL`, `DIVISION`, `COURT_LOCATION`

**Linked data:** Selecting a district auto-fills division and court location.

### Officials Table (reference)

Tracks government officials (these change over time with administrations).

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto | Record ID |
| `title` | Single Select | "ICE Director" / "DHS Secretary" / "Attorney General" |
| `name` | Text | Official's full name |
| `effectiveDate` | Text | When they took office (e.g., "January 2025") |
| `createdBy` | Email | User who created the record |
| `createdAt` | DateTime | Creation timestamp |
| `updatedBy` | Email | User who last updated |
| `updatedAt` | DateTime | Last update timestamp |

**Used in template variables:** `ICE_DIRECTOR`, `DHS_SECRETARY`, `AG_NAME`

## Data Flow

### Reference Data Seeding

On initial load, the frontend seeds reference tables from existing matter data:

1. Matters are loaded via `list_matters`
2. `seedRef()` extracts unique facilities, wardens, attorneys, field offices, courts, and officials from matter variables
3. Deduplication prevents creating duplicate entries
4. Seeded records are marked with `createdBy: "system (seeded from matters)"`

### Intake Form

The intake form now uses **single-select dropdowns** for all reference fields:

- **Facility** -> dropdown from Facilities table, auto-fills Location
- **Warden** -> dropdown from Wardens table (filtered by selected facility)
- **Circuit** -> hardcoded dropdown (1st-11th, D.C.)
- **District Court** -> dropdown from Courts table, auto-fills Division and Location
- **Field Office** -> dropdown from Field Offices table, auto-fills FOD name
- **ICE Director** -> dropdown from Officials table (filtered to ICE Director)
- **DHS Secretary** -> dropdown from Officials table (filtered to DHS Secretary)
- **Attorney General** -> dropdown from Officials table (filtered to Attorney General)
- **Lead Attorney** -> dropdown from Attorneys table, auto-fills all contact fields
- **Co-Counsel** -> dropdown from Attorneys table, auto-fills all contact fields

### Editor Form

The editor sidebar uses the same single-select pattern:

- Reference fields render as `<select>` elements
- Linked/dependent fields render as readonly `<input>` elements
- Selecting a parent value auto-fills child values
- Live preview updates in real-time

### Create Matter Payload

The `create_matter` action now receives expanded fields:

```json
{
  "action": "create_matter",
  "email": "user@example.com",
  "petitionerName": "...",
  "country": "...",
  "entryDate": "...",
  "yearsResidence": "...",
  "apprehensionLocation": "...",
  "apprehensionDate": "...",
  "facility": "...",
  "facilityLocation": "...",
  "warden": "...",
  "circuit": "...",
  "district": "...",
  "division": "...",
  "courtLocation": "...",
  "fieldOffice": "...",
  "fodName": "...",
  "iceDirector": "...",
  "dhsSecretary": "...",
  "agName": "...",
  "attorney1Name": "...",
  "attorney1Bar": "...",
  "attorney1Firm": "...",
  "attorney1Addr": "...",
  "attorney1Phone": "...",
  "attorney1Email": "...",
  "attorney2Name": "...",
  "attorney2Bar": "...",
  "attorney2Firm": "...",
  "attorney2Addr": "...",
  "attorney2Phone": "...",
  "attorney2Email": "...",
  "criminalHistory": "...",
  "communityTies": "..."
}
```

## n8n Workflow Updates Needed

### 1. Create Reference Tables in Airtable

Create the six reference tables described above in Airtable with the specified fields.

### 2. Add `list_ref_data` Webhook Handler

Should query all six reference tables and return them in a single response.

### 3. Add `save_ref_record` Webhook Handler

Should create or update a record in the specified reference table. Include provenance fields (`updatedBy`, `updatedAt`) on every write.

### 4. Add `delete_ref_record` Webhook Handler

Should delete a record from the specified reference table by ID.

### 5. Update `create_matter` Handler

The handler should now:

1. Accept the expanded payload with attorney details, court info, officials, etc.
2. Map fields to the appropriate template variables in the matter record
3. Create links to reference table records where applicable

### 6. Provenance Tracking

Every write operation to reference tables should:

- Set `createdBy` and `createdAt` on creation
- Set `updatedBy` and `updatedAt` on every update
- Use the `email` field from the request payload as the user identifier

## Frontend Storage

Reference data is cached in `localStorage` under the key `habeas_refdata`. The structure is:

```json
{
  "wardens": [{ "id": "...", "name": "...", "facility": "...", "createdBy": "...", "createdAt": "...", "updatedBy": "...", "updatedAt": "..." }],
  "facilities": [{ "id": "...", "name": "...", "location": "...", ... }],
  "attorneys": [{ "id": "...", "name": "...", "bar": "...", "firm": "...", "addr": "...", "phone": "...", "email": "...", ... }],
  "fieldOffices": [{ "id": "...", "name": "...", "director": "...", ... }],
  "courts": [{ "id": "...", "district": "...", "division": "...", "location": "...", ... }],
  "officials": [{ "id": "...", "title": "...", "name": "...", "effectiveDate": "...", ... }]
}
```

When `list_ref_data` is implemented on the n8n side, the frontend should be updated to fetch from the API instead of relying solely on localStorage + seeding.
