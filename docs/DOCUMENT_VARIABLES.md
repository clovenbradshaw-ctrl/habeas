# Document Template Variables Reference

Canonical list of all variables available for document generation in Habeas. Variables use `{{VARIABLE_NAME}}` syntax inside template sections and are replaced at render/export time.

---

## Petitioner

| Variable | Type | Description |
|---|---|---|
| `PETITIONER_NAME` | text | Client's full legal name |
| `PETITIONER_COUNTRY` | select | Country of origin (short name, e.g. "Honduras") |
| `PETITIONER_COUNTRY_FORMAL` | text | Formal country name (e.g. "the Republic of Honduras") |
| `PETITIONER_DEMONYM` | text | Country demonym (e.g. "Honduran") |
| `ENTRY_DATE` | date | Date client entered the United States |
| `YEARS_RESIDENCE` | number | Years of residence in the US |
| `APPREHENSION_LOCATION` | text | Location where client was apprehended |
| `APPREHENSION_DATE` | date | Date of apprehension |
| `CRIMINAL_HISTORY` | text | Criminal history summary |
| `COMMUNITY_TIES` | textarea | Description of community ties and connections |

### Population

- `PETITIONER_COUNTRY`, `PETITIONER_COUNTRY_FORMAL`, and `PETITIONER_DEMONYM` are auto-populated by `buildCountryVariables()` when a country of origin is selected during intake.
- All other petitioner fields are entered manually.

---

## Detention

| Variable | Type | Description |
|---|---|---|
| `DETENTION_FACILITY` | text | Facility name (e.g. "Farmville Detention Center") |
| `FACILITY_LOCATION` | text | Facility city/state (e.g. "Farmville, VA") |
| `FACILITY_OPERATOR` | text | Private operator name (e.g. "Immigration Centers of America") |
| `WARDEN_NAME` | text | Current warden's full name |
| `WARDEN_TITLE` | text | Warden's title (e.g. "Warden") |
| `DETENTION_DAYS` | number | Total days detained (used in conditional section logic) |
| `DETENTION_STATUTE` | text | INA statute section (e.g. "INA section 236(a), 8 U.S.C. section 1226(a)") |

### Population

- `DETENTION_FACILITY`, `FACILITY_LOCATION`, `FACILITY_OPERATOR`, `WARDEN_NAME`, and `WARDEN_TITLE` are auto-populated by `buildCascadeFromFacility()` when a facility is selected during intake. These are read-only cascade fields.
- `DETENTION_DAYS` and `DETENTION_STATUTE` are entered manually.

---

## Court

| Variable | Type | Description |
|---|---|---|
| `DISTRICT_FULL` | text | Full district name (e.g. "Eastern District of Virginia") |
| `DIVISION` | text | Court division (e.g. "Richmond Division") |
| `COURT_LOCATION` | text | Court city/state (e.g. "Richmond, VA") |
| `COURT_ADDRESS` | text | Full court street address |
| `CASE_NUMBER` | text | Federal case number (e.g. "3:25-cv-00XXX") |
| `JUDGE_NAME` | text | Assigned judge's full name |
| `JUDGE_TITLE` | text | Judge's title (e.g. "United States District Judge") |
| `JUDGE_CODE` | text | Judge initials/code (e.g. "MHL") |
| `FILING_DATE` | date | Document filing date |

### Population

- `DISTRICT_FULL`, `DIVISION`, `COURT_LOCATION`, `COURT_ADDRESS`, `JUDGE_NAME`, `JUDGE_TITLE`, and `JUDGE_CODE` are auto-populated by `buildCascadeFromFacility()` based on the facility's associated court. These are read-only cascade fields.
- `CASE_NUMBER` and `FILING_DATE` are entered manually.

---

## Officials

| Variable | Type | Description |
|---|---|---|
| `FOD_NAME` | text | ICE Field Office Director name |
| `FIELD_OFFICE` | text | Field Office name (e.g. "Washington Field Office") |
| `FIELD_OFFICE_ADDRESS` | text | Field Office street address |
| `ICE_DIRECTOR` | text | ICE Director name (prefixed with "Acting" if applicable) |
| `ICE_DIRECTOR_ACTING` | text | Whether ICE Director is acting ("yes" or "no") |
| `DHS_SECRETARY` | text | DHS Secretary name (prefixed with "Acting" if applicable) |
| `AG_NAME` | text | Attorney General name (prefixed with "Acting" if applicable) |

