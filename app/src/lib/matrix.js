/**
 * Matrix integration layer for Habeas.
 *
 * Room architecture:
 *   - Shared data room (#habeas-data):  templates, reference data, case metadata (name/stage/owner)
 *   - Per-case rooms (#habeas-case-{id}): full case data, documents, variables, comments
 *   - Admin room (#habeas-admins): role determination
 *
 * Templates are collective — any team member in the data room can read/write them.
 * Cases are per-user — a per-case room is created and only invited attorneys can access.
 */

const MATRIX_BASE = 'https://app.aminoimmigration.com';
const ADMIN_ROOM_ALIAS = '#habeas-admins:app.aminoimmigration.com';
const DATA_ROOM_ALIAS = '#habeas-data:app.aminoimmigration.com';
const SESSION_KEY = 'habeas_session';

const MX_TYPES = {
  matter: 'com.habeas.matter',         // case metadata in shared room
  template: 'com.habeas.template',     // templates in shared room
  // Reference data (shared room)
  facility: 'com.habeas.facility',
  warden: 'com.habeas.warden',
  attorney: 'com.habeas.attorney',
  field_office: 'com.habeas.field_office',
  court: 'com.habeas.court',
  official: 'com.habeas.official',
  judge: 'com.habeas.judge',
  country: 'com.habeas.country',
  charge: 'com.habeas.charge',
  detention_statute: 'com.habeas.detention_statute',
  case_outcome: 'com.habeas.case_outcome',
  bond_condition: 'com.habeas.bond_condition',
  doc_type: 'com.habeas.doc_type',
  // Per-case room event types
  case_data: 'com.habeas.case_data',       // full case variables
  case_document: 'com.habeas.case_document', // individual document state
  case_comment: 'com.habeas.case_comment',   // review comments
};

const STAGES = [
  'Intake', 'Drafting', 'Attorney Review', 'Ready to File',
  'Filed', 'Awaiting Response', 'Reply Filed', 'Order Received',
  'Bond Hearing', 'Resolved',
];

const STAGE_COLORS = {
  'Intake': '#6366f1',
  'Drafting': '#8b5cf6',
  'Attorney Review': '#a855f7',
  'Ready to File': '#d946ef',
  'Filed': '#1e40af',
  'Awaiting Response': '#0891b2',
  'Reply Filed': '#0d9488',
  'Order Received': '#059669',
  'Bond Hearing': '#d97706',
  'Resolved': '#6b7280',
};

const STAGE_CHIP_COLORS = {
  'Intake': 'blue',
  'Drafting': 'blue',
  'Attorney Review': 'purple',
  'Ready to File': 'green',
  'Filed': 'orange',
  'Awaiting Response': 'yellow',
  'Reply Filed': 'blue',
  'Order Received': 'green',
  'Bond Hearing': 'yellow',
  'Resolved': 'gray',
};

let _token = null;
let _userId = null;
let _dataRoomId = null;
let _adminRoomId = null;

// Cache of per-case room IDs: caseId -> roomId
const _caseRooms = {};

function headers() {
  return {
    'Authorization': `Bearer ${_token}`,
    'Content-Type': 'application/json',
  };
}

// ── Token / session ──

export function setToken(t) { _token = t; }
export function getToken() { return _token; }
export function setUserId(id) { _userId = id; }
export function getUserId() { return _userId; }
export function getDataRoomId() { return _dataRoomId; }

// ── Low-level Matrix calls ──

async function mxFetch(path, opts = {}) {
  const res = await fetch(`${MATRIX_BASE}${path}`, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Matrix error ${res.status}`);
  }
  return res.json();
}

async function resolveAlias(alias) {
  try {
    const data = await mxFetch(`/_matrix/client/v3/directory/room/${encodeURIComponent(alias)}`);
    return data.room_id;
  } catch {
    return null;
  }
}

async function joinRoom(roomIdOrAlias) {
  return mxFetch(`/_matrix/client/v3/join/${encodeURIComponent(roomIdOrAlias)}`, { method: 'POST', body: '{}' });
}

async function createRoom(aliasLocal, name, inviteUserIds = []) {
  return mxFetch('/_matrix/client/v3/createRoom', {
    method: 'POST',
    body: JSON.stringify({
      room_alias_name: aliasLocal,
      name,
      visibility: 'private',
      preset: 'private_chat',
      invite: inviteUserIds,
    }),
  });
}

async function getAllState(roomId) {
  return mxFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state`);
}

async function putState(roomId, evType, stateKey, content) {
  return mxFetch(
    `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/${encodeURIComponent(evType)}/${encodeURIComponent(stateKey || '')}`,
    { method: 'PUT', body: JSON.stringify(content) }
  );
}

async function inviteUser(roomId, userId) {
  return mxFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite`, {
    method: 'POST', body: JSON.stringify({ user_id: userId }),
  });
}

async function getJoinedMembers(roomId) {
  return mxFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/joined_members`);
}

// ── Auth ──

export async function login(username, password) {
  const data = await mxFetch('/_matrix/client/v3/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'm.login.password',
      identifier: { type: 'm.id.user', user: username },
      password,
    }),
  });
  _token = data.access_token;
  _userId = data.user_id;
  return { userId: data.user_id, token: data.access_token, deviceId: data.device_id };
}

export async function whoami() {
  return mxFetch('/_matrix/client/v3/account/whoami');
}

export async function determineRole() {
  try {
    const adminId = await resolveAlias(ADMIN_ROOM_ALIAS);
    if (!adminId) return 'partner';
    _adminRoomId = adminId;
    const data = await getJoinedMembers(adminId);
    return data.joined && data.joined[_userId] ? 'admin' : 'partner';
  } catch {
    return 'partner';
  }
}

