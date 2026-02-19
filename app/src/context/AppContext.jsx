import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { SEED_CASES, SEED_PIPELINE_EXTRA, SEED_TEMPLATES, SEED_REF_DATA, SEED_USERS, buildCascadeFromFacility, buildAttorneyVariables, buildCountryVariables, getDefaultDocuments } from '../lib/seedData';
import * as mx from '../lib/matrix';

const AppContext = createContext(null);
const DEFAULT_TEMPLATE_ID = 'tpl_hc_general';

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
  VARIABLES_REF: 'variables_ref',
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
    case 'ENTER_DEMO':
      return { ...state, isLoggedIn: true, user: { userId: '@demo:local', name: 'Demo User' }, role: 'admin', screen: SCREENS.DASHBOARD, cases: [...SEED_CASES, ...SEED_PIPELINE_EXTRA], templates: [...SEED_TEMPLATES], users: [...SEED_USERS], refData: { ...SEED_REF_DATA }, connected: false };
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
    case 'UPSERT_REF_RECORD': {
      const currentRows = state.refData[action.refType] || [];
      const rowExists = currentRows.some(r => r.id === action.record.id);
      return {
        ...state,
        refData: {
          ...state.refData,
          [action.refType]: rowExists
            ? currentRows.map(r => (r.id === action.record.id ? action.record : r))
            : [...currentRows, action.record],
        },
      };
    }
    case 'DELETE_REF_RECORD': {
      const currentRows = state.refData[action.refType] || [];
      return {
        ...state,
        refData: {
          ...state.refData,
          [action.refType]: currentRows.filter(r => r.id !== action.id),
        },
      };
    }
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
    case 'UPDATE_DOCUMENT_CONTENT': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        const documents = (c.documents || []).map(d =>
          d.id === action.docId ? { ...d, importedContent: action.content } : d
        );
        return { ...c, documents };
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
      if (action.templateId === DEFAULT_TEMPLATE_ID) return state;
      return { ...state, templates: state.templates.filter(t => t.id !== action.templateId) };
    case 'ARCHIVE_TEMPLATE': {
      if (action.templateId === DEFAULT_TEMPLATE_ID) return state;
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
    case 'REMOVE_USER':
      return { ...state, users: state.users.filter(u => u.userId !== action.userId) };
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
          loadRemoteData(dispatch, role);
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
      loadRemoteData(dispatch, role);
    } catch (e) {
      dispatch({ type: 'LOGIN_ERROR', error: e.message });
    }
  }, []);

  const doRegister = useCallback(async (username, password, displayName) => {
    dispatch({ type: 'SET_LOGIN_LOADING', loading: true });
    try {
      const { userId, token } = await mx.selfRegister(username, password, displayName);
      // Try to join data room after registration
      try { await mx.ensureDataRoom(); } catch { /* room may not exist yet */ }
      const role = await mx.determineRole();
      mx.saveSession({ userId, token, name: displayName || username, ts: Date.now() });
      dispatch({ type: 'LOGIN_SUCCESS', user: { userId, name: displayName || username }, role });
      loadRemoteData(dispatch, role);
    } catch (e) {
      dispatch({ type: 'LOGIN_ERROR', error: e.message });
    }
  }, []);

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    if (!connectedRef.current) { showToast('Not connected to server', true); return false; }
    try {
      await mx.changePassword(oldPassword, newPassword);
      showToast('Password changed successfully');
      return true;
    } catch (e) {
      showToast('Failed to change password: ' + e.message, true);
      return false;
    }
  }, [showToast]);

  const enterDemo = useCallback(() => dispatch({ type: 'ENTER_DEMO' }), []);

  // ── Case operations (dispatch + auto-persist to Matrix) ──

  const createCase = useCallback(async (caseData) => {
    const id = `case_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const defaultTemplate = stateRef.current.templates.find((template) => template.id === DEFAULT_TEMPLATE_ID);

    // Auto-populate documents from doc types if none provided
    let documents = caseData.documents || [];
    if (documents.length === 0) {
      if (defaultTemplate) {
        documents = [{
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          templateId: defaultTemplate.id,
          name: defaultTemplate.name,
          status: 'draft',
          variableOverrides: {},
          sections: [],
          renderMode: defaultTemplate.renderMode || 'html_semantic',
          sourceHtml: defaultTemplate.sourceHtml || null,
          sourceText: defaultTemplate.sourceText || null,
        }];
      } else {
        const docTypes = stateRef.current.refData?.doc_type || [];
        if (docTypes.length > 0) {
          documents = getDefaultDocuments(docTypes, stateRef.current.templates);
        }
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

    const templateVars = collectTemplateVariablesForDocuments(documents, stateRef.current.templates);
    const variables = { ...templateVars, ...cascadeVars, ...caseData.variables };

    const newCase = {
      id, ...caseData,
      templateId: caseData.templateId || defaultTemplate?.id || null,
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

  const mergeCaseVariables = useCallback(async (caseId, variables) => {
    if (!variables || Object.keys(variables).length === 0) return;
    dispatch({ type: 'MERGE_CASE_VARIABLES', caseId, variables });
    if (connectedRef.current) {
      const c = stateRef.current.cases.find(x => x.id === caseId);
      if (c) {
        const updated = { ...(c.variables || {}), ...variables };
        try { await mx.saveCaseVariables(caseId, updated); } catch (e) { console.warn(e); }
      }
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
    const doc = { id: docId, templateId: template.id, name: template.name, status: 'draft', variableOverrides: {}, sections: [], renderMode: template.renderMode || 'html_semantic', sourceHtml: template.sourceHtml || null, sourceText: template.sourceText || null };
    const templateVars = buildVariableRecordFromTemplate(template);
    dispatch({ type: 'ADD_DOCUMENT_TO_CASE', caseId, doc });
    if (Object.keys(templateVars).length > 0) {
      dispatch({ type: 'MERGE_CASE_VARIABLES', caseId, variables: templateVars });
    }
    if (connectedRef.current) {
      try {
        await mx.saveCaseDocument(caseId, docId, doc);
        const c = stateRef.current.cases.find(x => x.id === caseId);
        if (c) {
          await mx.saveCaseMetadata(caseId, { ...c, docReadiness: getDocReadiness([...(c.documents || []), doc]) });
          if (Object.keys(templateVars).length > 0) {
            const mergedVariables = { ...(c.variables || {}), ...templateVars };
            await mx.saveCaseVariables(caseId, mergedVariables);
          }
        }
      } catch (e) { console.warn(e); }
    }
    return docId;
  }, []);

  const importDocToCase = useCallback(async (caseId, { name, content, fileType, sourceDataUrl, sourceHtml = null, sourceText = null, renderMode = 'html_semantic' }) => {
    const docId = `doc_${Date.now()}`;
    const doc = {
      id: docId, templateId: null, name, status: 'draft',
      variableOverrides: {}, sections: [],
      imported: true, fileType, importedContent: content, sourceDataUrl, sourceHtml, sourceText: sourceText || content || null, renderMode,
    };
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

  const updateDocContent = useCallback(async (caseId, docId, content) => {
    dispatch({ type: 'UPDATE_DOCUMENT_CONTENT', caseId, docId, content });
    if (connectedRef.current) {
      const c = stateRef.current.cases.find(x => x.id === caseId);
      const doc = (c?.documents || []).find(d => d.id === docId);
      if (doc) {
        try { await mx.saveCaseDocument(caseId, docId, { ...doc, importedContent: content }); } catch (e) { console.warn(e); }
      }
    }
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
    if (templateId === DEFAULT_TEMPLATE_ID) return;
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
    if (templateId === DEFAULT_TEMPLATE_ID) return;
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

  const removeUser = useCallback(async (userId) => {
    if (connectedRef.current) {
      try {
        await mx.deactivateUser(userId);
      } catch (e) {
        showToast('Failed to remove user: ' + e.message, true);
        return false;
      }
    }
    dispatch({ type: 'REMOVE_USER', userId });
    showToast('User removed');
    return true;
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

  const upsertRefRecord = useCallback(async (refType, record) => {
    dispatch({ type: 'UPSERT_REF_RECORD', refType, record });
    if (connectedRef.current) {
      try {
        const { id, ...data } = record;
        await mx.saveRefRecord(refType, id, data);
      } catch (e) {
        console.warn(e);
        showToast(`Failed to save ${refType} record: ${e.message}`, true);
      }
    }
  }, [showToast]);

  const deleteRefRecord = useCallback(async (refType, id) => {
    dispatch({ type: 'DELETE_REF_RECORD', refType, id });
    if (connectedRef.current) {
      try {
        await mx.deleteRefRecord(refType, id);
      } catch (e) {
        console.warn(e);
        showToast(`Failed to delete ${refType} record: ${e.message}`, true);
      }
    }
  }, [showToast]);

  const removeDocFromCase = useCallback(async (caseId, docId) => {
    dispatch({ type: 'REMOVE_DOCUMENT_FROM_CASE', caseId, docId });
    if (connectedRef.current) {
      try {
        await mx.saveCaseDocument(caseId, docId, { _deleted: true });
        const c = stateRef.current.cases.find(x => x.id === caseId);
        if (c) {
          const remaining = (c.documents || []).filter(d => d.id !== docId);
          await mx.saveCaseMetadata(caseId, { ...c, docReadiness: getDocReadiness(remaining) });
        }
      } catch (e) { console.warn(e); }
    }
    showToast('Document removed');
  }, [showToast]);

  const deleteCase = useCallback(async (caseId) => {
    dispatch({ type: 'DELETE_CASE', caseId });
    if (connectedRef.current) {
      try { await mx.deleteCaseMetadata(caseId); } catch (e) { console.warn(e); }
    }
    showToast('Case deleted');
  }, [showToast]);

  const getCaseSharedUsers = useCallback(async (caseId) => {
    if (!connectedRef.current) {
      // Demo mode: return empty
      return [];
    }
    try {
      const members = await mx.getCaseMembers(caseId);
      return members;
    } catch {
      return [];
    }
  }, []);

  const value = {
    state, dispatch, navigate, goBack, showToast,
    openCase, openTemplate,
    doLogin, doRegister, enterDemo, changePassword,
    createCase, advanceStage, updateCaseVariable, mergeCaseVariables, updateDocStatus, updateDocOverride,
    addDocToCase, importDocToCase, updateDocContent, addComment, resolveComment, moveCaseToStage,
    removeDocFromCase, deleteCase,
    createTemplate, saveTemplateNow, forkTemplate, deleteTemplate,
    inviteAttorneyToCase, getCaseSharedUsers,
    archiveCase, unarchiveCase, archiveTemplate, unarchiveTemplate,
    createUser, inviteUser, removeUser, loadUsers,
    upsertRefRecord, deleteRefRecord,
    SCREENS,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

async function loadRemoteData(dispatch, role) {
  try {
    dispatch({ type: 'SET_LOADING', loading: true });
    const [templates, caseMetadata, refData] = await Promise.allSettled([
      mx.loadTemplates(), mx.loadCaseMetadata(), mx.loadRefData(),
    ]);
    // Templates are shared with all users; ensure seeded repo templates are always available and active.
    if (templates.status === 'fulfilled') {
      dispatch({ type: 'SET_TEMPLATES', templates: mergeTemplatesWithSeed(templates.value || []) });
    } else {
      dispatch({ type: 'SET_TEMPLATES', templates: mergeTemplatesWithSeed([]) });
    }
    if (refData.status === 'fulfilled') {
      dispatch({ type: 'SET_REF_DATA', refData: refData.value });
    }
    // Case metadata: admins see all, partners see only their own cases
    if (caseMetadata.status === 'fulfilled' && caseMetadata.value.length > 0) {
      const userId = mx.getUserId();
      const isAdmin = role === 'admin';
      const visibleCases = isAdmin
        ? caseMetadata.value
        : caseMetadata.value.filter(m => m.owner === userId);
      dispatch({ type: 'SET_CASES', cases: visibleCases.map(m => ({
        ...m, documents: m.documents || [], comments: m.comments || [], variables: m.variables || {},
      })) });
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

function mergeTemplatesWithSeed(remoteTemplates) {
  const filteredRemote = (remoteTemplates || []).filter((template) => template.id !== DEFAULT_TEMPLATE_ID);
  const uniqueRemoteById = new Map(filteredRemote.map((template) => [template.id, template]));
  const pinnedSeedTemplates = SEED_TEMPLATES.map((seedTemplate) => {
    if (seedTemplate.id === DEFAULT_TEMPLATE_ID) {
      return { ...seedTemplate, archived: false };
    }

    const remote = uniqueRemoteById.get(seedTemplate.id);
    if (!remote) return { ...seedTemplate, archived: false };
    uniqueRemoteById.delete(seedTemplate.id);
    return { ...remote, ...seedTemplate, archived: false };
  });

  return [...pinnedSeedTemplates, ...Array.from(uniqueRemoteById.values())];
}

function extractTemplateVariableKeys(template) {
  if (!template) return [];
  const sectionVariables = (template.sections || []).flatMap((section) =>
    Array.from((section.content || '').matchAll(/\{\{([A-Z_0-9]+)\}\}/g)).map((match) => match[1]),
  );
  const fieldVariables = (template.fields || []).map((field) => field.key).filter(Boolean);
  const htmlVariables = Array.from((template.sourceHtml || '').matchAll(/\{\{([A-Z_0-9]+)\}\}/g)).map((match) => match[1]);
  const textVariables = Array.from((template.sourceText || '').matchAll(/\{\{([A-Z_0-9]+)\}\}/g)).map((match) => match[1]);
  return Array.from(new Set([...(template.variables || []), ...fieldVariables, ...sectionVariables, ...htmlVariables, ...textVariables]));
}

function buildVariableRecordFromTemplate(template) {
  return Object.fromEntries(extractTemplateVariableKeys(template).map((key) => [key, '']));
}

function collectTemplateVariablesForDocuments(documents, templates) {
  const templateById = new Map((templates || []).map((template) => [template.id, template]));
  return (documents || []).reduce((acc, doc) => {
    if (!doc.templateId) return acc;
    const template = templateById.get(doc.templateId);
    if (!template) return acc;
    return { ...acc, ...buildVariableRecordFromTemplate(template) };
  }, {});
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { SCREENS };
