// Seed/demo data for the application when no backend is connected
//
// Data tiers:
//   Tier 1 (universal constants): facilities, courts, field offices, countries, INA charges, statutes
//   Tier 2 (positional, effective-dated): wardens, officials, field office directors, judges
//   Tier 3 (firm-specific): attorneys, cases, documents, comments

// ── Tier 1: Universal reference data ──

export const SEED_COUNTRIES = [
  { id: 'country_sv', name: 'El Salvador', formalName: 'the Republic of El Salvador', demonym: 'Salvadoran' },
  { id: 'country_gt', name: 'Guatemala', formalName: 'the Republic of Guatemala', demonym: 'Guatemalan' },
  { id: 'country_hn', name: 'Honduras', formalName: 'the Republic of Honduras', demonym: 'Honduran' },
  { id: 'country_mx', name: 'Mexico', formalName: 'the United Mexican States', demonym: 'Mexican' },
  { id: 'country_ec', name: 'Ecuador', formalName: 'the Republic of Ecuador', demonym: 'Ecuadorian' },
  { id: 'country_co', name: 'Colombia', formalName: 'the Republic of Colombia', demonym: 'Colombian' },
  { id: 'country_ve', name: 'Venezuela', formalName: 'the Bolivarian Republic of Venezuela', demonym: 'Venezuelan' },
  { id: 'country_br', name: 'Brazil', formalName: 'the Federative Republic of Brazil', demonym: 'Brazilian' },
  { id: 'country_ht', name: 'Haiti', formalName: 'the Republic of Haiti', demonym: 'Haitian' },
  { id: 'country_cu', name: 'Cuba', formalName: 'the Republic of Cuba', demonym: 'Cuban' },
  { id: 'country_ni', name: 'Nicaragua', formalName: 'the Republic of Nicaragua', demonym: 'Nicaraguan' },
  { id: 'country_pe', name: 'Peru', formalName: 'the Republic of Peru', demonym: 'Peruvian' },
  { id: 'country_in', name: 'India', formalName: 'the Republic of India', demonym: 'Indian' },
  { id: 'country_cn', name: 'China', formalName: "the People's Republic of China", demonym: 'Chinese' },
  { id: 'country_jm', name: 'Jamaica', formalName: 'Jamaica', demonym: 'Jamaican' },
  { id: 'country_do', name: 'Dominican Republic', formalName: 'the Dominican Republic', demonym: 'Dominican' },
];

export const SEED_DETENTION_STATUTES = [
  { id: 'stat_1225b1', section: '§ 1225(b)(1)', shortName: 'Expedited Removal', desc: 'Applies to arriving aliens subject to expedited removal proceedings', bondEligible: false },
  { id: 'stat_1225b2', section: '§ 1225(b)(2)', shortName: 'Arriving Aliens', desc: 'Mandatory detention of arriving aliens not in expedited removal', bondEligible: false },
  { id: 'stat_1226a', section: '§ 1226(a)', shortName: 'General Detention', desc: 'Discretionary detention with bond eligibility for non-criminal aliens', bondEligible: true },
  { id: 'stat_1226c', section: '§ 1226(c)', shortName: 'Mandatory Criminal', desc: 'Mandatory detention for aliens with certain criminal convictions', bondEligible: false },
  { id: 'stat_1231a', section: '§ 1231(a)', shortName: 'Post-Order Removal', desc: 'Detention during 90-day removal period after final order', bondEligible: false },
  { id: 'stat_1231a6', section: '§ 1231(a)(6)', shortName: 'Prolonged Post-Order', desc: 'Continued detention beyond removal period — Zadvydas applies', bondEligible: true },
];

export const SEED_CHARGES = [
  { id: 'chg_212a6Ai', section: '§ 212(a)(6)(A)(i)', shortDesc: 'Present without admission or parole', category: 'inadmissibility' },
  { id: 'chg_212a7Ai', section: '§ 212(a)(7)(A)(i)(I)', shortDesc: 'No valid entry document (immigrant)', category: 'inadmissibility' },
  { id: 'chg_212a2Ai', section: '§ 212(a)(2)(A)(i)(I)', shortDesc: 'Crime involving moral turpitude', category: 'inadmissibility' },
  { id: 'chg_212a2B', section: '§ 212(a)(2)(B)', shortDesc: 'Multiple criminal convictions', category: 'inadmissibility' },
  { id: 'chg_237a1B', section: '§ 237(a)(1)(B)', shortDesc: 'Overstay / violation of status', category: 'deportability' },
  { id: 'chg_237a1H', section: '§ 237(a)(1)(H)', shortDesc: 'Inadmissible at entry or adjustment', category: 'deportability' },
  { id: 'chg_237a2Ai', section: '§ 237(a)(2)(A)(i)', shortDesc: 'Crime involving moral turpitude (deport)', category: 'deportability' },
  { id: 'chg_237a2Aiii', section: '§ 237(a)(2)(A)(iii)', shortDesc: 'Aggravated felony', category: 'deportability' },
  { id: 'chg_237a2Bi', section: '§ 237(a)(2)(B)(i)', shortDesc: 'Controlled substance offense', category: 'deportability' },
];

export const SEED_CASE_OUTCOMES = [
  { id: 'out_bond_granted', name: 'Bond Granted', category: 'favorable', requiresAmount: true },
  { id: 'out_bond_denied', name: 'Bond Denied', category: 'unfavorable', requiresAmount: false },
  { id: 'out_dismissed', name: 'Case Dismissed', category: 'unfavorable', requiresAmount: false },
  { id: 'out_withdrawn', name: 'Petition Withdrawn', category: 'neutral', requiresAmount: false },
  { id: 'out_transferred', name: 'Transferred Out of District', category: 'neutral', requiresAmount: false },
  { id: 'out_deported', name: 'Deported / Removed', category: 'unfavorable', requiresAmount: false },
  { id: 'out_released_or', name: 'Released on Recognizance', category: 'favorable', requiresAmount: false },
  { id: 'out_voluntary_departure', name: 'Voluntary Departure', category: 'neutral', requiresAmount: false },
  { id: 'out_granted_relief', name: 'Habeas Relief Granted', category: 'favorable', requiresAmount: false },
];

export const SEED_BOND_CONDITIONS = [
  { id: 'bond_amount', name: 'Bond Amount', type: 'currency' },
  { id: 'bond_reporting', name: 'Reporting Requirements', type: 'text' },
  { id: 'bond_gps', name: 'GPS Monitoring', type: 'boolean' },
  { id: 'bond_travel', name: 'Travel Restrictions', type: 'text' },
  { id: 'bond_passport', name: 'Surrender of Passport', type: 'boolean' },
  { id: 'bond_curfew', name: 'Curfew', type: 'text' },
  { id: 'bond_sponsor', name: 'Designated Sponsor / Custodian', type: 'text' },
  { id: 'bond_substance', name: 'Substance Abuse Testing', type: 'boolean' },
  { id: 'bond_checkin', name: 'ICE Check-in Schedule', type: 'text' },
];

// ── Tier 1: Structural reference data (facilities, courts, field offices) ──

export const SEED_FIELD_OFFICES = [
  {
    id: 'fo_washdc', name: 'Washington DC Field Office',
    director: 'Sarah Johnson', directorEffectiveDate: '2023-06-15',
    deputyDirector: 'Michael Torres',
    jurisdiction: ['Virginia', 'Maryland', 'District of Columbia'],
    address: '2675 Prosperity Ave, Fairfax, VA 22031',
    phone: '(703) 285-6543',
  },
  {
    id: 'fo_atlanta', name: 'Atlanta Field Office',
    director: 'James Williams', directorEffectiveDate: '2022-11-01',
    deputyDirector: 'Linda Park',
    jurisdiction: ['Georgia', 'North Carolina', 'South Carolina'],
    address: '180 Ted Turner Dr SW, Atlanta, GA 30303',
    phone: '(404) 893-1210',
  },
  {
    id: 'fo_phoenix', name: 'Phoenix Field Office',
    director: 'David Ramirez', directorEffectiveDate: '2023-03-01',
    deputyDirector: 'Karen Chen',
    jurisdiction: ['Arizona'],
    address: '2035 N Central Ave, Phoenix, AZ 85004',
    phone: '(602) 379-3122',
  },
  {
    id: 'fo_sanantonio', name: 'San Antonio Field Office',
    director: 'Robert Garcia', directorEffectiveDate: '2023-01-15',
    deputyDirector: 'Patricia Reyes',
    jurisdiction: ['Texas (South/Central)'],
    address: '8940 Four Winds Dr, San Antonio, TX 78239',
    phone: '(210) 283-4750',
  },
  {
    id: 'fo_newark', name: 'Newark Field Office',
    director: 'Angela Morrison', directorEffectiveDate: '2023-08-01',
    deputyDirector: 'Steven Kim',
    jurisdiction: ['New Jersey'],
    address: '970 Broad St, Newark, NJ 07102',
    phone: '(973) 776-5400',
  },
  {
    id: 'fo_philadelphia', name: 'Philadelphia Field Office',
    director: 'Thomas Reed', directorEffectiveDate: '2022-09-15',
    deputyDirector: 'Diane Walsh',
    jurisdiction: ['Pennsylvania', 'Delaware', 'West Virginia'],
    address: '1600 Callowhill St, Philadelphia, PA 19130',
    phone: '(215) 717-4800',
  },
];