// ── Shared data room (templates, ref data, case metadata) ──

export async function ensureDataRoom() {
  if (_dataRoomId) return _dataRoomId;
  let roomId = await resolveAlias(DATA_ROOM_ALIAS);
  if (roomId) {
    try { await joinRoom(roomId); } catch { /* already joined */ }
    _dataRoomId = roomId;
    return roomId;
  }
  const result = await createRoom('habeas-data', 'Habeas Data');
  _dataRoomId = result.room_id;
  return _dataRoomId;
}

// ── Templates (collective, in shared room) ──

export async function loadTemplates() {
  await ensureDataRoom();
  const events = await getAllState(_dataRoomId);
  return events
    .filter(e => e.type === MX_TYPES.template && e.content && !e.content._deleted)
    .map(e => ({ id: e.state_key, ...e.content }));
}

export async function saveTemplate(id, data) {
  await ensureDataRoom();
  await putState(_dataRoomId, MX_TYPES.template, id, {
    ...data,
    updatedBy: _userId,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTemplate(id) {
  await ensureDataRoom();
  await putState(_dataRoomId, MX_TYPES.template, id, { _deleted: true });
}

// ── Reference data (collective, in shared room) ──

const REF_TYPES = [
  'facility', 'warden', 'attorney', 'field_office', 'court', 'official',
  'judge', 'country', 'charge', 'detention_statute', 'case_outcome', 'bond_condition', 'doc_type',
];

export async function loadRefData() {
  await ensureDataRoom();
  const events = await getAllState(_dataRoomId);
  const ref = {};
  for (const type of REF_TYPES) {
    ref[type] = events
      .filter(e => e.type === MX_TYPES[type] && e.content && !e.content._deleted)
      .map(e => ({ id: e.state_key, ...e.content }));
  }
  return ref;
}

export async function saveRefRecord(type, id, data) {
  if (!REF_TYPES.includes(type)) throw new Error(`Unknown ref type: ${type}`);
  await ensureDataRoom();
  await putState(_dataRoomId, MX_TYPES[type], id, {
    ...data,
    updatedBy: _userId,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteRefRecord(type, id) {
  if (!REF_TYPES.includes(type)) throw new Error(`Unknown ref type: ${type}`);
  await ensureDataRoom();
  await putState(_dataRoomId, MX_TYPES[type], id, { _deleted: true });
}

// ── Case metadata (in shared room — for pipeline visibility) ──

export async function loadCaseMetadata() {
  await ensureDataRoom();
  const events = await getAllState(_dataRoomId);
  return events
    .filter(e => e.type === MX_TYPES.matter && e.content && !e.content._deleted)
    .map(e => ({ id: e.state_key, ...e.content }));
}

export async function saveCaseMetadata(id, metadata) {
  await ensureDataRoom();
  await putState(_dataRoomId, MX_TYPES.matter, id, {
    ...metadata,
    updatedBy: _userId,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCaseMetadata(id) {
  await ensureDataRoom();
  await putState(_dataRoomId, MX_TYPES.matter, id, { _deleted: true });
}

// ── Per-case rooms (user-specific content) ──

async function ensureCaseRoom(caseId) {
  if (_caseRooms[caseId]) return _caseRooms[caseId];

  const alias = `#habeas-case-${caseId}:app.aminoimmigration.com`;
  let roomId = await resolveAlias(alias);
  if (roomId) {
    try { await joinRoom(roomId); } catch { /* already joined */ }
    _caseRooms[caseId] = roomId;
    return roomId;
  }

  // Create a new per-case room
  const result = await createRoom(`habeas-case-${caseId}`, `Habeas Case: ${caseId}`, []);
  _caseRooms[caseId] = result.room_id;
  return result.room_id;
}

export async function loadCaseData(caseId) {
  const roomId = await ensureCaseRoom(caseId);
  const events = await getAllState(roomId);

  const caseDataEvent = events.find(e => e.type === MX_TYPES.case_data && e.state_key === 'main');
  const documents = events
    .filter(e => e.type === MX_TYPES.case_document && e.content && !e.content._deleted)
    .map(e => ({ id: e.state_key, ...e.content }));
  const comments = events
    .filter(e => e.type === MX_TYPES.case_comment && e.content && !e.content._deleted)
    .map(e => ({ id: e.state_key, ...e.content }));

  return {
    variables: caseDataEvent?.content?.variables || {},
    documents,
    comments,
  };
}

export async function saveCaseVariables(caseId, variables) {
  const roomId = await ensureCaseRoom(caseId);
  await putState(roomId, MX_TYPES.case_data, 'main', {
    variables,
    updatedBy: _userId,
    updatedAt: new Date().toISOString(),
  });
}

export async function saveCaseDocument(caseId, docId, docData) {
  const roomId = await ensureCaseRoom(caseId);
  await putState(roomId, MX_TYPES.case_document, docId, {
    ...docData,
    updatedBy: _userId,
    updatedAt: new Date().toISOString(),
  });
}

export async function saveCaseComment(caseId, commentId, commentData) {
  const roomId = await ensureCaseRoom(caseId);
  await putState(roomId, MX_TYPES.case_comment, commentId, {
    ...commentData,
    updatedBy: _userId,
    updatedAt: new Date().toISOString(),
  });
}

export async function inviteToCase(caseId, userId) {
  const roomId = await ensureCaseRoom(caseId);
  await inviteUser(roomId, userId);
}

// ── Session persistence ──

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  _token = null;
  _userId = null;
  _dataRoomId = null;
}

export { MATRIX_BASE, STAGES, STAGE_COLORS, STAGE_CHIP_COLORS, MX_TYPES };
