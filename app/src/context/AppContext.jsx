import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { SEED_CASES, SEED_PIPELINE_EXTRA, SEED_TEMPLATES, SEED_REF_DATA, SEED_USERS, buildCascadeFromFacility, buildAttorneyVariables, buildCountryVariables, getDefaultDocuments } from '../lib/seedData';
import * as mx from '../lib/matrix';

const AppContext = createContext(null);

const SCREENS = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  CASES: 'cases',
  WORKSPACE: 'workspace',
  TEMPLATES: 'templates',
  TEMPLATE_EDIT: 'template_edit',
  PIPELINE: 'pipeline',
  INTAKE: 'intake',
  USERS: 'users',
  SHARED: 'shared',
};

const initialState = {
  screen: SCREENS.LOGIN,
  history: [],
  user: null,
  role: 'partner',
  isLoggedIn: false,
  loginError: null,
  loginLoading: false,
  cases: [],
  templates: [],
  users: [],
  refData: {},
  activeCaseId: null,
  activeDocIndex: 0,
  activeTemplateId: null,
  activeTemplateSection: 0,
  fileShares: [],
  loading: false,
  caseLoading: false,
  toast: null,
  connected: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, history: [...state.history, state.screen], screen: action.screen };
    case 'GO_BACK': {
      const h = [...state.history];
      const prev = h.pop() || SCREENS.DASHBOARD;
      return { ...state, screen: prev, history: h };
    }
    case 'SET_LOGIN_LOADING':
      return { ...state, loginLoading: action.loading };
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.user, role: action.role || 'partner', isLoggedIn: true, loginError: null, loginLoading: false, screen: SCREENS.DASHBOARD, connected: true };
    case 'LOGIN_ERROR':
      return { ...state, loginError: action.error, loginLoading: false };
    case 'ENTER_DEMO': {
      const demoCases = [...SEED_CASES, ...SEED_PIPELINE_EXTRA];
      const demoShares = demoCases.length > 0 && demoCases[0].documents?.length > 0 ? [{
        id: 'share_demo_1',
        caseId: demoCases[0].id,
        caseName: demoCases[0].petitionerName,
        documentIds: [demoCases[0].documents[0].id],
        documentNames: [demoCases[0].documents[0].name],
        sharedBy: '@partner1:local',
        sharedByName: 'Sarah Chen',
        sharedWith: '@demo:local',
        sharedWithName: 'Demo User',
        message: 'Please review the petition draft before filing.',
        permission: 'comment',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      }] : [];
      return { ...state, isLoggedIn: true, user: { userId: '@demo:local', name: 'Demo User' }, role: 'admin', screen: SCREENS.DASHBOARD, cases: demoCases, templates: [...SEED_TEMPLATES], users: [...SEED_USERS], refData: { ...SEED_REF_DATA }, fileShares: demoShares, connected: false };
    }
    case 'LOGOUT': {
      mx.clearSession();
      return { ...initialState };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_CASE_LOADING':
      return { ...state, caseLoading: action.loading };
    case 'SET_CASES':
      return { ...state, cases: action.cases };
    case 'SET_TEMPLATES':
      return { ...state, templates: action.templates };
    case 'MERGE_TEMPLATES': {
      const existing = new Map(state.templates.map(t => [t.id, t]));
      action.templates.forEach(t => existing.set(t.id, t));
      return { ...state, templates: Array.from(existing.values()) };
    }
    case 'SET_REF_DATA':
      return { ...state, refData: action.refData };
    case 'SET_ACTIVE_CASE':
      return { ...state, activeCaseId: action.caseId, activeDocIndex: 0 };
    case 'SET_ACTIVE_DOC':
      return { ...state, activeDocIndex: action.index };
    case 'SET_ACTIVE_TEMPLATE':
      return { ...state, activeTemplateId: action.templateId, activeTemplateSection: 0 };
    case 'SET_ACTIVE_TEMPLATE_SECTION':
      return { ...state, activeTemplateSection: action.index };
    case 'UPDATE_CASE': {
      const cases = state.cases.map(c => c.id === action.caseId ? { ...c, ...action.data } : c);
      return { ...state, cases };
    }
    case 'ADD_CASE':
      return { ...state, cases: [...state.cases, action.caseData] };
    case 'DELETE_CASE':
      return { ...state, cases: state.cases.filter(c => c.id !== action.caseId) };
    case 'ARCHIVE_CASE': {
      const cases = state.cases.map(c => c.id === action.caseId ? { ...c, archived: true } : c);
      return { ...state, cases };
    }
    case 'UNARCHIVE_CASE': {
      const cases = state.cases.map(c => c.id === action.caseId ? { ...c, archived: false } : c);
      return { ...state, cases };
    }
    case 'UPDATE_CASE_VARIABLE': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        return { ...c, variables: { ...c.variables, [action.key]: action.value } };
      });
      return { ...state, cases };
    }
    case 'SET_CASE_VARIABLES': {
      const cases = state.cases.map(c => c.id !== action.caseId ? c : { ...c, variables: action.variables });
      return { ...state, cases };
    }
    case 'MERGE_CASE_VARIABLES': {
      const cases = state.cases.map(c => c.id !== action.caseId ? c : { ...c, variables: { ...c.variables, ...action.variables } });
      return { ...state, cases };
    }
    case 'SET_CASE_DOCUMENTS': {
      const cases = state.cases.map(c => c.id !== action.caseId ? c : { ...c, documents: action.documents });
      return { ...state, cases };
    }
    case 'SET_CASE_COMMENTS': {
      const cases = state.cases.map(c => c.id !== action.caseId ? c : { ...c, comments: action.comments });
      return { ...state, cases };
    }
    case 'UPDATE_DOCUMENT_STATUS': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        const documents = (c.documents || []).map(d => d.id === action.docId ? { ...d, status: action.status } : d);
        return { ...c, documents };
      });
      return { ...state, cases };
    }
    case 'UPDATE_DOCUMENT_OVERRIDE': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        const documents = (c.documents || []).map(d => {
          if (d.id !== action.docId) return d;
          const overrides = { ...(d.variableOverrides || {}), [action.key]: action.value };
          return { ...d, variableOverrides: overrides };
        });
        return { ...c, documents };
      });
      return { ...state, cases };
    }
    case 'ADD_DOCUMENT_TO_CASE': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        return { ...c, documents: [...(c.documents || []), action.doc] };
      });
      return { ...state, cases };
    }
    case 'REMOVE_DOCUMENT_FROM_CASE': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        return { ...c, documents: (c.documents || []).filter(d => d.id !== action.docId) };
      });
      return { ...state, cases };
    }
    case 'ADD_COMMENT': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        return { ...c, comments: [...(c.comments || []), action.comment] };
      });
      return { ...state, cases };
    }
    case 'RESOLVE_COMMENT': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        const comments = (c.comments || []).map(cmt => cmt.id === action.commentId ? { ...cmt, status: 'resolved' } : cmt);
        return { ...c, comments };
      });
      return { ...state, cases };
    }
    case 'ADVANCE_STAGE': {
      const stages = mx.STAGES;
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        const idx = stages.indexOf(c.stage);
        if (idx < stages.length - 1) return { ...c, stage: stages[idx + 1], daysInStage: 0 };
        return c;
      });
      return { ...state, cases };
    }
    case 'MOVE_TO_STAGE': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        return { ...c, stage: action.stage, daysInStage: 0 };
      });
      return { ...state, cases };
    }
    case 'UPDATE_TEMPLATE': {
      const templates = state.templates.map(t => t.id === action.templateId ? { ...t, ...action.data } : t);
      return { ...state, templates };
    }
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, action.template] };
    case 'DELETE_TEMPLATE':
      return { ...state, templates: state.templates.filter(t => t.id !== action.templateId) };
    case 'ARCHIVE_TEMPLATE': {
      const templates = state.templates.map(t => t.id === action.templateId ? { ...t, archived: true } : t);
      return { ...state, templates };
    }
    case 'UNARCHIVE_TEMPLATE': {
      const templates = state.templates.map(t => t.id === action.templateId ? { ...t, archived: false } : t);
      return { ...state, templates };
    }
    case 'FORK_TEMPLATE': {
      const original = state.templates.find(t => t.id === action.originalId);
      if (!original) return state;
      const forked = { ...JSON.parse(JSON.stringify(original)), id: action.newId, name: `${original.name} (Fork)`, parentId: action.originalId, docs: 0, lastUsed: Date.now() };
      return { ...state, templates: [...state.templates, forked] };
    }
    case 'ADD_TEMPLATE_SECTION': {
      const templates = state.templates.map(t => {
        if (t.id !== action.templateId) return t;
        return { ...t, sections: [...t.sections, action.section] };
      });
      return { ...state, templates };
    }
    case 'UPDATE_TEMPLATE_SECTION': {
      const templates = state.templates.map(t => {
        if (t.id !== action.templateId) return t;
        const sections = t.sections.map((s, i) => i === action.sectionIndex ? { ...s, ...action.data } : s);
        return { ...t, sections };
      });
      return { ...state, templates };
    }
    case 'REMOVE_TEMPLATE_SECTION': {
      const templates = state.templates.map(t => {
        if (t.id !== action.templateId) return t;
        return { ...t, sections: t.sections.filter((_, i) => i !== action.sectionIndex) };
      });
      return { ...state, templates };
    }
    case 'REORDER_TEMPLATE_SECTIONS': {
      const templates = state.templates.map(t => {
        if (t.id !== action.templateId) return t;
        const sections = [...t.sections];
        const [moved] = sections.splice(action.fromIndex, 1);
        sections.splice(action.toIndex, 0, moved);
        return { ...t, sections };
      });
      return { ...state, templates };
    }
    case 'SET_USERS':
      return { ...state, users: action.users };
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.user] };
    case 'SET_FILE_SHARES':
      return { ...state, fileShares: action.shares };
    case 'ADD_FILE_SHARE':
      return { ...state, fileShares: [...state.fileShares, action.share] };
    case 'REVOKE_FILE_SHARE':
      return { ...state, fileShares: state.fileShares.filter(s => s.id !== action.shareId) };
    case 'SHOW_TOAST':
      return { ...state, toast: { message: action.message, isError: action.isError || false } };
    case 'HIDE_TOAST':
      return { ...state, toast: null };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Refs so persistence callbacks always see current values without re-creating
  const connectedRef = useRef(false);
  connectedRef.current = state.connected;
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Session restore ──
  useEffect(() => {
    const session = mx.loadSession();
    if (session?.token && session?.userId) {
      mx.setToken(session.token);
      mx.setUserId(session.userId);
      mx.whoami()
        .then(async () => {
          const role = await mx.determineRole();
          dispatch({ type: 'LOGIN_SUCCESS', user: { userId: session.userId, name: session.name || session.userId }, role });
          loadRemoteData(dispatch);
        })
        .catch(() => { mx.clearSession(); });
    }
  }, []);

  // ── Navigation ──
  const navigate = useCallback((screen) => dispatch({ type: 'NAVIGATE', screen }), []);
  const goBack = useCallback(() => dispatch({ type: 'GO_BACK' }), []);

  const showToast = useCallback((message, isError = false) => {
    dispatch({ type: 'SHOW_TOAST', message, isError });
    setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 3000);
  }, []);

  // ── Open case: navigate AND load per-case data from Matrix ──
  const openCase = useCallback(async (caseId) => {
    dispatch({ type: 'SET_ACTIVE_CASE', caseId });
    dispatch({ type: 'NAVIGATE', screen: SCREENS.WORKSPACE });

    if (!connectedRef.current) return;

    dispatch({ type: 'SET_CASE_LOADING', loading: true });
    try {
      const { variables, documents, comments } = await mx.loadCaseData(caseId);
      if (Object.keys(variables).length > 0) {
        dispatch({ type: 'SET_CASE_VARIABLES', caseId, variables });
      }
      if (documents.length > 0) {
        dispatch({ type: 'SET_CASE_DOCUMENTS', caseId, documents });
      }
      if (comments.length > 0) {
        dispatch({ type: 'SET_CASE_COMMENTS', caseId, comments });
      }
    } catch (e) {
      console.warn('Failed to load case room data (room may not exist yet):', e);
    } finally {
      dispatch({ type: 'SET_CASE_LOADING', loading: false });
    }
  }, []);

  const openTemplate = useCallback((templateId) => {
    dispatch({ type: 'SET_ACTIVE_TEMPLATE', templateId });
    dispatch({ type: 'NAVIGATE', screen: SCREENS.TEMPLATE_EDIT });
  }, []);

  // ── Auth ──
  const doLogin = useCallback(async (username, password) => {
    dispatch({ type: 'SET_LOGIN_LOADING', loading: true });
    try {
      const { userId, token } = await mx.login(username, password);
      const role = await mx.determineRole();
      mx.saveSession({ userId, token, name: username, ts: Date.now() });
      dispatch({ type: 'LOGIN_SUCCESS', user: { userId, name: username }, role });
      loadRemoteData(dispatch);
    } catch (e) {
      dispatch({ type: 'LOGIN_ERROR', error: e.message });
    }
  }, []);

  const doRegister = useCallback(async (username, password, displayName) => {
    dispatch({ type: 'SET_LOGIN_LOADING', loading: true });
    try {
      const { userId, token } = await mx.register(username, password, displayName);
      const role = await mx.determineRole();
      mx.saveSession({ userId, token, name: displayName || username, ts: Date.now() });
      dispatch({ type: 'LOGIN_SUCCESS', user: { userId, name: displayName || username }, role });
      // Join data room so new user has access to shared data
      try { await mx.ensureDataRoom(); } catch { /* may not exist yet */ }
      loadRemoteData(dispatch);
    } catch (e) {
      dispatch({ type: 'LOGIN_ERROR', error: e.message });
    }
  }, []);

  const enterDemo = useCallback(() => dispatch({ type: 'ENTER_DEMO' }), []);

  // ── Case operations (dispatch + auto-persist to Matrix) ──

  const createCase = useCallback(async (caseData) => {
    const id = `case_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Auto-populate documents from doc types if none provided
    let documents = caseData.documents || [];
    if (documents.length === 0) {
      const docTypes = stateRef.current.refData?.doc_type || [];
      if (docTypes.length > 0) {
        documents = getDefaultDocuments(docTypes, stateRef.current.templates);
      }
    }

    // Build cascade variables from facility if facilityId is provided
    let cascadeVars = {};
    if (caseData.facilityId && Object.keys(stateRef.current.refData).length > 0) {
      const rd = stateRef.current.refData;
      const result = buildCascadeFromFacility(caseData.facilityId, {
        facilities: rd.facility || [],
        fieldOffices: rd.field_office || [],
        wardens: rd.warden || [],
        courts: rd.court || [],
        officials: rd.official || [],
        attorneys: rd.attorney || [],
      });
      cascadeVars = result.variables || {};
    }

    // Build country variables if countryId provided
    if (caseData.countryId && stateRef.current.refData?.country) {
      const countryVars = buildCountryVariables(caseData.countryId, stateRef.current.refData.country);
      cascadeVars = { ...cascadeVars, ...countryVars };
    }

    // Build attorney variables if leadAttorneyId provided
    if (caseData.leadAttorneyId && stateRef.current.refData?.attorney) {
      const attorney = stateRef.current.refData.attorney.find(a => a.id === caseData.leadAttorneyId);
      if (attorney) {
        cascadeVars = { ...cascadeVars, ...buildAttorneyVariables(attorney, 1) };
      }
    }

    const variables = { ...cascadeVars, ...caseData.variables };

    const newCase = {
      id, ...caseData,
      owner: mx.getUserId() || stateRef.current.user?.userId,
      lastUpdated: new Date().toISOString(),
      documents,
      comments: [],
      variables,
      daysInStage: 0,
    };
    dispatch({ type: 'ADD_CASE', caseData: newCase });

    if (connectedRef.current) {
      try {
        await mx.saveCaseMetadata(id, {
          petitionerName: newCase.petitionerName, stage: newCase.stage,
          circuit: newCase.circuit, facility: newCase.facility,
          facilityId: newCase.facilityId, facilityLocation: newCase.facilityLocation,
          courtId: newCase.courtId, countryId: newCase.countryId,
          detentionStatuteId: newCase.detentionStatuteId,
          chargeIds: newCase.chargeIds, leadAttorneyId: newCase.leadAttorneyId,
          daysInStage: 0,
          owner: newCase.owner, docReadiness: getDocReadiness(newCase.documents),
        });
        if (Object.keys(newCase.variables).length > 0) {
          await mx.saveCaseVariables(id, newCase.variables);
        }
        for (const doc of newCase.documents) {
          await mx.saveCaseDocument(id, doc.id, doc);
        }
      } catch (e) {
        showToast('Case created locally (sync failed)', true);
      }
    }
    return id;
  }, [showToast]);

  const advanceStage = useCallback(async (caseId) => {
    const c = stateRef.current.cases.find(x => x.id === caseId);
    if (!c) return;
    const idx = mx.STAGES.indexOf(c.stage);
    if (idx >= mx.STAGES.length - 1) return;
    const newStage = mx.STAGES[idx + 1];
    dispatch({ type: 'ADVANCE_STAGE', caseId });
    if (connectedRef.current) {
      try { await mx.saveCaseMetadata(caseId, { ...c, stage: newStage, daysInStage: 0 }); } catch (e) { console.warn(e); }
    }
    return newStage;
  }, []);

  const moveCaseToStage = useCallback(async (caseId, newStage) => {
    dispatch({ type: 'MOVE_TO_STAGE', caseId, stage: newStage });
    if (connectedRef.current) {
      const c = stateRef.current.cases.find(x => x.id === caseId);
      if (c) {
        try { await mx.saveCaseMetadata(caseId, { ...c, stage: newStage, daysInStage: 0 }); } catch (e) { console.warn(e); }
      }
    }
  }, []);

  const updateCaseVariable = useCallback(async (caseId, key, value) => {
    dispatch({ type: 'UPDATE_CASE_VARIABLE', caseId, key, value });
    if (connectedRef.current) {
      const c = stateRef.current.cases.find(x => x.id === caseId);
      const updated = { ...(c?.variables || {}), [key]: value };
      try { await mx.saveCaseVariables(caseId, updated); } catch (e) { console.warn(e); }
    }
  }, []);

  const updateDocOverride = useCallback(async (caseId, docId, key, value) => {
    dispatch({ type: 'UPDATE_DOCUMENT_OVERRIDE', caseId, docId, key, value });
    if (connectedRef.current) {
      const c = stateRef.current.cases.find(x => x.id === caseId);
      const doc = (c?.documents || []).find(d => d.id === docId);
      if (doc) {
        const overrides = { ...(doc.variableOverrides || {}), [key]: value };
        try { await mx.saveCaseDocument(caseId, docId, { ...doc, variableOverrides: overrides }); } catch (e) { console.warn(e); }
      }
    }
  }, []);

  const updateDocStatus = useCallback(async (caseId, docId, status) => {
    dispatch({ type: 'UPDATE_DOCUMENT_STATUS', caseId, docId, status });
    if (connectedRef.current) {
      const c = stateRef.current.cases.find(x => x.id === caseId);
      const doc = (c?.documents || []).find(d => d.id === docId);
      if (doc) {
        try {
          await mx.saveCaseDocument(caseId, docId, { ...doc, status });
          const updatedDocs = (c.documents || []).map(d => d.id === docId ? { ...d, status } : d);
          await mx.saveCaseMetadata(caseId, { ...c, docReadiness: getDocReadiness(updatedDocs) });
        } catch (e) { console.warn(e); }
      }
    }
  }, []);

  const addDocToCase = useCallback(async (caseId, template) => {
    const docId = `doc_${Date.now()}`;
    const doc = { id: docId, templateId: template.id, name: template.name, status: 'draft', variableOverrides: {}, sections: [] };
    dispatch({ type: 'ADD_DOCUMENT_TO_CASE', caseId, doc });
    if (connectedRef.current) {
      try {
        await mx.saveCaseDocument(caseId, docId, doc);
        const c = stateRef.current.cases.find(x => x.id === caseId);
        if (c) await mx.saveCaseMetadata(caseId, { ...c, docReadiness: getDocReadiness([...(c.documents || []), doc]) });
      } catch (e) { console.warn(e); }
    }
    return docId;
  }, []);

  const addComment = useCallback(async (caseId, comment) => {
    dispatch({ type: 'ADD_COMMENT', caseId, comment });
    if (connectedRef.current) {
      try { await mx.saveCaseComment(caseId, comment.id, comment); } catch (e) { console.warn(e); }
    }
  }, []);

  const resolveComment = useCallback(async (caseId, commentId) => {
    dispatch({ type: 'RESOLVE_COMMENT', caseId, commentId });
    if (connectedRef.current) {
      try { await mx.saveCaseComment(caseId, commentId, { status: 'resolved' }); } catch (e) { console.warn(e); }
    }
  }, []);

  // ── Template operations ──

  const createTemplate = useCallback(async (templateData) => {
    const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const template = { id, ...templateData, parentId: templateData.parentId || null, docs: 0, lastUsed: Date.now() };
    dispatch({ type: 'ADD_TEMPLATE', template });
    if (connectedRef.current) {
      try { await mx.saveTemplate(id, template); } catch (e) { console.warn(e); }
    }
    return id;
  }, []);

  const saveTemplateNow = useCallback(async (templateId) => {
    if (!connectedRef.current) { showToast('Template saved (local only)'); return; }
    const tpl = stateRef.current.templates.find(t => t.id === templateId);
    if (!tpl) return;
    try {
      await mx.saveTemplate(templateId, tpl);
      showToast('Template saved to server');
    } catch (e) {
      showToast('Failed to save template: ' + e.message, true);
    }
  }, [showToast]);

  const forkTemplate = useCallback(async (originalId) => {
    const newId = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    dispatch({ type: 'FORK_TEMPLATE', originalId, newId });
    if (connectedRef.current) {
      setTimeout(async () => {
        const forked = stateRef.current.templates.find(t => t.id === newId);
        if (forked) { try { await mx.saveTemplate(newId, forked); } catch (e) { console.warn(e); } }
      }, 50);
    }
    return newId;
  }, []);

  const deleteTemplate = useCallback(async (templateId) => {
    dispatch({ type: 'DELETE_TEMPLATE', templateId });
    if (connectedRef.current) {
      try { await mx.deleteTemplate(templateId); } catch (e) { console.warn(e); }
    }
  }, []);

  const inviteAttorneyToCase = useCallback(async (caseId, userId) => {
    if (!connectedRef.current) { showToast('Not connected', true); return; }
    try { await mx.inviteToCase(caseId, userId); showToast('Attorney invited'); }
    catch (e) { showToast('Failed to invite: ' + e.message, true); }
  }, [showToast]);

  // ── File sharing ──

  const shareFiles = useCallback(async ({ caseId, documentIds, recipientUserId, recipientName, message, permission }) => {
    const shareId = `share_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const c = stateRef.current.cases.find(x => x.id === caseId);
    const docs = (c?.documents || []).filter(d => documentIds.includes(d.id));

    const share = {
      id: shareId,
      caseId,
      caseName: c?.petitionerName || 'Unknown Case',
      documentIds,
      documentNames: docs.map(d => d.name),
      sharedBy: mx.getUserId() || stateRef.current.user?.userId,
      sharedByName: stateRef.current.user?.name || 'Unknown',
      sharedWith: recipientUserId,
      sharedWithName: recipientName || recipientUserId,
      message: message || '',
      permission: permission || 'view', // 'view' or 'comment'
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_FILE_SHARE', share });

    if (connectedRef.current) {
      try {
        await mx.saveFileShare(shareId, share);
        // Invite recipient to the case room so they can access the documents
        await mx.inviteToCase(caseId, recipientUserId);
      } catch {
        showToast('Shared locally (sync failed)', true);
      }
    }

    showToast(`Files shared with ${recipientName || recipientUserId}`);
    return shareId;
  }, [showToast]);

  const revokeFileShare = useCallback(async (shareId) => {
    dispatch({ type: 'REVOKE_FILE_SHARE', shareId });
    if (connectedRef.current) {
      try { await mx.deleteFileShare(shareId); } catch (e) { console.warn(e); }
    }
    showToast('Share revoked');
  }, [showToast]);

  const loadFileShares = useCallback(async () => {
    if (!connectedRef.current) return;
    try {
      const shares = await mx.loadFileShares();
      dispatch({ type: 'SET_FILE_SHARES', shares });
    } catch (e) {
      console.warn('Failed to load file shares:', e);
    }
  }, []);

  // ── Archive operations ──

  const archiveCase = useCallback(async (caseId) => {
    dispatch({ type: 'ARCHIVE_CASE', caseId });
    if (connectedRef.current) {
      const c = stateRef.current.cases.find(x => x.id === caseId);
      if (c) {
        try { await mx.saveCaseMetadata(caseId, { ...c, archived: true }); } catch (e) { console.warn(e); }
      }
    }
    showToast('Case archived');
  }, [showToast]);

  const unarchiveCase = useCallback(async (caseId) => {
    dispatch({ type: 'UNARCHIVE_CASE', caseId });
    if (connectedRef.current) {
      const c = stateRef.current.cases.find(x => x.id === caseId);
      if (c) {
        try { await mx.saveCaseMetadata(caseId, { ...c, archived: false }); } catch (e) { console.warn(e); }
      }
    }
    showToast('Case unarchived');
  }, [showToast]);

  const archiveTemplate = useCallback(async (templateId) => {
    dispatch({ type: 'ARCHIVE_TEMPLATE', templateId });
    if (connectedRef.current) {
      const tpl = stateRef.current.templates.find(t => t.id === templateId);
      if (tpl) {
        try { await mx.saveTemplate(templateId, { ...tpl, archived: true }); } catch (e) { console.warn(e); }
      }
    }
    showToast('Template archived');
  }, [showToast]);

  const unarchiveTemplate = useCallback(async (templateId) => {
    dispatch({ type: 'UNARCHIVE_TEMPLATE', templateId });
    if (connectedRef.current) {
      const tpl = stateRef.current.templates.find(t => t.id === templateId);
      if (tpl) {
        try { await mx.saveTemplate(templateId, { ...tpl, archived: false }); } catch (e) { console.warn(e); }
      }
    }
    showToast('Template unarchived');
  }, [showToast]);

  // ── User management (admin only) ──

  const createUser = useCallback(async ({ username, email, displayName, makeAdmin }) => {
    const userId = `@${username}:app.aminoimmigration.com`;
    const newUser = {
      userId,
      username,
      displayName: displayName || username,
      email,
      isAdmin: makeAdmin || false,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    if (connectedRef.current) {
      try {
        // Generate a temporary password (user would reset on first login)
        const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        await mx.registerUser(username, tempPassword, displayName || username);
        await mx.inviteUserToDataRoom(userId);
        if (makeAdmin) {
          await mx.inviteUserToAdminRoom(userId);
        }
      } catch (e) {
        showToast('Failed to create user: ' + e.message, true);
        return null;
      }
    }

    dispatch({ type: 'ADD_USER', user: newUser });
    showToast(`User ${displayName || username} created`);
    return userId;
  }, [showToast]);

  const inviteUser = useCallback(async ({ username, email, displayName, makeAdmin }) => {
    const userId = `@${username}:app.aminoimmigration.com`;
    const newUser = {
      userId,
      username,
      displayName: displayName || username,
      email,
      isAdmin: makeAdmin || false,
      status: 'invited',
      createdAt: new Date().toISOString(),
    };

    if (connectedRef.current) {
      try {
        await mx.inviteUserToDataRoom(userId);
        if (makeAdmin) {
          await mx.inviteUserToAdminRoom(userId);
        }
      } catch (e) {
        showToast('Failed to invite user: ' + e.message, true);
        return null;
      }
    }

    dispatch({ type: 'ADD_USER', user: newUser });
    showToast(`Invitation sent to ${displayName || username}`);
    return userId;
  }, [showToast]);

  const loadUsers = useCallback(async () => {
    if (!connectedRef.current) return;
    try {
      const users = await mx.listUsers();
      dispatch({ type: 'SET_USERS', users });
    } catch (e) {
      console.warn('Failed to load users:', e);
    }
  }, []);

  const value = {
    state, dispatch, navigate, goBack, showToast,
    openCase, openTemplate,
    doLogin, doRegister, enterDemo,
    createCase, advanceStage, updateCaseVariable, updateDocStatus, updateDocOverride,
    addDocToCase, addComment, resolveComment, moveCaseToStage,
    createTemplate, saveTemplateNow, forkTemplate, deleteTemplate,
    inviteAttorneyToCase,
    shareFiles, revokeFileShare, loadFileShares,
    archiveCase, unarchiveCase, archiveTemplate, unarchiveTemplate,
    createUser, inviteUser, loadUsers,
    SCREENS,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

async function loadRemoteData(dispatch) {
  try {
    dispatch({ type: 'SET_LOADING', loading: true });
    const [templates, caseMetadata, refData, fileShares] = await Promise.allSettled([
      mx.loadTemplates(), mx.loadCaseMetadata(), mx.loadRefData(), mx.loadFileShares(),
    ]);
    if (templates.status === 'fulfilled' && templates.value.length > 0) {
      dispatch({ type: 'SET_TEMPLATES', templates: templates.value });
    }
    if (caseMetadata.status === 'fulfilled' && caseMetadata.value.length > 0) {
      dispatch({ type: 'SET_CASES', cases: caseMetadata.value.map(m => ({
        ...m, documents: m.documents || [], comments: m.comments || [], variables: m.variables || {},
      })) });
    }
    if (refData.status === 'fulfilled') {
      dispatch({ type: 'SET_REF_DATA', refData: refData.value });
    }
    if (fileShares.status === 'fulfilled' && fileShares.value.length > 0) {
      dispatch({ type: 'SET_FILE_SHARES', shares: fileShares.value });
    }
  } catch (e) {
    console.warn('Failed to load remote data:', e);
  } finally {
    dispatch({ type: 'SET_LOADING', loading: false });
  }
}

function getDocReadiness(documents) {
  if (!documents || documents.length === 0) return { ready: 0, total: 0 };
  return { ready: documents.filter(d => d.status === 'ready' || d.status === 'filed').length, total: documents.length };
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { SCREENS };