export const SEED_FACILITIES = [
  {
    id: 'fac_farmville', name: 'Farmville Detention Center',
    location: 'Farmville, VA',
    address: '516 Industrial Park Rd, Farmville, VA 23901',
    phone: '(434) 315-3200',
    fieldOfficeId: 'fo_washdc',
    operator: 'Immigration Centers of America', operatorType: 'private',
    capacity: 700,
  },
  {
    id: 'fac_stewart', name: 'Stewart Detention Center',
    location: 'Lumpkin, GA',
    address: '146 CCA Rd, Lumpkin, GA 31815',
    phone: '(229) 838-5000',
    fieldOfficeId: 'fo_atlanta',
    operator: 'CoreCivic', operatorType: 'private',
    capacity: 1752,
  },
  {
    id: 'fac_eloy', name: 'Eloy Detention Center',
    location: 'Eloy, AZ',
    address: '1705 E Hanna Rd, Eloy, AZ 85131',
    phone: '(520) 466-7500',
    fieldOfficeId: 'fo_phoenix',
    operator: 'CoreCivic', operatorType: 'private',
    capacity: 1596,
  },
  {
    id: 'fac_south_texas', name: 'South Texas ICE Processing Center',
    location: 'Pearsall, TX',
    address: '566 Veterans Dr, Pearsall, TX 78061',
    phone: '(830) 334-3060',
    fieldOfficeId: 'fo_sanantonio',
    operator: 'GEO Group', operatorType: 'private',
    capacity: 1904,
  },
  {
    id: 'fac_york', name: 'York County Prison',
    location: 'York, PA',
    address: '3400 Concord Rd, York, PA 17402',
    phone: '(717) 840-7580',
    fieldOfficeId: 'fo_philadelphia',
    operator: 'York County', operatorType: 'government',
    capacity: 800,
  },
  {
    id: 'fac_bergen', name: 'Bergen County Jail',
    location: 'Hackensack, NJ',
    address: '160 S River St, Hackensack, NJ 07601',
    phone: '(201) 336-3500',
    fieldOfficeId: 'fo_newark',
    operator: 'Bergen County', operatorType: 'government',
    capacity: 400,
  },
  {
    id: 'fac_morrow', name: 'Morrow County Correctional Facility',
    location: 'Mt. Gilead, OH',
    address: '101 Home Rd, Mt. Gilead, OH 43338',
    phone: '(419) 947-1000',
    fieldOfficeId: 'fo_newark',
    operator: 'Morrow County', operatorType: 'government',
    capacity: 200,
  },
];

export const SEED_COURTS = [
  {
    id: 'ct_edva', district: 'Eastern District of Virginia', division: 'Richmond Division',
    location: 'Richmond, VA',
    address: '701 E Broad St, Richmond, VA 23219',
    clerkName: 'David Novak',
    cmecfUrl: 'https://ecf.vaed.uscourts.gov',
    localRulesUrl: 'https://www.vaed.uscourts.gov/local-rules',
    formattingRules: { font: 'Times New Roman', fontSize: 12, lineSpacing: 2, margins: { top: 1, bottom: 1, left: 1, right: 1 }, pageLimit: null },
  },
  {
    id: 'ct_mdga', district: 'Middle District of Georgia', division: 'Macon Division',
    location: 'Macon, GA',
    address: '475 Mulberry St, Macon, GA 31201',
    clerkName: 'John Martin',
    cmecfUrl: 'https://ecf.gamd.uscourts.gov',
    localRulesUrl: 'https://www.gamd.uscourts.gov/local-rules',
    formattingRules: { font: 'Times New Roman', fontSize: 12, lineSpacing: 2, margins: { top: 1, bottom: 1, left: 1, right: 1 }, pageLimit: null },
  },
  {
    id: 'ct_daz', district: 'District of Arizona', division: 'Phoenix Division',
    location: 'Phoenix, AZ',
    address: '401 W Washington St, Phoenix, AZ 85003',
    clerkName: 'Debra Casillano',
    cmecfUrl: 'https://ecf.azd.uscourts.gov',
    localRulesUrl: 'https://www.azd.uscourts.gov/local-rules',
    formattingRules: { font: 'Times New Roman', fontSize: 14, lineSpacing: 1.5, margins: { top: 1, bottom: 0.75, left: 1, right: 1 }, pageLimit: 25 },
  },
  {
    id: 'ct_sdtx', district: 'Southern District of Texas', division: 'Laredo Division',
    location: 'Laredo, TX',
    address: '1300 Victoria St, Laredo, TX 78040',
    clerkName: 'David Bradley',
    cmecfUrl: 'https://ecf.txsd.uscourts.gov',
    localRulesUrl: 'https://www.txsd.uscourts.gov/local-rules',
    formattingRules: { font: 'Times New Roman', fontSize: 12, lineSpacing: 2, margins: { top: 1, bottom: 1, left: 1, right: 1 }, pageLimit: 30 },
  },
  {
    id: 'ct_mdpa', district: 'Middle District of Pennsylvania', division: 'Harrisburg Division',
    location: 'Harrisburg, PA',
    address: '228 Walnut St, Harrisburg, PA 17101',
    clerkName: 'Teresa Dougherty',
    cmecfUrl: 'https://ecf.pamd.uscourts.gov',
    localRulesUrl: 'https://www.pamd.uscourts.gov/local-rules',
    formattingRules: { font: 'Times New Roman', fontSize: 13, lineSpacing: 2, margins: { top: 1.5, bottom: 1, left: 1.5, right: 1 }, pageLimit: null },
  },
  {
    id: 'ct_dnj', district: 'District of New Jersey', division: 'Newark Division',
    location: 'Newark, NJ',
    address: 'Martin Luther King Jr. Federal Building, 50 Walnut St, Newark, NJ 07101',
    clerkName: 'Dennis McInerney',
    cmecfUrl: 'https://ecf.njd.uscourts.gov',
    localRulesUrl: 'https://www.njd.uscourts.gov/local-civil-rules',
    formattingRules: { font: 'Times New Roman', fontSize: 12, lineSpacing: 2, margins: { top: 1, bottom: 1, left: 1, right: 1 }, pageLimit: null },
  },
  {
    id: 'ct_sdoh', district: 'Southern District of Ohio', division: 'Columbus Division',
    location: 'Columbus, OH',
    address: '85 Marconi Blvd, Columbus, OH 43215',
    clerkName: 'Robert Meyers',
    cmecfUrl: 'https://ecf.ohsd.uscourts.gov',
    localRulesUrl: 'https://www.ohsd.uscourts.gov/local-rules',
    formattingRules: { font: 'Times New Roman', fontSize: 12, lineSpacing: 2, margins: { top: 1, bottom: 1, left: 1, right: 1 }, pageLimit: null },
  },
];

// ── Tier 2: Positional data (effective-dated) ──

export const SEED_WARDENS = [
  { id: 'w_farmville_current', name: 'Jeff Crawford', title: 'Warden', facilityId: 'fac_farmville', effectiveDate: '2024-03-01', predecessor: 'w_farmville_prev' },
  { id: 'w_farmville_prev', name: 'John Smith', title: 'Warden', facilityId: 'fac_farmville', effectiveDate: '2022-01-15', predecessor: null },
  { id: 'w_stewart', name: 'Michael Davis', title: 'Warden', facilityId: 'fac_stewart', effectiveDate: '2023-06-01', predecessor: null },
  { id: 'w_eloy', name: 'Robert Martinez', title: 'Facility Administrator', facilityId: 'fac_eloy', effectiveDate: '2023-09-15', predecessor: null },
  { id: 'w_south_texas', name: 'Gloria Hernandez', title: 'Officer in Charge', facilityId: 'fac_south_texas', effectiveDate: '2024-01-10', predecessor: null },
  { id: 'w_york', name: 'Adam Lease', title: 'Warden', facilityId: 'fac_york', effectiveDate: '2022-08-01', predecessor: null },
  { id: 'w_bergen', name: 'Dennis Hanlon', title: 'Warden', facilityId: 'fac_bergen', effectiveDate: '2023-04-15', predecessor: null },
  { id: 'w_morrow', name: 'Patricia White', title: 'Officer in Charge', facilityId: 'fac_morrow', effectiveDate: '2024-02-01', predecessor: null },
];

export const SEED_OFFICIALS = [
  // Attorney General succession
  { id: 'off_ag_garland', title: 'Attorney General', name: 'Merrick Garland', effectiveDate: '2021-03-11', actingStatus: false },
  { id: 'off_ag_bondi', title: 'Attorney General', name: 'Pam Bondi', effectiveDate: '2025-02-05', actingStatus: false },
  // DHS Secretary succession
  { id: 'off_dhs_mayorkas', title: 'DHS Secretary', name: 'Alejandro Mayorkas', effectiveDate: '2021-02-02', actingStatus: false },
  { id: 'off_dhs_noem', title: 'DHS Secretary', name: 'Kristi Noem', effectiveDate: '2025-01-25', actingStatus: false },
  // ICE Director
  { id: 'off_ice_lechleitner', title: 'ICE Director', name: 'Patrick Lechleitner', effectiveDate: '2023-07-29', actingStatus: true },
  { id: 'off_ice_homan', title: 'ICE Director', name: 'Tom Homan', effectiveDate: '2025-01-20', actingStatus: false },
];