### Population

- All officials variables are auto-populated by `buildCascadeFromFacility()`. These are read-only cascade fields.
- `AG_NAME`, `DHS_SECRETARY`, and `ICE_DIRECTOR` resolve from the officials data and automatically prepend "Acting" when the official has acting status.

---

## Attorneys

| Variable | Type | Description |
|---|---|---|
| `ATTORNEY_1_NAME` | text | Lead attorney full name |
| `ATTORNEY_1_BAR` | text | Lead attorney bar number |
| `ATTORNEY_1_FIRM` | text | Lead attorney firm name |
| `ATTORNEY_1_ADDR` | text | Lead attorney firm address |
| `ATTORNEY_1_PHONE` | tel | Lead attorney phone number |
| `ATTORNEY_1_EMAIL` | email | Lead attorney email address |
| `ATTORNEY_2_NAME` | text | Second attorney full name |
| `ATTORNEY_2_BAR` | text | Second attorney bar number |
| `ATTORNEY_2_FIRM` | text | Second attorney firm name |
| `ATTORNEY_2_ADDR` | text | Second attorney firm address |
| `ATTORNEY_2_PHONE` | tel | Second attorney phone number |
| `ATTORNEY_2_EMAIL` | email | Second attorney email address |

### Population

- All attorney variables are auto-populated by `buildAttorneyVariables()` when an attorney is selected during intake.

---

## Opposing Counsel

| Variable | Type | Description |
|---|---|---|
| `AUSA_NAME` | text | Assistant US Attorney name |
| `AUSA_OFFICE` | text | AUSA office name |
| `AUSA_PHONE` | tel | AUSA phone number |
| `AUSA_EMAIL` | email | AUSA email address |

### Population

- Opposing counsel variables are entered manually once the AUSA is identified.

---

## Usage in Templates

### Syntax

Variables are referenced in template section content using double-brace syntax:

```
Petitioner {{PETITIONER_NAME}} is a citizen of {{PETITIONER_COUNTRY}}.
```

At render time, `{{PETITIONER_NAME}}` is replaced with the case's stored value. Unfilled variables are highlighted in the preview but rendered as-is on export.

### Variable name pattern

All variable names match the regex `[A-Z_0-9]+`. The rendering engine uses the pattern `{{([A-Z_0-9]+)}}` globally to find and substitute variables.

### Conditional sections

Template sections can have a `condition` field that references numeric variables with comparison operators:

```
DETENTION_DAYS > 180
```

Supported operators: `>`, `<`, `>=`, `<=`, `==`, `!=`. Boolean-style variables evaluate as true if the value exists and is not `"false"` or `"0"`.

### Cascade (read-only) fields

The following variables are auto-populated when a detention facility is selected and are displayed as read-only in the workspace variable panel:

`DETENTION_FACILITY`, `FACILITY_LOCATION`, `FACILITY_OPERATOR`, `WARDEN_NAME`, `WARDEN_TITLE`, `DISTRICT_FULL`, `DIVISION`, `COURT_LOCATION`, `COURT_ADDRESS`, `FOD_NAME`, `FIELD_OFFICE`, `FIELD_OFFICE_ADDRESS`, `ICE_DIRECTOR`, `ICE_DIRECTOR_ACTING`, `DHS_SECRETARY`, `AG_NAME`, `JUDGE_NAME`, `JUDGE_TITLE`, `JUDGE_CODE`

---

## Source files

| File | Role |
|---|---|
| `app/src/lib/seedData.js` | `VARIABLE_GROUPS` definition, cascade/build helpers, seed data |
| `app/src/screens/WorkspaceScreen.jsx` | `VAR_TYPES` map, `CASCADE_FIELDS` set, rendering logic |
| `app/src/screens/TemplateEditScreen.jsx` | Variable auto-detection during template editing |
| `app/src/context/AppContext.jsx` | Case state management and variable persistence |
