import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { SEED_CASES, SEED_PIPELINE_EXTRA, SEED_TEMPLATES } from '../lib/seedData';
import * as mx from '../lib/matrix';

const AppContext = createContext(null);

const SCREENS = {
  LOGIN: 'login',
  CASES: 'cases',
  WORKSPACE: 'workspace',
  TEMPLATES: 'templates',
  TEMPLATE_EDIT: 'template_edit',
  PIPELINE: 'pipeline',
};

const initialState = {
  screen: SCREENS.LOGIN,
  history: [],
  // Auth
  user: null,
  role: 'partner',
  isLoggedIn: false,
  loginError: null,
  loginLoading: false,
  // Data
  cases: [],
  templates: [],
  refData: {},
  // Current selections
  activeCaseId: null,
  activeDocIndex: 0,
  activeTemplateId: null,
  activeTemplateSection: 0,
  // UI
  loading: false,
  toast: null,
  // Connectivity
  connected: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, history: [...state.history, state.screen], screen: action.screen };
    case 'GO_BACK': {
      const h = [...state.history];
      const prev = h.pop() || SCREENS.CASES;
      return { ...state, screen: prev, history: h };
    }
    case 'SET_LOGIN_LOADING':
      return { ...state, loginLoading: action.loading };
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.user, role: action.role || 'partner', isLoggedIn: true, loginError: null, loginLoading: false, screen: SCREENS.CASES, connected: true };
    case 'LOGIN_ERROR':
      return { ...state, loginError: action.error, loginLoading: false };
    case 'ENTER_DEMO':
      return {
        ...state,
        isLoggedIn: true,
        user: { userId: '@demo:local', name: 'Demo User' },
        role: 'admin',
        screen: SCREENS.CASES,
        cases: [...SEED_CASES, ...SEED_PIPELINE_EXTRA],
        templates: [...SEED_TEMPLATES],
        connected: false,
      };
    case 'LOGOUT': {
      mx.clearSession();
      return { ...initialState };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_CONNECTED':
      return { ...state, connected: action.connected };
    case 'SET_CASES':
      return { ...state, cases: action.cases };
    case 'MERGE_CASES': {
      // Merge remote cases with local, preferring remote for existing IDs
      const existing = new Map(state.cases.map(c => [c.id, c]));
      action.cases.forEach(c => existing.set(c.id, { ...existing.get(c.id), ...c }));
      return { ...state, cases: Array.from(existing.values()) };
    }
    case 'SET_TEMPLATES':
      return { ...state, templates: action.templates };
    case 'MERGE_TEMPLATES': {
      const existing = new Map(state.templates.map(t => [t.id, t]));
      action.templates.forEach(t => existing.set(t.id, { ...existing.get(t.id), ...t }));
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
    case 'UPDATE_CASE_VARIABLE': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        return { ...c, variables: { ...c.variables, [action.key]: action.value } };
      });
      return { ...state, cases };
    }
    case 'UPDATE_DOCUMENT_STATUS': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        const documents = c.documents.map(d =>
          d.id === action.docId ? { ...d, status: action.status } : d
        );
        return { ...c, documents };
      });
      return { ...state, cases };
    }
    case 'ADD_DOCUMENT_TO_CASE': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        return { ...c, documents: [...c.documents, action.doc] };
      });
      return { ...state, cases };
    }
    case 'REMOVE_DOCUMENT_FROM_CASE': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        return { ...c, documents: c.documents.filter(d => d.id !== action.docId) };
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
    case 'UPDATE_COMMENT': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        const comments = (c.comments || []).map(cmt =>
          cmt.id === action.commentId ? { ...cmt, ...action.data } : cmt
        );
        return { ...c, comments };
      });
      return { ...state, cases };
    }
    case 'RESOLVE_COMMENT': {
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        const comments = (c.comments || []).map(cmt =>
          cmt.id === action.commentId ? { ...cmt, status: 'resolved' } : cmt
        );
        return { ...c, comments };
      });
      return { ...state, cases };
    }
    case 'ADVANCE_STAGE': {
      const stages = mx.STAGES;
      const cases = state.cases.map(c => {
        if (c.id !== action.caseId) return c;
        const idx = stages.indexOf(c.stage);
        if (idx < stages.length - 1) {
          return { ...c, stage: stages[idx + 1], daysInStage: 0 };
        }
        return c;
      });
      return { ...state, cases };
    }
    case 'UPDATE_TEMPLATE': {
      const templates = state.templates.map(t =>
        t.id === action.templateId ? { ...t, ...action.data } : t
      );
      return { ...state, templates };
    }
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, action.template] };
    case 'DELETE_TEMPLATE':
      return { ...state, templates: state.templates.filter(t => t.id !== action.templateId) };
    case 'FORK_TEMPLATE': {
      const original = state.templates.find(t => t.id === action.originalId);
      if (!original) return state;
      const forked = {
        ...JSON.parse(JSON.stringify(original)),
        id: action.newId,
        name: `${original.name} (Fork)`,
        docs: 0,
        lastUsed: Date.now(),
      };
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
        const sections = t.sections.map((s, i) =>
          i === action.sectionIndex ? { ...s, ...action.data } : s
        );
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

  // Try to restore session on mount
  useEffect(() => {
    const session = mx.loadSession();
    if (session?.token && session?.userId) {
      mx.setToken(session.token);
      mx.setUserId(session.userId);
      // Validate the session
      mx.whoami()
        .then(async () => {
          const role = await mx.determineRole();
          dispatch({
            type: 'LOGIN_SUCCESS',
            user: { userId: session.userId, name: session.name || session.userId },
            role,
          });
          // Load data from Matrix
          loadRemoteData(dispatch);
        })
        .catch(() => {
          mx.clearSession();
        });
    }
  }, []);

  const navigate = useCallback((screen) => {
    dispatch({ type: 'NAVIGATE', screen });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' });
  }, []);

  const openCase = useCallback((caseId) => {
    dispatch({ type: 'SET_ACTIVE_CASE', caseId });
    dispatch({ type: 'NAVIGATE', screen: SCREENS.WORKSPACE });
  }, []);

  const openTemplate = useCallback((templateId) => {
    dispatch({ type: 'SET_ACTIVE_TEMPLATE', templateId });
    dispatch({ type: 'NAVIGATE', screen: SCREENS.TEMPLATE_EDIT });
  }, []);

  const showToast = useCallback((message, isError = false) => {
    dispatch({ type: 'SHOW_TOAST', message, isError });
    setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 3000);
  }, []);

  // ── Matrix persistence helpers ──

  const doLogin = useCallback(async (username, password) => {
    dispatch({ type: 'SET_LOGIN_LOADING', loading: true });
    try {
      const { userId, token } = await mx.login(username, password);
      const role = await mx.determineRole();
      const name = username;
      mx.saveSession({ userId, token, name, ts: Date.now() });
      dispatch({ type: 'LOGIN_SUCCESS', user: { userId, name }, role });
      loadRemoteData(dispatch);
    } catch (e) {
      dispatch({ type: 'LOGIN_ERROR', error: e.message });
    }
  }, []);

  const enterDemo = useCallback(() => {
    dispatch({ type: 'ENTER_DEMO' });
  }, []);

  const persistCaseMetadata = useCallback(async (caseId, caseObj) => {
    if (!state.connected) return;
    try {
      const metadata = {
        petitionerName: caseObj.petitionerName,
        stage: caseObj.stage,
        circuit: caseObj.circuit,
        facility: caseObj.facility,
        facilityLocation: caseObj.facilityLocation,
        daysInStage: caseObj.daysInStage,
        owner: caseObj.owner || mx.getUserId(),
        docReadiness: getDocReadiness(caseObj.documents),
      };
      await mx.saveCaseMetadata(caseId, metadata);
    } catch (e) {
      console.warn('Failed to persist case metadata:', e);
    }
  }, [state.connected]);

  const persistCaseData = useCallback(async (caseId, variables) => {
    if (!state.connected) return;
    try {
      await mx.saveCaseVariables(caseId, variables);
    } catch (e) {
      console.warn('Failed to persist case variables:', e);
    }
  }, [state.connected]);

  const persistDocument = useCallback(async (caseId, docId, docData) => {
    if (!state.connected) return;
    try {
      await mx.saveCaseDocument(caseId, docId, docData);
    } catch (e) {
      console.warn('Failed to persist document:', e);
    }
  }, [state.connected]);

  const persistComment = useCallback(async (caseId, commentId, commentData) => {
    if (!state.connected) return;
    try {
      await mx.saveCaseComment(caseId, commentId, commentData);
    } catch (e) {
      console.warn('Failed to persist comment:', e);
    }
  }, [state.connected]);

  const persistTemplate = useCallback(async (templateId, templateData) => {
    if (!state.connected) return;
    try {
      await mx.saveTemplate(templateId, templateData);
      showToast('Template saved');
    } catch (e) {
      showToast('Failed to save template', true);
    }
  }, [state.connected, showToast]);

  const persistDeleteTemplate = useCallback(async (templateId) => {
    if (!state.connected) return;
    try {
      await mx.deleteTemplate(templateId);
    } catch (e) {
      console.warn('Failed to delete template:', e);
    }
  }, [state.connected]);

  const createCase = useCallback(async (caseData) => {
    const id = `case_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newCase = {
      id,
      ...caseData,
      owner: mx.getUserId() || state.user?.userId,
      lastUpdated: new Date().toISOString(),
      documents: caseData.documents || [],
      comments: [],
      variables: caseData.variables || {},
      daysInStage: 0,
    };
    dispatch({ type: 'ADD_CASE', caseData: newCase });

    if (state.connected) {
      try {
        await mx.saveCaseMetadata(id, {
          petitionerName: newCase.petitionerName,
          stage: newCase.stage,
          circuit: newCase.circuit,
          facility: newCase.facility,
          facilityLocation: newCase.facilityLocation,
          daysInStage: 0,
          owner: newCase.owner,
          docReadiness: getDocReadiness(newCase.documents),
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
  }, [state.connected, state.user, showToast]);

  const inviteAttorneyToCase = useCallback(async (caseId, userId) => {
    if (!state.connected) {
      showToast('Not connected — cannot invite', true);
      return;
    }
    try {
      await mx.inviteToCase(caseId, userId);
      showToast('Attorney invited');
    } catch (e) {
      showToast('Failed to invite: ' + e.message, true);
    }
  }, [state.connected, showToast]);

  const value = {
    state,
    dispatch,
    navigate,
    goBack,
    openCase,
    openTemplate,
    showToast,
    doLogin,
    enterDemo,
    persistCaseMetadata,
    persistCaseData,
    persistDocument,
    persistComment,
    persistTemplate,
    persistDeleteTemplate,
    createCase,
    inviteAttorneyToCase,
    SCREENS,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Load remote data from Matrix into state
async function loadRemoteData(dispatch) {
  try {
    dispatch({ type: 'SET_LOADING', loading: true });

    const [templates, caseMetadata, refData] = await Promise.allSettled([
      mx.loadTemplates(),
      mx.loadCaseMetadata(),
      mx.loadRefData(),
    ]);

    if (templates.status === 'fulfilled' && templates.value.length > 0) {
      dispatch({ type: 'MERGE_TEMPLATES', templates: templates.value });
    }
    if (caseMetadata.status === 'fulfilled' && caseMetadata.value.length > 0) {
      dispatch({ type: 'MERGE_CASES', cases: caseMetadata.value });
    }
    if (refData.status === 'fulfilled') {
      dispatch({ type: 'SET_REF_DATA', refData: refData.value });
    }
  } catch (e) {
    console.warn('Failed to load remote data:', e);
  } finally {
    dispatch({ type: 'SET_LOADING', loading: false });
  }
}

function getDocReadiness(documents) {
  if (!documents || documents.length === 0) return { ready: 0, total: 0 };
  const ready = documents.filter(d => d.status === 'ready').length;
  return { ready, total: documents.length };
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { SCREENS };