export const SEED_JUDGES = [
  { id: 'j_edva_ptg', name: 'Patricia T. Giles', title: 'District Judge', courtId: 'ct_edva', initials: 'PTG', seniorStatus: false },
  { id: 'j_edva_mso', name: 'M. Shea O\'Brien', title: 'Magistrate Judge', courtId: 'ct_edva', initials: 'MSO', seniorStatus: false },
  { id: 'j_mdga_cdl', name: 'Clay D. Land', title: 'Chief District Judge', courtId: 'ct_mdga', initials: 'CDL', seniorStatus: false },
  { id: 'j_daz_dlr', name: 'Douglas L. Rayes', title: 'Senior District Judge', courtId: 'ct_daz', initials: 'DLR', seniorStatus: true },
  { id: 'j_daz_mtl', name: 'Michael T. Liburdi', title: 'District Judge', courtId: 'ct_daz', initials: 'MTL', seniorStatus: false },
  { id: 'j_dnj_klw', name: 'Kevin L. Walsh', title: 'District Judge', courtId: 'ct_dnj', initials: 'KLW', seniorStatus: false },
  { id: 'j_mdpa_yjk', name: 'Yvette J. Kane', title: 'Senior District Judge', courtId: 'ct_mdpa', initials: 'YJK', seniorStatus: true },
];

// ── Tier 3: Firm-specific data ──

export const SEED_ATTORNEYS = [
  {
    id: 'atty_soltis', name: 'Katie Soltis',
    matrixUserId: '@katie:app.aminoimmigration.com',
    bar: 'VA 12345', firm: 'Amino Immigration Law',
    email: 'katie@aminoimmigration.com', phone: '(804) 555-0123',
    addr: '123 Main St, Richmond, VA 23219',
    barAdmissions: [
      { state: 'VA', barNumber: 'VA 12345', status: 'active' },
      { state: 'DC', barNumber: 'DC 98765', status: 'active' },
      { state: 'MD', barNumber: 'MD 54321', status: 'active' },
    ],
    role: 'partner',
  },
  {
    id: 'atty_brooks', name: 'David Brooks',
    matrixUserId: '@david:app.aminoimmigration.com',
    bar: 'VA 67890', firm: 'Amino Immigration Law',
    email: 'david@aminoimmigration.com', phone: '(804) 555-0456',
    addr: '123 Main St, Richmond, VA 23219',
    barAdmissions: [
      { state: 'VA', barNumber: 'VA 67890', status: 'active' },
      { state: 'GA', barNumber: 'GA 11223', status: 'active' },
    ],
    role: 'associate',
  },
  {
    id: 'atty_chen', name: 'Lisa Chen',
    matrixUserId: '@lisa:app.aminoimmigration.com',
    bar: 'AZ 33445', firm: 'Amino Immigration Law',
    email: 'lisa@aminoimmigration.com', phone: '(602) 555-0789',
    addr: '456 Oak Ave, Phoenix, AZ 85001',
    barAdmissions: [
      { state: 'AZ', barNumber: 'AZ 33445', status: 'active' },
      { state: 'CA', barNumber: 'CA 778899', status: 'active' },
      { state: 'NV', barNumber: 'NV 22334', status: 'active' },
    ],
    role: 'of_counsel',
  },
];

// ── Document types (reference data linking template library to case workspace) ──

export const SEED_DOC_TYPES = [
  { id: 'dtype_petition', name: 'Petition for Writ of Habeas Corpus', category: 'petition', required: true, defaultTemplateId: 'tpl_hc_general', sortOrder: 1 },
  { id: 'dtype_js44', name: 'Civil Cover Sheet (JS 44)', category: 'filing', required: true, defaultTemplateId: 'tpl_js44', sortOrder: 2 },
  { id: 'dtype_osc', name: 'Proposed Order to Show Cause', category: 'motion', required: true, defaultTemplateId: 'tpl_osc', sortOrder: 3 },
  { id: 'dtype_tro', name: 'Emergency TRO Motion', category: 'motion', required: false, defaultTemplateId: 'tpl_tro', sortOrder: 4 },
  { id: 'dtype_atty_decl', name: 'Attorney Declaration', category: 'filing', required: true, defaultTemplateId: 'tpl_atty_decl', sortOrder: 5 },
  { id: 'dtype_reply', name: 'Reply Brief', category: 'brief', required: false, defaultTemplateId: 'tpl_reply', sortOrder: 6 },
];

// Keep legacy exports for backward compatibility
export const DOCUMENT_TYPES = SEED_DOC_TYPES.map(d => ({ id: d.id, name: d.name, category: d.category }));

export const VARIABLE_GROUPS = [
  {
    name: 'Petitioner',
    variables: [
      'PETITIONER_NAME', 'PETITIONER_COUNTRY', 'PETITIONER_COUNTRY_FORMAL', 'PETITIONER_DEMONYM',
      'ENTRY_DATE', 'YEARS_RESIDENCE',
      'APPREHENSION_LOCATION', 'APPREHENSION_DATE', 'CRIMINAL_HISTORY', 'COMMUNITY_TIES',
    ],
  },
  {
    name: 'Detention',
    variables: [
      'DETENTION_FACILITY', 'FACILITY_LOCATION', 'FACILITY_OPERATOR',
      'WARDEN_NAME', 'WARDEN_TITLE', 'DETENTION_DAYS', 'DETENTION_STATUTE',
    ],
  },
  {
    name: 'Court',
    variables: [
      'DISTRICT_FULL', 'DIVISION', 'COURT_LOCATION', 'COURT_ADDRESS',
      'CASE_NUMBER', 'JUDGE_NAME', 'JUDGE_TITLE', 'JUDGE_CODE', 'FILING_DATE',
    ],
  },
  {
    name: 'Officials',
    variables: [
      'FOD_NAME', 'FIELD_OFFICE', 'FIELD_OFFICE_ADDRESS',
      'ICE_DIRECTOR', 'ICE_DIRECTOR_ACTING',
      'DHS_SECRETARY', 'AG_NAME',
    ],
  },
  {
    name: 'Attorneys',
    variables: [
      'ATTORNEY_1_NAME', 'ATTORNEY_1_BAR', 'ATTORNEY_1_FIRM', 'ATTORNEY_1_ADDR',
      'ATTORNEY_1_PHONE', 'ATTORNEY_1_EMAIL',
      'ATTORNEY_2_NAME', 'ATTORNEY_2_BAR', 'ATTORNEY_2_FIRM', 'ATTORNEY_2_ADDR',
      'ATTORNEY_2_PHONE', 'ATTORNEY_2_EMAIL',
    ],
  },
  {
    name: 'Opposing Counsel',
    variables: [
      'AUSA_NAME', 'AUSA_OFFICE', 'AUSA_PHONE', 'AUSA_EMAIL',
    ],
  },
];

// ── Templates (enhanced with fork lineage and formatting metadata) ──

export const SEED_TEMPLATES = [
  {
    id: 'tpl_hc_general',
    name: 'HC Petition (General)',
    category: 'petition',
    desc: 'Standard \u00A7 2241 habeas corpus petition \u2014 Yajure Hurtado framework',
    parentId: null,
    courtFormatRules: null,
    docs: 12,
    lastUsed: Date.now() - 2 * 86400000,
    sections: [
      { id: 's1', name: 'Introduction', required: true, paraCount: 5, content: '1. Petitioner-Plaintiff {{PETITIONER_NAME}} ("Petitioner") is a {{PETITIONER_DEMONYM}} citizen who has made his home in the United States for {{YEARS_RESIDENCE}} years. Petitioner is currently detained at {{DETENTION_FACILITY}} in {{FACILITY_LOCATION}} under the custody and control of Respondent {{WARDEN_TITLE}} {{WARDEN_NAME}}. Petitioner brings this action pursuant to 28 U.S.C. \u00A7 2241 challenging his continued detention without a constitutionally adequate bond hearing before a neutral arbiter.' },
      { id: 's2', name: 'Custody', required: true, paraCount: 1, content: '2. Petitioner is currently detained at {{DETENTION_FACILITY}} in {{FACILITY_LOCATION}}, under the custody of Respondent {{WARDEN_TITLE}} {{WARDEN_NAME}}. Petitioner has been detained for approximately {{DETENTION_DAYS}} days.' },
      { id: 's3', name: 'Jurisdiction', required: true, paraCount: 3, content: '3. This Court has jurisdiction pursuant to 28 U.S.C. \u00A7 2241. The writ of habeas corpus "shall not extend to a prisoner unless . . . [h]e is in custody in violation of the Constitution or laws or treaties of the United States." 28 U.S.C. \u00A7 2241(c)(3).' },
      { id: 's4', name: 'Requirements of \u00A7\u00A7 2241, 2243', required: true, paraCount: 2, content: '4. This Petition satisfies the requirements of 28 U.S.C. \u00A7\u00A7 2241 and 2243. Petitioner is held in custody by {{WARDEN_TITLE}} {{WARDEN_NAME}} and seeks relief from this Court on the grounds that his detention violates the Due Process Clause of the Fifth Amendment and the Immigration and Nationality Act.' },
      { id: 's5', name: 'Venue', required: true, paraCount: 1, content: '5. Venue is proper in this district because Petitioner is detained within the {{DISTRICT_FULL}}. See Rumsfeld v. Padilla, 542 U.S. 426, 443 (2004).' },
      { id: 's6', name: 'Exhaustion', required: true, paraCount: 3, content: '6. Petitioner is not required to exhaust administrative remedies before seeking habeas relief. Exhaustion of administrative remedies is not a prerequisite to filing a \u00A7 2241 petition in the immigration context. See Yajure Hurtado v. Hott, No. 1:19-cv-97, 2019 WL 3564808 (E.D. Va. Aug. 6, 2019).' },
      { id: 's7', name: 'Parties', required: true, paraCount: 6, content: '7. Petitioner {{PETITIONER_NAME}} is a citizen of {{PETITIONER_COUNTRY_FORMAL}} who entered the United States on {{ENTRY_DATE}}. Petitioner has resided in the United States for approximately {{YEARS_RESIDENCE}} years.\n\n8. Respondent {{WARDEN_TITLE}} {{WARDEN_NAME}} is the {{WARDEN_TITLE}} of {{DETENTION_FACILITY}}, who has direct custody and control over Petitioner.\n\n9. Respondent {{FOD_NAME}} is the Field Office Director of the {{FIELD_OFFICE}} of U.S. Immigration and Customs Enforcement.\n\n10. Respondent {{ICE_DIRECTOR}} is the Director of U.S. Immigration and Customs Enforcement.\n\n11. Respondent {{DHS_SECRETARY}} is the Secretary of the Department of Homeland Security.\n\n12. Respondent {{AG_NAME}} is the Attorney General of the United States.' },
      { id: 's8', name: 'Legal Background', required: true, paraCount: 15, content: '13. The Immigration and Nationality Act provides for the detention of noncitizens under several statutory provisions. The applicable statute depends on the stage of the individual\'s removal proceedings and the nature of the charges.\n\n14. Under {{DETENTION_STATUTE}}, Petitioner\'s detention is governed by specific procedural requirements that must be satisfied before the government may deprive an individual of liberty.' },
      { id: 's9', name: 'Statement of Facts', required: true, paraCount: 7, content: '15. On {{APPREHENSION_DATE}}, Petitioner was apprehended by ICE agents at {{APPREHENSION_LOCATION}}.\n\n16. Petitioner has no criminal history: {{CRIMINAL_HISTORY}}.\n\n17. Petitioner has extensive ties to the community: {{COMMUNITY_TIES}}.\n\n18. Petitioner has been detained for approximately {{DETENTION_DAYS}} days without a bond hearing before a neutral decision-maker.' },
      { id: 's10', name: 'Count I \u2014 \u00A7 1226(a)', required: true, paraCount: 5, content: '19. Petitioner reasserts and incorporates the foregoing paragraphs as though fully set forth herein.\n\n20. Petitioner\'s detention is governed by 8 U.S.C. \u00A7 1226(a), which provides that the Attorney General "may release" a detained alien on bond or conditional parole. The government bears the burden of justifying continued detention by clear and convincing evidence.' },
      { id: 's11', name: 'Count II \u2014 Bond Hearing Regulations', required: true, paraCount: 3, content: '21. The regulations governing bond determinations at 8 C.F.R. \u00A7 1003.19 violate Petitioner\'s right to due process by placing the burden of proof on the detained individual rather than the government, by applying an impermissibly low standard of proof, and by failing to require consideration of alternative conditions of release.' },
      { id: 's12', name: 'Count III \u2014 Due Process', required: true, paraCount: 9, content: '22. Petitioner\'s continued detention without adequate process violates the Due Process Clause of the Fifth Amendment to the United States Constitution. The Supreme Court has recognized that freedom from bodily restraint "has always been at the core of the liberty protected by the Due Process Clause." Zadvydas v. Davis, 533 U.S. 678, 690 (2001).' },
      { id: 's13', name: 'Count IV \u2014 Prolonged Detention', required: false, paraCount: 4, content: '23. Petitioner has been detained for {{DETENTION_DAYS}} days without a hearing before a neutral decision-maker. Detention of this duration raises serious constitutional concerns under Zadvydas and its progeny.', condition: 'DETENTION_DAYS > 180' },
      { id: 's14', name: 'Prayer for Relief', required: true, paraCount: 1, content: 'WHEREFORE, Petitioner respectfully requests that this Court:\n\n(a) Issue the Writ of Habeas Corpus;\n(b) Order Respondents to provide Petitioner with an individualized bond hearing before a neutral decision-maker;\n(c) Order that at such hearing, the government bear the burden of justifying Petitioner\'s continued detention by clear and convincing evidence;\n(d) Order Petitioner\'s immediate release from custody unless the government demonstrates by clear and convincing evidence that detention is justified;\n(e) Award costs and reasonable attorney\'s fees; and\n(f) Grant such other relief as this Court deems just and proper.' },
      { id: 's15', name: 'Verification', required: true, paraCount: 2, content: 'I, {{ATTORNEY_1_NAME}}, counsel for Petitioner, declare under penalty of perjury that the foregoing is true and correct to the best of my knowledge, information, and belief.\n\nDated: {{FILING_DATE}}\n\nRespectfully submitted,\n\n{{ATTORNEY_1_NAME}}\n{{ATTORNEY_1_BAR}}\n{{ATTORNEY_1_FIRM}}\n{{ATTORNEY_1_ADDR}}\n{{ATTORNEY_1_PHONE}}\n{{ATTORNEY_1_EMAIL}}\nCounsel for Petitioner' },
    ],
    variables: VARIABLE_GROUPS.flatMap(g => g.variables),
  },
  {
    id: 'tpl_hc_9th',
    name: 'HC Petition (9th Circuit)',
    category: 'petition',
    parentId: 'tpl_hc_general',
    courtFormatRules: 'ct_daz',
    desc: 'Adapted for 9th Circuit local rules and additional precedent (Singh v. Holder framework)',
    docs: 3,
    lastUsed: Date.now() - 7 * 86400000,
    sections: [
      { id: 's1', name: 'Introduction', required: true, paraCount: 6, content: '1. Petitioner {{PETITIONER_NAME}} is a citizen of {{PETITIONER_COUNTRY_FORMAL}} detained at {{DETENTION_FACILITY}}. Petitioner seeks a writ of habeas corpus pursuant to 28 U.S.C. \u00A7 2241, challenging his prolonged detention without an adequate bond hearing under the framework established in Singh v. Holder, 638 F.3d 1196 (9th Cir. 2011).' },
      { id: 's2', name: 'Custody', required: true, paraCount: 1, content: '2. Petitioner is in the physical custody of {{WARDEN_TITLE}} {{WARDEN_NAME}} at {{DETENTION_FACILITY}}, {{FACILITY_LOCATION}}.' },
      { id: 's3', name: 'Jurisdiction & Venue', required: true, paraCount: 4, content: '3. This Court has jurisdiction under 28 U.S.C. \u00A7 2241. Venue is proper because Petitioner is detained within the {{DISTRICT_FULL}}.' },
      { id: 's4', name: 'Parties', required: true, paraCount: 6, content: '4. Petitioner {{PETITIONER_NAME}} is a citizen of {{PETITIONER_COUNTRY_FORMAL}} who entered the United States on {{ENTRY_DATE}} and has resided here for {{YEARS_RESIDENCE}} years.\n\n5. Respondent {{WARDEN_TITLE}} {{WARDEN_NAME}} has immediate custody and control over Petitioner.\n\n6. Respondent {{FOD_NAME}}, Field Office Director of the {{FIELD_OFFICE}}, has supervisory authority.' },
      { id: 's5', name: 'Statement of Facts', required: true, paraCount: 5, content: '7. On {{APPREHENSION_DATE}}, ICE apprehended Petitioner at {{APPREHENSION_LOCATION}}. Petitioner has been detained for {{DETENTION_DAYS}} days.\n\n8. Petitioner has the following community ties: {{COMMUNITY_TIES}}\n\n9. Criminal history: {{CRIMINAL_HISTORY}}' },
      { id: 's6', name: 'Argument \u2014 Prolonged Detention (Singh)', required: true, paraCount: 8, content: '10. Under Ninth Circuit precedent, prolonged detention without a bond hearing violates due process. Singh v. Holder, 638 F.3d 1196 (9th Cir. 2011). The government must justify continued detention by clear and convincing evidence at a hearing before a neutral decision-maker.' },
      { id: 's7', name: 'Argument \u2014 Statutory Authority', required: true, paraCount: 4, content: '11. Petitioner\'s detention under {{DETENTION_STATUTE}} does not authorize indefinite detention without process.' },
      { id: 's8', name: 'Prayer for Relief', required: true, paraCount: 1, content: 'WHEREFORE, Petitioner requests this Court:\n(a) Issue the Writ;\n(b) Order a bond hearing consistent with Singh;\n(c) Order release pending such hearing;\n(d) Award fees and costs;\n(e) Grant further relief as just.' },
    ],
    variables: VARIABLE_GROUPS.flatMap(g => g.variables),
  },
  {
    id: 'tpl_js44',
    name: 'Civil Cover Sheet (JS 44)',
    category: 'filing',
    parentId: null,
    desc: 'Standard federal civil cover sheet',
    docs: 8,
    lastUsed: Date.now() - 2 * 86400000,
    sections: [
      { id: 's1', name: 'Plaintiff Information', required: true, paraCount: 1, content: 'Plaintiff: {{PETITIONER_NAME}}\nCounty of Residence: {{FACILITY_LOCATION}}' },
      { id: 's2', name: 'Defendant Information', required: true, paraCount: 1, content: 'Defendant: {{WARDEN_TITLE}} {{WARDEN_NAME}}, in official capacity\n\nAdditional Defendants:\n{{FOD_NAME}}, Field Office Director, {{FIELD_OFFICE}}\n{{ICE_DIRECTOR}}, Director of ICE\n{{DHS_SECRETARY}}, Secretary of DHS\n{{AG_NAME}}, Attorney General' },
      { id: 's3', name: 'Attorney Information', required: true, paraCount: 1, content: 'Attorney for Plaintiff:\n{{ATTORNEY_1_NAME}} ({{ATTORNEY_1_BAR}})\n{{ATTORNEY_1_FIRM}}\n{{ATTORNEY_1_ADDR}}\n{{ATTORNEY_1_PHONE}} | {{ATTORNEY_1_EMAIL}}' },
      { id: 's4', name: 'Filing Details', required: true, paraCount: 1, content: 'Court: {{DISTRICT_FULL}}, {{DIVISION}}\nCase Number: {{CASE_NUMBER}}\nFiling Date: {{FILING_DATE}}\nBasis of Jurisdiction: Federal Question (28 U.S.C. \u00A7 1331)\nNature of Suit: 530 \u2014 Habeas Corpus (General)\nCause of Action: 28 U.S.C. \u00A7 2241 \u2014 Petition for Writ of Habeas Corpus' },
    ],
    variables: ['PETITIONER_NAME', 'DISTRICT_FULL', 'DIVISION', 'CASE_NUMBER', 'FILING_DATE', 'ATTORNEY_1_NAME', 'ATTORNEY_1_BAR', 'ATTORNEY_1_FIRM', 'ATTORNEY_1_ADDR', 'ATTORNEY_1_PHONE', 'ATTORNEY_1_EMAIL', 'WARDEN_NAME', 'WARDEN_TITLE', 'FACILITY_LOCATION', 'FOD_NAME', 'FIELD_OFFICE', 'ICE_DIRECTOR', 'DHS_SECRETARY', 'AG_NAME'],
  },
  {
    id: 'tpl_osc',
    name: 'Proposed Order to Show Cause',
    category: 'motion',
    parentId: null,
    desc: 'Proposed order for TRO / OSC with standard language',
    docs: 7,
    lastUsed: Date.now() - 3 * 86400000,
    sections: [
      { id: 's1', name: 'Caption', required: true, paraCount: 1, content: 'UNITED STATES DISTRICT COURT\nFOR THE {{DISTRICT_FULL}}\n\n{{PETITIONER_NAME}},\n   Petitioner,\nv.\n{{WARDEN_TITLE}} {{WARDEN_NAME}}, et al.,\n   Respondents.\n\nCase No. {{CASE_NUMBER}}' },
      { id: 's2', name: 'Order', required: true, paraCount: 2, content: 'Upon consideration of the Petition for Writ of Habeas Corpus filed by {{PETITIONER_NAME}} pursuant to 28 U.S.C. \u00A7 2241, it is hereby ORDERED that:\n\n1. Respondents shall SHOW CAUSE within fourteen (14) days why the Petition should not be granted;\n\n2. Respondents shall file a response to the Petition within fourteen (14) days of the date of this Order;\n\n3. The Clerk shall serve a copy of this Order, the Petition, and all supporting documents upon Respondents through the United States Attorney for the {{DISTRICT_FULL}}.' },
      { id: 's3', name: 'Signature Block', required: true, paraCount: 1, content: 'SO ORDERED this _____ day of ____________, _____.\n\n_______________________________\nUnited States District Judge\n{{DISTRICT_FULL}}' },
    ],
    variables: ['PETITIONER_NAME', 'WARDEN_NAME', 'WARDEN_TITLE', 'CASE_NUMBER', 'DISTRICT_FULL', 'JUDGE_CODE'],
  },
  {
    id: 'tpl_tro',
    name: 'Emergency TRO Motion',
    category: 'motion',
    parentId: null,
    desc: 'Motion for temporary restraining order \u2014 transfer prevention',
    docs: 4,
    lastUsed: Date.now() - 14 * 86400000,
    sections: [
      { id: 's1', name: 'Introduction', required: true, paraCount: 2, content: 'Petitioner {{PETITIONER_NAME}}, through undersigned counsel, respectfully moves this Court for a Temporary Restraining Order pursuant to Federal Rule of Civil Procedure 65(b), restraining Respondents from transferring Petitioner from {{DETENTION_FACILITY}} pending resolution of the habeas petition filed in this matter.' },
      { id: 's2', name: 'Statement of Facts', required: true, paraCount: 3, content: 'Petitioner was apprehended on {{APPREHENSION_DATE}} and has been detained at {{DETENTION_FACILITY}} in {{FACILITY_LOCATION}} for {{DETENTION_DAYS}} days. Petitioner has strong community ties in this district: {{COMMUNITY_TIES}}' },
      { id: 's3', name: 'Legal Standard', required: true, paraCount: 2, content: 'A temporary restraining order is appropriate where the movant shows: (1) a likelihood of success on the merits; (2) irreparable harm absent relief; (3) the balance of hardships favors the movant; and (4) the public interest favors relief. Winter v. Natural Resources Defense Council, 555 U.S. 7, 20 (2008).' },
      { id: 's4', name: 'Argument', required: true, paraCount: 4, content: 'Petitioner satisfies all four Winter factors. First, the habeas petition raises substantial claims under the Due Process Clause and the INA. Second, transfer would render the petition moot and cause irreparable harm.' },
      { id: 's5', name: 'Irreparable Harm', required: true, paraCount: 2, content: 'Transfer from {{DETENTION_FACILITY}} would sever Petitioner\'s access to counsel and disrupt the attorney-client relationship. Transfer to a distant facility would also separate Petitioner from family and community support, compounding the irreparable injury.' },
      { id: 's6', name: 'Conclusion', required: true, paraCount: 1, content: 'For these reasons, Petitioner respectfully requests this Court enter a TRO preventing Respondents from transferring Petitioner pending resolution of the underlying habeas petition.\n\nRespectfully submitted,\n\n{{ATTORNEY_1_NAME}}\n{{ATTORNEY_1_BAR}}\n{{ATTORNEY_1_FIRM}}\n{{ATTORNEY_1_ADDR}}\n{{ATTORNEY_1_PHONE}}\n{{ATTORNEY_1_EMAIL}}' },
    ],
    variables: ['PETITIONER_NAME', 'DETENTION_FACILITY', 'FACILITY_LOCATION', 'WARDEN_NAME', 'WARDEN_TITLE', 'CASE_NUMBER', 'DISTRICT_FULL', 'APPREHENSION_DATE', 'DETENTION_DAYS', 'COMMUNITY_TIES', 'FOD_NAME', 'FIELD_OFFICE', 'ICE_DIRECTOR', 'DHS_SECRETARY', 'ATTORNEY_1_NAME', 'ATTORNEY_1_BAR', 'ATTORNEY_1_FIRM', 'ATTORNEY_1_ADDR', 'ATTORNEY_1_PHONE', 'ATTORNEY_1_EMAIL'],
  },
  {
    id: 'tpl_atty_decl',
    name: 'Attorney Declaration',
    category: 'filing',
    parentId: null,
    desc: 'Declaration in support of habeas petition',
    docs: 6,
    lastUsed: Date.now() - 5 * 86400000,
    sections: [
      { id: 's1', name: 'Declaration Header', required: true, paraCount: 1, content: 'DECLARATION OF {{ATTORNEY_1_NAME}} IN SUPPORT OF PETITION FOR WRIT OF HABEAS CORPUS\n\nI, {{ATTORNEY_1_NAME}}, declare under penalty of perjury as follows:' },
      { id: 's2', name: 'Background', required: true, paraCount: 2, content: '1. I am an attorney licensed to practice in {{DISTRICT_FULL}}. My bar number is {{ATTORNEY_1_BAR}}. I am an attorney at {{ATTORNEY_1_FIRM}}.\n\n2. I represent Petitioner {{PETITIONER_NAME}} in the above-captioned matter. I submit this declaration in support of Petitioner\'s Petition for Writ of Habeas Corpus filed pursuant to 28 U.S.C. \u00A7 2241.' },
      { id: 's3', name: 'Facts Attested', required: true, paraCount: 3, content: '3. I have personally visited Petitioner at {{DETENTION_FACILITY}} and am familiar with the facts of this case.\n\n4. Petitioner has been detained for approximately {{DETENTION_DAYS}} days without a bond hearing before a neutral decision-maker.\n\n5. To my knowledge, Petitioner presents no flight risk and no danger to the community. Petitioner has the following community ties: {{COMMUNITY_TIES}}' },
      { id: 's4', name: 'Verification', required: true, paraCount: 1, content: 'I declare under penalty of perjury that the foregoing is true and correct.\n\nDated: {{FILING_DATE}}\n\n{{ATTORNEY_1_NAME}}\n{{ATTORNEY_1_FIRM}}\n{{ATTORNEY_1_ADDR}}\n{{ATTORNEY_1_PHONE}}\n{{ATTORNEY_1_EMAIL}}' },
    ],
    variables: ['PETITIONER_NAME', 'DETENTION_FACILITY', 'DETENTION_DAYS', 'COMMUNITY_TIES', 'ATTORNEY_1_NAME', 'ATTORNEY_1_BAR', 'ATTORNEY_1_FIRM', 'ATTORNEY_1_ADDR', 'ATTORNEY_1_PHONE', 'ATTORNEY_1_EMAIL', 'CASE_NUMBER', 'DISTRICT_FULL', 'FILING_DATE'],
  },
  {
    id: 'tpl_reply',
    name: 'Reply Brief',
    category: 'brief',
    parentId: null,
    desc: 'Reply to government\'s response \u2014 template with conditional sections',
    docs: 2,
    lastUsed: Date.now() - 21 * 86400000,
    sections: [
      { id: 's1', name: 'Introduction', required: true, paraCount: 2, content: 'Petitioner {{PETITIONER_NAME}}, through undersigned counsel, respectfully submits this Reply to Respondents\' Response to the Petition for Writ of Habeas Corpus. Case No. {{CASE_NUMBER}}.' },
      { id: 's2', name: 'Procedural History', required: true, paraCount: 2, content: 'Petitioner filed the instant Petition on {{FILING_DATE}}. Respondents filed their Response on [date]. This Reply follows.' },
      { id: 's3', name: 'Argument I \u2014 Statutory Authority', required: true, paraCount: 4, content: 'Respondents incorrectly argue that {{DETENTION_STATUTE}} authorizes Petitioner\'s indefinite detention. The government\'s reading ignores the due process constraints recognized in Zadvydas v. Davis, 533 U.S. 678 (2001).' },
      { id: 's4', name: 'Argument II \u2014 Burden of Proof', required: true, paraCount: 3, content: 'Respondents bear the burden of justifying Petitioner\'s continued detention by clear and convincing evidence. The government\'s position that Petitioner must prove he is not a flight risk or danger inverts the constitutional standard.' },
      { id: 's5', name: 'Argument III \u2014 Due Process', required: false, paraCount: 3, content: 'The Due Process Clause requires an individualized hearing. Petitioner has been detained for {{DETENTION_DAYS}} days. {{COMMUNITY_TIES}}', condition: 'HAS_DUE_PROCESS_CLAIM' },
      { id: 's6', name: 'Argument IV \u2014 Prolonged Detention', required: false, paraCount: 2, content: 'Petitioner has been detained for {{DETENTION_DAYS}} days \u2014 a period that exceeds the constitutional threshold recognized by this Circuit.', condition: 'DETENTION_DAYS > 180' },
      { id: 's7', name: 'Conclusion', required: true, paraCount: 1, content: 'For the foregoing reasons, Petitioner respectfully requests that this Court grant the Petition and order Petitioner\'s release or, in the alternative, an immediate bond hearing.\n\nRespectfully submitted,\n\n{{ATTORNEY_1_NAME}}\n{{ATTORNEY_1_BAR}}\n{{ATTORNEY_1_FIRM}}' },
      { id: 's8', name: 'Certificate of Service', required: true, paraCount: 1, content: 'I hereby certify that on {{FILING_DATE}}, a copy of the foregoing was served via CM/ECF on all counsel of record.\n\n{{ATTORNEY_1_NAME}}' },
    ],
    variables: ['PETITIONER_NAME', 'CASE_NUMBER', 'DISTRICT_FULL', 'JUDGE_CODE', 'ATTORNEY_1_NAME', 'ATTORNEY_1_BAR', 'ATTORNEY_1_FIRM', 'WARDEN_NAME', 'WARDEN_TITLE', 'DETENTION_FACILITY', 'DETENTION_DAYS', 'DETENTION_STATUTE', 'APPREHENSION_DATE', 'ICE_DIRECTOR', 'DHS_SECRETARY', 'AG_NAME', 'FOD_NAME', 'FILING_DATE', 'PETITIONER_COUNTRY', 'PETITIONER_COUNTRY_FORMAL', 'ENTRY_DATE', 'YEARS_RESIDENCE', 'COMMUNITY_TIES', 'CRIMINAL_HISTORY', 'FACILITY_LOCATION'],
  },
];

// ── Helper: resolve current officeholder from succession list ──

export function resolveCurrentOfficial(officials, title) {
  const now = new Date().toISOString().slice(0, 10);
  const matches = officials
    .filter(o => o.title === title && o.effectiveDate <= now)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  return matches[0] || null;
}

// ── Helper: resolve current warden for a facility ──

export function resolveCurrentWarden(wardens, facilityId) {
  const now = new Date().toISOString().slice(0, 10);
  const matches = wardens
    .filter(w => w.facilityId === facilityId && w.effectiveDate <= now)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  return matches[0] || null;
}

// ── Helper: get courts for a facility (via field office jurisdiction) ──

export function getCourtsForFacility(facility, fieldOffices, courts) {
  // Primary: courts in the same state as the facility
  const facilityState = extractState(facility.location);
  return courts.filter(c => {
    const courtState = extractState(c.location);
    return courtState === facilityState;
  });
}

function extractState(location) {
  if (!location) return '';
  const parts = location.split(',').map(s => s.trim());
  return parts[parts.length - 1] || '';
}

// ── Helper: build cascade variables from facility selection ──

export function buildCascadeFromFacility(facilityId, { facilities, fieldOffices, wardens, courts, officials, attorneys }) {
  const facility = facilities.find(f => f.id === facilityId);
  if (!facility) return {};

  const fieldOffice = fieldOffices.find(fo => fo.id === facility.fieldOfficeId);
  const warden = resolveCurrentWarden(wardens, facilityId);
  const possibleCourts = getCourtsForFacility(facility, fieldOffices, courts);
  const court = possibleCourts[0] || null;

  const ag = resolveCurrentOfficial(officials, 'Attorney General');
  const dhs = resolveCurrentOfficial(officials, 'DHS Secretary');
  const ice = resolveCurrentOfficial(officials, 'ICE Director');

  const vars = {
    DETENTION_FACILITY: facility.name,
    FACILITY_LOCATION: facility.location,
    FACILITY_OPERATOR: facility.operator || '',
  };

  if (warden) {
    vars.WARDEN_NAME = warden.name;
    vars.WARDEN_TITLE = warden.title;
  }

  if (fieldOffice) {
    vars.FIELD_OFFICE = fieldOffice.name;
    vars.FOD_NAME = fieldOffice.director;
    vars.FIELD_OFFICE_ADDRESS = fieldOffice.address || '';
  }

  if (court) {
    vars.DISTRICT_FULL = court.district;
    vars.DIVISION = court.division;
    vars.COURT_LOCATION = court.location;
    vars.COURT_ADDRESS = court.address || '';
  }

  if (ag) vars.AG_NAME = (ag.actingStatus ? 'Acting ' : '') + ag.name;
  if (dhs) vars.DHS_SECRETARY = (dhs.actingStatus ? 'Acting ' : '') + dhs.name;
  if (ice) {
    vars.ICE_DIRECTOR = (ice.actingStatus ? 'Acting ' : '') + ice.name;
    vars.ICE_DIRECTOR_ACTING = ice.actingStatus ? 'yes' : 'no';
  }

  return { variables: vars, suggestedCourts: possibleCourts, facility, fieldOffice, warden };
}

// ── Helper: build attorney variables from attorney record ──

export function buildAttorneyVariables(attorney, slot = 1) {
  const prefix = `ATTORNEY_${slot}_`;
  return {
    [`${prefix}NAME`]: attorney.name,
    [`${prefix}BAR`]: attorney.bar,
    [`${prefix}FIRM`]: attorney.firm,
    [`${prefix}ADDR`]: attorney.addr,
    [`${prefix}PHONE`]: attorney.phone,
    [`${prefix}EMAIL`]: attorney.email,
  };
}

// ── Helper: build country variables from country record ──

export function buildCountryVariables(countryId, countries) {
  const country = countries.find(c => c.id === countryId);
  if (!country) return {};
  return {
    PETITIONER_COUNTRY: country.name,
    PETITIONER_COUNTRY_FORMAL: country.formalName,
    PETITIONER_DEMONYM: country.demonym,
  };
}

// ── Helper: suggest stage advancement based on document state ──

export function suggestStageAdvancement(currentStage, documents) {
  if (!documents || documents.length === 0) return null;

  const allStatuses = documents.map(d => d.status);
  const allReady = allStatuses.every(s => s === 'ready' || s === 'filed');
  const allDraftOrBetter = allStatuses.every(s => s !== 'empty');
  const allReviewOrBetter = allStatuses.every(s => s === 'review' || s === 'ready' || s === 'filed');
  const anyFiled = allStatuses.some(s => s === 'filed');
  const allFiled = allStatuses.every(s => s === 'filed');

  switch (currentStage) {
    case 'Intake':
      if (allDraftOrBetter) return { nextStage: 'Drafting', reason: 'All documents have been started' };
      break;
    case 'Drafting':
      if (allReviewOrBetter) return { nextStage: 'Attorney Review', reason: 'All documents are in review or ready' };
      break;
    case 'Attorney Review':
      if (allReady) return { nextStage: 'Ready to File', reason: 'All documents approved and ready' };
      break;
    case 'Ready to File':
      if (anyFiled) return { nextStage: 'Filed', reason: 'Documents have been filed' };
      break;
    default:
      return null;
  }
  return null;
}

// ── Helper: auto-populate default documents for a new case ──

export function getDefaultDocuments(docTypes, templates) {
  return docTypes
    .filter(dt => dt.required)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(dt => {
      const template = templates.find(t => t.id === dt.defaultTemplateId);
      return {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        templateId: dt.defaultTemplateId,
        name: dt.name,
        status: 'empty',
        variableOverrides: {},
        sections: [],
      };
    });
}

// ── Seed cases (enhanced with new fields) ──

export const SEED_CASES = [
  {
    id: 'case_rivera',
    petitionerName: 'Rivera, Juan Jose',
    stage: 'Attorney Review',
    circuit: '4th Cir.',
    facility: 'Farmville DC',
    facilityId: 'fac_farmville',
    facilityLocation: 'Farmville, VA',
    courtId: 'ct_edva',
    countryId: 'country_hn',
    detentionStatuteId: 'stat_1226a',
    chargeIds: ['chg_212a6Ai'],
    daysInStage: 3,
    owner: '@katie:app.aminoimmigration.com',
    leadAttorneyId: 'atty_soltis',
    lastUpdated: new Date().toISOString(),
    variables: {
      PETITIONER_NAME: 'Juan Jose Rivera',
      PETITIONER_COUNTRY: 'Honduras',
      PETITIONER_COUNTRY_FORMAL: 'the Republic of Honduras',
      PETITIONER_DEMONYM: 'Honduran',
      ENTRY_DATE: '2019-03-15',
      YEARS_RESIDENCE: '6',
      APPREHENSION_LOCATION: 'Richmond, VA',
      APPREHENSION_DATE: '2024-10-03',
      CRIMINAL_HISTORY: 'None',
      COMMUNITY_TIES: 'Employed at Riverside Construction for 4 years. Two U.S. citizen children enrolled at Farmville Elementary.',
      DETENTION_FACILITY: 'Farmville Detention Center',
      FACILITY_LOCATION: 'Farmville, VA',
      FACILITY_OPERATOR: 'Immigration Centers of America',
      WARDEN_NAME: 'Jeff Crawford',
      WARDEN_TITLE: 'Warden',
      DETENTION_DAYS: '45',
      DETENTION_STATUTE: '\u00A7 1226(a)',
      DISTRICT_FULL: 'Eastern District of Virginia',
      DIVISION: 'Richmond Division',
      COURT_LOCATION: 'Richmond, VA',
      COURT_ADDRESS: '701 E Broad St, Richmond, VA 23219',
      CASE_NUMBER: '',
      JUDGE_NAME: '',
      JUDGE_TITLE: '',
      JUDGE_CODE: '',
      FILING_DATE: '',
      FOD_NAME: 'Sarah Johnson',
      FIELD_OFFICE: 'Washington DC Field Office',
      FIELD_OFFICE_ADDRESS: '2675 Prosperity Ave, Fairfax, VA 22031',
      ICE_DIRECTOR: 'Tom Homan',
      ICE_DIRECTOR_ACTING: 'no',
      DHS_SECRETARY: 'Kristi Noem',
      AG_NAME: 'Pam Bondi',
      ATTORNEY_1_NAME: 'Katie Soltis',
      ATTORNEY_1_BAR: 'VA 12345',
      ATTORNEY_1_FIRM: 'Amino Immigration Law',
      ATTORNEY_1_ADDR: '123 Main St, Richmond, VA 23219',
      ATTORNEY_1_PHONE: '(804) 555-0123',
      ATTORNEY_1_EMAIL: 'katie@aminoimmigration.com',
      ATTORNEY_2_NAME: '',
      ATTORNEY_2_BAR: '',
      ATTORNEY_2_FIRM: '',
      ATTORNEY_2_ADDR: '',
      ATTORNEY_2_PHONE: '',
      ATTORNEY_2_EMAIL: '',
      AUSA_NAME: '',
      AUSA_OFFICE: '',
      AUSA_PHONE: '',
      AUSA_EMAIL: '',
    },
    documents: [
      { id: 'doc_1', templateId: 'tpl_hc_general', name: 'Petition for Writ of Habeas Corpus', status: 'review', variableOverrides: {}, sections: [] },
      { id: 'doc_2', templateId: 'tpl_js44', name: 'Civil Cover Sheet (JS 44)', status: 'draft', variableOverrides: {}, sections: [] },
      { id: 'doc_3', templateId: 'tpl_osc', name: 'Proposed Order to Show Cause', status: 'ready', variableOverrides: {}, sections: [] },
      { id: 'doc_4', templateId: 'tpl_tro', name: 'Emergency TRO Motion', status: 'empty', variableOverrides: {}, sections: [] },
      { id: 'doc_5', templateId: 'tpl_atty_decl', name: 'Attorney Declaration', status: 'draft', variableOverrides: {}, sections: [] },
    ],
    comments: [
      { id: 'cmt_1', documentId: 'doc_1', section: 'Introduction', author: 'K. Soltis', text: 'Confirm apprehension date \u2014 client says Oct 2 but I-213 says Oct 3.', status: 'open', createdAt: Date.now() - 3600000 },
      { id: 'cmt_2', documentId: 'doc_1', section: 'Statement of Facts', author: 'K. Soltis', text: 'Strengthen community ties \u2014 mention employer by name and children\'s school.', status: 'open', createdAt: Date.now() - 1800000 },
    ],
  },
  {
    id: 'case_mendoza',
    petitionerName: 'Mendoza, Carlos',
    stage: 'Drafting',
    circuit: '11th Cir.',
    facility: 'Stewart DC',
    facilityId: 'fac_stewart',
    facilityLocation: 'Lumpkin, GA',
    courtId: 'ct_mdga',
    countryId: 'country_gt',
    detentionStatuteId: 'stat_1226a',
    chargeIds: ['chg_212a7Ai'],
    daysInStage: 1,
    owner: '@katie:app.aminoimmigration.com',
    leadAttorneyId: 'atty_brooks',
    lastUpdated: new Date().toISOString(),
    variables: {
      PETITIONER_NAME: 'Carlos Mendoza',
      PETITIONER_COUNTRY: 'Guatemala',
      PETITIONER_COUNTRY_FORMAL: 'the Republic of Guatemala',
      PETITIONER_DEMONYM: 'Guatemalan',
      ENTRY_DATE: '2020-06-22',
      YEARS_RESIDENCE: '5',
      APPREHENSION_LOCATION: 'Atlanta, GA',
      APPREHENSION_DATE: '2024-11-15',
      CRIMINAL_HISTORY: 'None',
      COMMUNITY_TIES: 'Attends local church. Partner is legal permanent resident.',
      DETENTION_FACILITY: 'Stewart Detention Center',
      FACILITY_LOCATION: 'Lumpkin, GA',
      FACILITY_OPERATOR: 'CoreCivic',
      WARDEN_NAME: 'Michael Davis',
      WARDEN_TITLE: 'Warden',
      DETENTION_DAYS: '30',
      DETENTION_STATUTE: '\u00A7 1226(a)',
      DISTRICT_FULL: 'Middle District of Georgia',
      DIVISION: 'Macon Division',
      COURT_LOCATION: 'Macon, GA',
      COURT_ADDRESS: '475 Mulberry St, Macon, GA 31201',
      CASE_NUMBER: '',
      JUDGE_NAME: '',
      JUDGE_TITLE: '',
      JUDGE_CODE: '',
      FILING_DATE: '',
      FOD_NAME: 'James Williams',
      FIELD_OFFICE: 'Atlanta Field Office',
      FIELD_OFFICE_ADDRESS: '180 Ted Turner Dr SW, Atlanta, GA 30303',
      ICE_DIRECTOR: 'Tom Homan',
      ICE_DIRECTOR_ACTING: 'no',
      DHS_SECRETARY: 'Kristi Noem',
      AG_NAME: 'Pam Bondi',
      ATTORNEY_1_NAME: '',
      ATTORNEY_1_BAR: '',
      ATTORNEY_1_FIRM: '',
      ATTORNEY_1_ADDR: '',
      ATTORNEY_1_PHONE: '',
      ATTORNEY_1_EMAIL: '',
      ATTORNEY_2_NAME: '',
      ATTORNEY_2_BAR: '',
      ATTORNEY_2_FIRM: '',
      ATTORNEY_2_ADDR: '',
      ATTORNEY_2_PHONE: '',
      ATTORNEY_2_EMAIL: '',
      AUSA_NAME: '',
      AUSA_OFFICE: '',
      AUSA_PHONE: '',
      AUSA_EMAIL: '',
    },
    documents: [
      { id: 'doc_m1', templateId: 'tpl_hc_general', name: 'Petition for Writ of Habeas Corpus', status: 'draft', variableOverrides: {}, sections: [] },
      { id: 'doc_m2', templateId: 'tpl_js44', name: 'Civil Cover Sheet (JS 44)', status: 'empty', variableOverrides: {}, sections: [] },
      { id: 'doc_m3', templateId: 'tpl_osc', name: 'Proposed Order to Show Cause', status: 'empty', variableOverrides: {}, sections: [] },
      { id: 'doc_m4', templateId: 'tpl_tro', name: 'Emergency TRO Motion', status: 'empty', variableOverrides: {}, sections: [] },
      { id: 'doc_m5', templateId: 'tpl_atty_decl', name: 'Attorney Declaration', status: 'empty', variableOverrides: {}, sections: [] },
    ],
    comments: [],
  },
  {
    id: 'case_alvarez',
    petitionerName: 'Alvarez, Maria',
    stage: 'Filed',
    circuit: '9th Cir.',
    facility: 'Eloy DC',
    facilityId: 'fac_eloy',
    facilityLocation: 'Eloy, AZ',
    courtId: 'ct_daz',
    countryId: 'country_mx',
    detentionStatuteId: 'stat_1231a6',
    chargeIds: ['chg_237a1B'],
    daysInStage: 12,
    owner: '@katie:app.aminoimmigration.com',
    leadAttorneyId: 'atty_chen',
    lastUpdated: new Date().toISOString(),
    variables: {
      PETITIONER_NAME: 'Maria Alvarez',
      PETITIONER_COUNTRY: 'Mexico',
      PETITIONER_COUNTRY_FORMAL: 'the United Mexican States',
      PETITIONER_DEMONYM: 'Mexican',
      ENTRY_DATE: '2017-01-10',
      YEARS_RESIDENCE: '8',
      APPREHENSION_LOCATION: 'Phoenix, AZ',
      APPREHENSION_DATE: '2024-09-20',
      CRIMINAL_HISTORY: 'None',
      COMMUNITY_TIES: 'Three U.S. citizen children. Active member of St. Thomas Church. Employed at Desert Valley Nursery.',
      DETENTION_FACILITY: 'Eloy Detention Center',
      FACILITY_LOCATION: 'Eloy, AZ',
      FACILITY_OPERATOR: 'CoreCivic',
      WARDEN_NAME: 'Robert Martinez',
      WARDEN_TITLE: 'Facility Administrator',
      DETENTION_DAYS: '90',
      DETENTION_STATUTE: '\u00A7 1231(a)(6)',
      DISTRICT_FULL: 'District of Arizona',
      DIVISION: 'Phoenix Division',
      COURT_LOCATION: 'Phoenix, AZ',
      COURT_ADDRESS: '401 W Washington St, Phoenix, AZ 85003',
      CASE_NUMBER: '2:24-cv-02345-PHX',
      JUDGE_NAME: 'Douglas L. Rayes',
      JUDGE_TITLE: 'Senior District Judge',
      JUDGE_CODE: 'DLR',
      FILING_DATE: '2024-11-05',
      FOD_NAME: 'David Ramirez',
      FIELD_OFFICE: 'Phoenix Field Office',
      FIELD_OFFICE_ADDRESS: '2035 N Central Ave, Phoenix, AZ 85004',
      ICE_DIRECTOR: 'Tom Homan',
      ICE_DIRECTOR_ACTING: 'no',
      DHS_SECRETARY: 'Kristi Noem',
      AG_NAME: 'Pam Bondi',
      ATTORNEY_1_NAME: 'Lisa Chen',
      ATTORNEY_1_BAR: 'AZ 33445',
      ATTORNEY_1_FIRM: 'Amino Immigration Law',
      ATTORNEY_1_ADDR: '456 Oak Ave, Phoenix, AZ 85001',
      ATTORNEY_1_PHONE: '(602) 555-0789',
      ATTORNEY_1_EMAIL: 'lisa@aminoimmigration.com',
      ATTORNEY_2_NAME: '',
      ATTORNEY_2_BAR: '',
      ATTORNEY_2_FIRM: '',
      ATTORNEY_2_ADDR: '',
      ATTORNEY_2_PHONE: '',
      ATTORNEY_2_EMAIL: '',
      AUSA_NAME: '',
      AUSA_OFFICE: '',
      AUSA_PHONE: '',
      AUSA_EMAIL: '',
    },
    documents: [
      { id: 'doc_a1', templateId: 'tpl_hc_9th', name: 'Petition for Writ of Habeas Corpus', status: 'filed', variableOverrides: {}, sections: [] },
      { id: 'doc_a2', templateId: 'tpl_js44', name: 'Civil Cover Sheet (JS 44)', status: 'filed', variableOverrides: {}, sections: [] },
      { id: 'doc_a3', templateId: 'tpl_osc', name: 'Proposed Order to Show Cause', status: 'filed', variableOverrides: {}, sections: [] },
      { id: 'doc_a4', templateId: 'tpl_tro', name: 'Emergency TRO Motion', status: 'filed', variableOverrides: {}, sections: [] },
      { id: 'doc_a5', templateId: 'tpl_atty_decl', name: 'Attorney Declaration', status: 'filed', variableOverrides: {}, sections: [] },
    ],
    comments: [],
  },
];

// ── Pipeline extra cases ──

export const SEED_PIPELINE_EXTRA = [
  {
    id: 'case_dominguez',
    petitionerName: 'Dominguez, P.',
    stage: 'Intake',
    circuit: '5th Cir.',
    facility: 'South Texas DC',
    facilityId: 'fac_south_texas',
    facilityLocation: 'Pearsall, TX',
    courtId: 'ct_sdtx',
    daysInStage: 1,
    documents: [
      { id: 'doc_d1', status: 'empty', name: 'Petition', variableOverrides: {} },
      { id: 'doc_d2', status: 'empty', name: 'Cover Sheet', variableOverrides: {} },
      { id: 'doc_d3', status: 'empty', name: 'OSC', variableOverrides: {} },
      { id: 'doc_d4', status: 'empty', name: 'TRO Motion', variableOverrides: {} },
      { id: 'doc_d5', status: 'empty', name: 'Attorney Decl.', variableOverrides: {} },
    ],
    variables: {},
    comments: [],
  },
  {
    id: 'case_torres',
    petitionerName: 'Torres, R.',
    stage: 'Drafting',
    circuit: '3rd Cir.',
    facility: 'York County DC',
    facilityId: 'fac_york',
    facilityLocation: 'York, PA',
    courtId: 'ct_mdpa',
    daysInStage: 4,
    documents: [
      { id: 'doc_t1', status: 'ready', name: 'Petition', variableOverrides: {} },
      { id: 'doc_t2', status: 'ready', name: 'Cover Sheet', variableOverrides: {} },
      { id: 'doc_t3', status: 'draft', name: 'OSC', variableOverrides: {} },
      { id: 'doc_t4', status: 'empty', name: 'TRO Motion', variableOverrides: {} },
      { id: 'doc_t5', status: 'empty', name: 'Attorney Decl.', variableOverrides: {} },
    ],
    variables: {},
    comments: [],
  },
  {
    id: 'case_guzman',
    petitionerName: 'Guzman, L.',
    stage: 'Ready to File',
    circuit: '6th Cir.',
    facility: 'Morrow County DC',
    facilityId: 'fac_morrow',
    facilityLocation: 'Mt. Gilead, OH',
    courtId: 'ct_sdoh',
    daysInStage: 2,
    documents: [
      { id: 'doc_g1', status: 'ready', name: 'Petition', variableOverrides: {} },
      { id: 'doc_g2', status: 'ready', name: 'Cover Sheet', variableOverrides: {} },
      { id: 'doc_g3', status: 'ready', name: 'OSC', variableOverrides: {} },
      { id: 'doc_g4', status: 'ready', name: 'TRO Motion', variableOverrides: {} },
      { id: 'doc_g5', status: 'ready', name: 'Attorney Decl.', variableOverrides: {} },
    ],
    variables: {},
    comments: [],
  },
  {
    id: 'case_chen',
    petitionerName: 'Chen, W.',
    stage: 'Filed',
    circuit: '2nd Cir.',
    facility: 'Bergen County DC',
    facilityId: 'fac_bergen',
    facilityLocation: 'Hackensack, NJ',
    courtId: 'ct_dnj',
    daysInStage: 8,
    documents: [
      { id: 'doc_c1', status: 'filed', name: 'Petition', variableOverrides: {} },
      { id: 'doc_c2', status: 'filed', name: 'Cover Sheet', variableOverrides: {} },
      { id: 'doc_c3', status: 'filed', name: 'OSC', variableOverrides: {} },
      { id: 'doc_c4', status: 'filed', name: 'TRO Motion', variableOverrides: {} },
      { id: 'doc_c5', status: 'filed', name: 'Attorney Decl.', variableOverrides: {} },
    ],
    variables: {},
    comments: [],
  },
];

// ── Aggregate all seed ref data for demo mode ──

export const SEED_REF_DATA = {
  facility: SEED_FACILITIES,
  warden: SEED_WARDENS,
  attorney: SEED_ATTORNEYS,
  field_office: SEED_FIELD_OFFICES,
  court: SEED_COURTS,
  official: SEED_OFFICIALS,
  judge: SEED_JUDGES,
  country: SEED_COUNTRIES,
  charge: SEED_CHARGES,
  detention_statute: SEED_DETENTION_STATUTES,
  case_outcome: SEED_CASE_OUTCOMES,
  bond_condition: SEED_BOND_CONDITIONS,
  doc_type: SEED_DOC_TYPES,
};
