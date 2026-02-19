import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useApp, SCREENS } from '../context/AppContext';
import { STAGES, STAGE_COLORS } from '../lib/matrix';
import { suggestStageAdvancement } from '../lib/seedData';
import { parseImportedFile, extractVariables } from '../lib/fileImport';
import ConfirmDialog from '../components/ConfirmDialog';
import { US_LETTER_PAGE_WIDTH_PX, US_LETTER_CONTENT_WIDTH_PX } from '../lib/pageLayout';

const STATUS_COLORS = { filed: '#3b82f6', ready: '#22c55e', review: '#a855f7', draft: '#eab308', empty: '#9ca3af' };
const STATUS_LABELS = { filed: 'Filed', ready: 'Ready', review: 'In Review', draft: 'Draft', empty: 'Not started' };
const LEGAL_PREVIEW_WIDTH_PX = US_LETTER_PAGE_WIDTH_PX;
const LEGAL_PREVIEW_EDIT_WIDTH_PX = US_LETTER_CONTENT_WIDTH_PX;

const DEFAULT_SECTION_LAYOUT = {
  fontFamily: "'Source Serif 4', serif",
  fontSize: 14,
  lineHeight: 1.7,
  paragraphSpacing: 12,
  textAlign: 'justify',
  sectionTitleAlign: 'center',
};

// Stage context messages
const STAGE_CONTEXT = {
  'Intake': { icon: '\uD83D\uDCCB', text: 'Intake \u2014 complete client information and assign document templates', cls: 'bg-indigo-50 border-indigo-200' },
  'Drafting': { icon: '\u270F\uFE0F', text: 'Drafting \u2014 fill all variables and complete document content', cls: 'bg-purple-50 border-purple-200' },
  'Attorney Review': { icon: '\uD83D\uDD0D', text: 'Attorney Review \u2014 verify all document content and approve for filing', cls: 'bg-violet-50 border-violet-200' },
  'Ready to File': { icon: '\u2705', text: 'Ready to File \u2014 export packet and file with the court', cls: 'bg-green-50 border-green-200' },
  'Filed': { icon: '\uD83D\uDCE4', text: 'Filed \u2014 monitor court docket for government response', cls: 'bg-blue-50 border-blue-200' },
  'Awaiting Response': { icon: '\u23F3', text: 'Awaiting Response \u2014 government response pending', cls: 'bg-cyan-50 border-cyan-200' },
};

// Variable type hints for known variables
const VAR_TYPES = {
  PETITIONER_COUNTRY: { type: 'select', label: 'Country of Origin' },
  PETITIONER_AGE: { type: 'number', label: 'Age' },
  YEARS_RESIDENCE: { type: 'number', label: 'Residence Years' },
  DETENTION_DAYS: { type: 'number', label: 'Days Detained' },
  ENTRY_DATE: { type: 'date', label: 'Entry Date' },
  APPREHENSION_DATE: { type: 'date', label: 'Apprehension Date' },
  FILING_DATE: { type: 'date', label: 'Filing Date' },
  COMMUNITY_TIES: { type: 'textarea', label: 'Community Ties' },
  CRIMINAL_HISTORY: { type: 'text', label: 'Criminal History' },
  ATTORNEY_1_PHONE: { type: 'tel', label: 'Attorney Phone' },
  ATTORNEY_1_FAX: { type: 'tel', label: 'Attorney Fax' },
  ATTORNEY_1_EMAIL: { type: 'email', label: 'Attorney Email' },
  ATTORNEY_1_CITY_STATE_ZIP: { type: 'text', label: 'Attorney City/State/Zip' },
  ATTORNEY_2_PHONE: { type: 'tel', label: 'Attorney 2 Phone' },
  ATTORNEY_2_EMAIL: { type: 'email', label: 'Attorney 2 Email' },
  ATTORNEY_2_CITY_STATE_ZIP: { type: 'text', label: 'Attorney 2 City/State/Zip' },
  ATTORNEY_2_PRO_HAC: { type: 'text', label: 'Pro Hac Vice Status' },
  AUSA_PHONE: { type: 'tel', label: 'AUSA Phone' },
  AUSA_EMAIL: { type: 'email', label: 'AUSA Email' },
  ENTRY_METHOD: { type: 'text', label: 'Entry Method' },
  FACILITY_CITY: { type: 'text', label: 'Facility City' },
  FACILITY_STATE: { type: 'text', label: 'Facility State' },
  ICE_DIRECTOR_TITLE: { type: 'text', label: 'ICE Director Title' },
  FILING_DAY: { type: 'text', label: 'Filing Day' },
  FILING_MONTH_YEAR: { type: 'text', label: 'Filing Month/Year' },
};

// Fields auto-populated by cascade (read-only)
const CASCADE_FIELDS = new Set([
  'DETENTION_FACILITY', 'FACILITY_LOCATION', 'FACILITY_CITY', 'FACILITY_STATE', 'FACILITY_OPERATOR',
  'WARDEN_NAME', 'WARDEN_TITLE', 'DISTRICT_FULL', 'DIVISION',
  'COURT_LOCATION', 'COURT_ADDRESS', 'FOD_NAME', 'FIELD_OFFICE',
  'FIELD_OFFICE_ADDRESS', 'ICE_DIRECTOR', 'ICE_DIRECTOR_ACTING', 'ICE_DIRECTOR_TITLE',
  'DHS_SECRETARY', 'AG_NAME', 'JUDGE_NAME', 'JUDGE_TITLE', 'JUDGE_CODE',
]);

const BUILT_IN_TEMPLATE_IDS = new Set(['tpl_hc_general']);

export default function WorkspaceScreen() {
  const {
    state, dispatch, navigate, showToast,
    advanceStage, updateCaseVariable,
    addDocToCase, importDocToCase, updateDocContent, moveCaseToStage,
    mergeCaseVariables,
    removeDocFromCase, inviteAttorneyToCase, getCaseSharedUsers,
  } = useApp();

  const [showExport, setShowExport] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [importLoading, setImportLoading] = useState(false);
  const [showNewVarForm, setShowNewVarForm] = useState(false);
  const [varSearch, setVarSearch] = useState('');
  const [docViewMode, setDocViewMode] = useState('fill');
  const [newVarName, setNewVarName] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [dismissedStageSuggestionKey, setDismissedStageSuggestionKey] = useState(null);
  const [shareUserId, setShareUserId] = useState('');
  const [sharedUsers, setSharedUsers] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [confirmRemoveDoc, setConfirmRemoveDoc] = useState(null);
  const fileInputRef = useRef(null);

  const activeCase = state.cases.find(c => c.id === state.activeCaseId);
  const activeCaseId = activeCase?.id;

  // Load shared users when share panel opens
  useEffect(() => {
    if (showSharePanel && activeCaseId) {
      getCaseSharedUsers(activeCaseId).then(setSharedUsers);
    }
  }, [showSharePanel, activeCaseId, getCaseSharedUsers]);

  // Auto-inject habeas petition document if missing from the case
  useEffect(() => {
    if (!activeCase) return;
    const hasHabeasDoc = (activeCase.documents || []).some(d => d.templateId === 'tpl_hc_general');
    if (!hasHabeasDoc) {
      const defaultTemplate = state.templates.find(t => t.id === 'tpl_hc_general');
      if (defaultTemplate) {
        addDocToCase(activeCase.id, defaultTemplate);
      }
    }
  }, [activeCase?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeCase) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No case selected.</p>
          <button onClick={() => navigate(SCREENS.CASES)} className="text-blue-500 text-sm">Back to cases</button>
        </div>
      </div>
    );
  }

  async function handleShareCase() {
    if (!shareUserId.trim()) return;
    setShareLoading(true);
    try {
      await inviteAttorneyToCase(activeCase.id, shareUserId.trim());
      setShareUserId('');
      // Refresh shared users
      const updated = await getCaseSharedUsers(activeCase.id);
      setSharedUsers(updated);
    } catch (e) {
      showToast('Failed to share: ' + e.message, true);
    } finally {
      setShareLoading(false);
    }
  }

  async function handleRemoveDoc() {
    if (!confirmRemoveDoc) return;
    await removeDocFromCase(activeCase.id, confirmRemoveDoc);
    setConfirmRemoveDoc(null);
    // If removed doc was selected, reset to first doc
    if (docs[state.activeDocIndex]?.id === confirmRemoveDoc) {
      dispatch({ type: 'SET_ACTIVE_DOC', index: 0 });
    }
  }

  const docs = activeCase.documents || [];
  const selectedDoc = docs[state.activeDocIndex] || null;
  const allComments = (activeCase.comments || []).filter(c => c.status !== 'resolved');
  const variables = activeCase.variables || {};
  const docOverrides = selectedDoc?.variableOverrides || {};
  const effectiveVars = { ...variables, ...docOverrides };

  const docTemplate = selectedDoc?.templateId
    ? state.templates.find(t => t.id === selectedDoc.templateId)
    : null;
  const hasTemplateImportedPreview = !selectedDoc?.imported
    && !!docTemplate
    && (
      (docTemplate.sourceFileType === 'pdf' && !!docTemplate.sourceDataUrl)
      || !!docTemplate.sourceHtml
    );

  const stageSuggestion = suggestStageAdvancement(activeCase.stage, docs);
  const docComments = allComments.filter(c => c.documentId === selectedDoc?.id);
  const commentCountsByDoc = allComments.reduce((acc, comment) => {
    if (!comment.documentId) return acc;
    acc[comment.documentId] = (acc[comment.documentId] || 0) + 1;
    return acc;
  }, {});
  const stageSuggestionKey = stageSuggestion ? `${activeCase.id}:${activeCase.stage}->${stageSuggestion.nextStage}` : null;
  const suggestedTemplates = state.templates
    .filter(t => !t.archived)
    .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
    .slice(0, 4);
  const requiredVarsForSelectedDoc = useMemo(() => {
    if (selectedDoc?.imported || !docTemplate) return [];
    const sectionVars = (docTemplate.sections || [])
      .flatMap(section => Array.from((section.content || '').matchAll(/\{\{([A-Z_0-9]+)\}\}/g)).map(m => m[1]));
    const htmlVars = docTemplate.sourceHtml
      ? Array.from(docTemplate.sourceHtml.matchAll(/\{\{([A-Z_0-9]+)\}\}/g)).map(m => m[1])
      : [];
    return Array.from(new Set([...sectionVars, ...htmlVars]));
  }, [selectedDoc?.imported, docTemplate]);
  const missingRequiredVars = requiredVarsForSelectedDoc.filter(k => !effectiveVars[k] || !String(effectiveVars[k]).trim());

  // Variable groups
  const allVarKeys = Array.from(new Set([...Object.keys(variables), ...requiredVarsForSelectedDoc])).sort();
  const varGroups = groupVariables(allVarKeys);
  const filledVars = allVarKeys.filter(k => variables[k] && String(variables[k]).trim());

  // Checklist items
  const checklist = useMemo(() => {
    const emptyVars = allVarKeys.filter(k => !variables[k] || !String(variables[k]).trim()).length;
    return [
      { label: 'Client info complete', done: !!variables.PETITIONER_NAME },
      { label: 'All variables filled', done: emptyVars === 0, partial: emptyVars > 0 && emptyVars < allVarKeys.length },
      { label: 'Templates assigned', done: docs.length > 0 },
      { label: 'All docs approved', done: docs.length > 0 && docs.every(d => d.status === 'ready' || d.status === 'filed'), partial: docs.some(d => d.status === 'ready' || d.status === 'filed') },
      { label: 'Packet exported', done: false },
    ];
  }, [variables, docs, allVarKeys]);

  // Stage stepper data
  const currentStageIdx = STAGES.indexOf(activeCase.stage);
  const visibleStages = ['Intake', 'Drafting', 'Attorney Review', 'Ready to File', 'Filed', 'Awaiting Response', 'Resolved'];

  // Stage context
  const stageCtx = STAGE_CONTEXT[activeCase.stage] || { icon: '\uD83D\uDCCC', text: activeCase.stage, cls: 'bg-gray-50 border-gray-200' };

  // Progress for context bar
  const readyDocs = docs.filter(d => d.status === 'ready' || d.status === 'filed').length;

  async function handleAdvanceStage() {
    const newStage = await advanceStage(activeCase.id);
    if (newStage) showToast(`Stage advanced to ${newStage}`);
  }

  async function handleAcceptSuggestion() {
    if (!stageSuggestion) return;
    await moveCaseToStage(activeCase.id, stageSuggestion.nextStage);
    setDismissedStageSuggestionKey(null);
    showToast(`Stage advanced to ${stageSuggestion.nextStage}`);
  }



  async function handleVarChange(key, value) {
    await updateCaseVariable(activeCase.id, key, value);
  }





  async function handleAddDocFromTemplate(template) {
    await addDocToCase(activeCase.id, template);
    setShowAddDoc(false);
    dispatch({ type: 'SET_ACTIVE_DOC', index: docs.length });
    showToast(`Added: ${template.name}`);
  }

  async function handleAddSuggestedTemplates() {
    if (suggestedTemplates.length === 0) return;
    const toAdd = suggestedTemplates.slice(0, Math.min(2, suggestedTemplates.length));
    for (const template of toAdd) {
      // eslint-disable-next-line no-await-in-loop
      await addDocToCase(activeCase.id, template);
    }
    setShowAddDoc(false);
    dispatch({ type: 'SET_ACTIVE_DOC', index: docs.length });
    showToast(`Added ${toAdd.length} starter template${toAdd.length !== 1 ? 's' : ''}`);
  }

  async function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const { text, fileType, sourceDataUrl } = await parseImportedFile(file);
      const name = file.name.replace(/\.[^.]+$/, '');
      const extractedVariables = extractVariables(text);
      await importDocToCase(activeCase.id, { name, content: text, fileType, sourceDataUrl });
      if (extractedVariables.length > 0) {
        const varsToMerge = Object.fromEntries(
          extractedVariables
            .filter((key) => !(key in variables))
            .map((key) => [key, '']),
        );
        await mergeCaseVariables(activeCase.id, varsToMerge);
      }
      setShowAddDoc(false);
      showToast(`Imported: ${file.name}`);
      // Select the newly imported doc
      dispatch({ type: 'SET_ACTIVE_DOC', index: docs.length });
    } catch (err) {
      showToast(`Import failed: ${err.message}`, true);
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const handleInsertVariable = useCallback((varKey, selectedText) => {
    if (!selectedDoc?.imported || !selectedDoc.importedContent) return;
    const content = selectedDoc.importedContent;
    const newContent = content.replace(selectedText, `{{${varKey}}}`);
    updateDocContent(activeCase.id, selectedDoc.id, newContent);
    // Add the variable to case if not existing
    if (!(varKey in variables)) {
      handleVarChange(varKey, selectedText);
    }
  }, [selectedDoc, activeCase?.id, variables]);

  function handleAddNewVariable() {
    if (!newVarName.trim()) return;
    const key = newVarName.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    if (!key) return;
    handleVarChange(key, newVarValue);
    setNewVarName('');
    setNewVarValue('');
    setShowNewVarForm(false);
    showToast(`Variable {{${key}}} added`);
  }

  const previewSections = docTemplate?.sections || [];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-7 py-4 flex items-center gap-3.5 flex-wrap">
        <button onClick={() => navigate(SCREENS.CASES)} className="text-[0.78rem] text-gray-400 hover:text-blue-500 cursor-pointer">
          &larr; Cases
        </button>
        <span className="text-gray-300 text-[0.78rem]">/</span>
        <span className="text-[1.1rem] font-bold">{activeCase.petitionerName}</span>
        <span className="text-[0.7rem] font-semibold px-[9px] py-[3px] rounded-[10px] text-white" style={{ background: STAGE_COLORS[activeCase.stage] || '#9ca3af' }}>
          {activeCase.stage}
        </span>
        {selectedDoc && (
          <>
            <span className="text-gray-300 text-[0.78rem]">/</span>
            <span className="text-[0.82rem] text-gray-500 font-medium">{selectedDoc.name}</span>
          </>
        )}
        <span className="text-[0.75rem] text-gray-400 ml-1">
          {activeCase.circuit} &middot; {activeCase.facility}
        </span>
        <div className="flex-1" />
        {state.caseLoading && <span className="text-xs text-gray-400">Loading...</span>}

        <button onClick={handleAdvanceStage} className="text-[0.78rem] font-semibold px-3 py-[5px] rounded-md border border-gray-200 text-gray-500 hover:border-gray-400">
          Advance Stage &rarr;
        </button>
        <div className="relative">
          <button
            onClick={() => { setShowSharePanel(!showSharePanel); setShowExport(false); }}
            className={`text-[0.78rem] font-semibold px-3 py-[5px] rounded-md border transition-colors ${
              showSharePanel
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'border-gray-200 text-gray-500 hover:border-green-300'
            }`}
          >
            Share
          </button>
          {showSharePanel && (
            <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-10 w-80">
              <div className="text-[0.82rem] font-bold text-gray-800 mb-1">Share Case for Review</div>
              <p className="text-[0.68rem] text-gray-400 mb-3">
                Invite other attorneys or staff to view and collaborate on this case and its documents.
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={shareUserId}
                  onChange={(e) => setShareUserId(e.target.value)}
                  placeholder="@username:server"
                  className="flex-1 text-xs px-2.5 py-2 border border-gray-200 rounded-md outline-none focus:border-green-300 bg-gray-50"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleShareCase(); }}
                />
                <button
                  onClick={handleShareCase}
                  disabled={shareLoading || !shareUserId.trim()}
                  className="text-xs font-semibold px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-40"
                >
                  {shareLoading ? '...' : 'Invite'}
                </button>
              </div>
              {/* Shared users list */}
              <div className="border-t border-gray-100 pt-2">
                <div className="text-[0.68rem] font-bold uppercase tracking-wide text-gray-400 mb-2">
                  People with access ({sharedUsers.length})
                </div>
                {sharedUsers.length === 0 && !state.connected && (
                  <p className="text-[0.68rem] text-gray-400">Sharing requires a server connection.</p>
                )}
                {sharedUsers.length === 0 && state.connected && (
                  <p className="text-[0.68rem] text-gray-400">No shared users yet.</p>
                )}
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {sharedUsers.map((u) => {
                    const isOwner = u.userId === activeCase.owner;
                    const initials = (u.displayName || u.userId)
                      .split(/[\s@]/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('');
                    return (
                      <div key={u.userId} className="flex items-center gap-2 py-1">
                        <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-white text-[0.6rem] font-semibold flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.72rem] font-medium text-gray-700 truncate">{u.displayName || u.userId}</div>
                        </div>
                        {isOwner && (
                          <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">Owner</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={() => { setShowExport(!showExport); setShowSharePanel(false); }} className="bg-blue-500 text-white text-[0.78rem] font-semibold px-3 py-[5px] rounded-md hover:bg-blue-600">
            Export
          </button>
          {showExport && (
            <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-lg shadow-xl p-1 z-10 w-56">
              <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">This document</div>
              <button onClick={() => { exportDoc('docx', selectedDoc, effectiveVars, docTemplate); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Download as Word (.docx)</button>
              <button onClick={() => { exportDoc('pdf', selectedDoc, effectiveVars, docTemplate); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Download as PDF</button>
              <div className="border-t border-gray-100 my-1" />
              <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Full packet</div>
              <button onClick={() => { exportAll(activeCase, state.templates); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Download all ready docs (.doc)</button>
              <button onClick={() => { window.print(); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Print packet</button>
            </div>
          )}
        </div>
      </div>

      {/* Stage Stepper */}
      <div className="bg-white border-b border-gray-200 px-7 flex items-center overflow-x-auto">
        {visibleStages.map((s) => {
          const sIdx = STAGES.indexOf(s);
          const isCompleted = sIdx < currentStageIdx;
          const isCurrent = s === activeCase.stage;
          return (
            <div
              key={s}
              className={`flex items-center gap-2 px-4 py-3 text-[0.72rem] font-medium whitespace-nowrap ${
                isCurrent ? 'text-blue-500 font-semibold' :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isCurrent ? 'bg-blue-500 shadow-[0_0_0_3px_#edf2fc]' :
                isCompleted ? 'bg-green-500' :
                'bg-gray-300'
              }`} />
              {s}
              {s !== visibleStages[visibleStages.length - 1] && <span className="ml-2 text-gray-300 text-base">&rsaquo;</span>}
            </div>
          );
        })}
      </div>

      {/* Stage Context Bar */}
      <div className={`px-7 py-3.5 flex items-center gap-3.5 text-[0.8rem] border-b ${stageCtx.cls}`}>
        <span className="text-base">{stageCtx.icon}</span>
        <span className="flex-1 font-medium">{stageCtx.text}</span>
        {docs.length > 0 && (
          <span className="text-[0.72rem] font-semibold px-2.5 py-1 rounded-md bg-white/70">
            {readyDocs} of {docs.length} approved
          </span>
        )}
      </div>

      {/* Stage suggestion banner */}
      {stageSuggestion && stageSuggestionKey !== dismissedStageSuggestionKey && (
        <div className="mx-7 mt-3.5 px-[18px] py-3 bg-green-50 border border-green-200 rounded-[10px] flex items-center gap-3">
          <span className="text-green-700 text-[0.8rem] font-medium flex-1">
            {stageSuggestion.reason} &mdash; move to {stageSuggestion.nextStage}?
          </span>
          <button onClick={handleAcceptSuggestion} className="text-xs font-bold bg-green-600 text-white px-4 py-1.5 rounded-md hover:bg-green-700">
            Advance to {stageSuggestion.nextStage}
          </button>
          <button
            onClick={() => setDismissedStageSuggestionKey(stageSuggestionKey)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT PANEL: Documents + Checklist */}
        <div className="w-[260px] min-w-[260px] border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
          {/* Documents header */}
          <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.07em] text-gray-400">Case Documents</span>
            <button onClick={() => setShowAddDoc(!showAddDoc)} className="text-[0.7rem] text-blue-500 font-medium cursor-pointer">+ Add</button>
          </div>

          {/* Add doc dropdown */}
          {showAddDoc && (
            <div className="mx-2 mb-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto">
              {/* Import file section */}
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                <div className="text-[0.65rem] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Import File</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.md,.markdown,.txt,.text"
                  onChange={handleFileImport}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading}
                  className="w-full text-left px-3 py-2 text-xs bg-white border border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  <div>
                    <div className="font-semibold text-gray-700">{importLoading ? 'Importing...' : 'Upload document'}</div>
                    <div className="text-gray-400 text-[0.65rem]">PDF, Word, Markdown, Text</div>
                  </div>
                </button>
              </div>
              {/* Templates section */}
              <div className="px-3 py-1.5">
                <div className="text-[0.65rem] font-bold uppercase tracking-wide text-gray-400 mb-1">From Template</div>
              </div>
              {state.templates.map(t => (
                <button key={t.id} onClick={() => handleAddDocFromTemplate(t)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0">
                  <div className="font-semibold text-gray-800">{t.name}</div>
                  <div className="text-gray-400">{t.category}</div>
                </button>
              ))}
              {state.templates.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">No templates</div>}
            </div>
          )}

          {docs.length === 0 && (
            <div className="mx-3 my-3 p-3 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="text-[0.68rem] font-bold uppercase tracking-wide text-blue-700 mb-1">Quick start</div>
              <p className="text-[0.72rem] text-blue-800 mb-2">Add starter templates, then fill fields on the right.</p>
              <button
                onClick={handleAddSuggestedTemplates}
                disabled={suggestedTemplates.length === 0}
                className="w-full mb-2 text-xs font-semibold bg-blue-600 text-white rounded-md py-1.5 hover:bg-blue-700 disabled:opacity-40"
              >
                Add starter templates
              </button>
              {suggestedTemplates.length > 0 && (
                <div className="space-y-1">
                  {suggestedTemplates.slice(0, 3).map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleAddDocFromTemplate(tpl)}
                      className="w-full text-left text-[0.7rem] px-2 py-1 rounded border border-blue-200 bg-white hover:bg-blue-100"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Document list */}
          {docs.map((d, i) => {
            const isSelected = state.activeDocIndex === i;
            const docCommentCount = commentCountsByDoc[d.id] || 0;
            return (
              <div
                key={d.id}
                onClick={() => { dispatch({ type: 'SET_ACTIVE_DOC', index: i }); setShowExport(false); }}
                className={`group flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border-l-[3px] border-l-blue-500 pl-[13px]'
                    : 'hover:bg-[#f8f7f5]'
                }`}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[d.status] || '#9ca3af' }} />
                <div className="flex-1 min-w-0">
                  <div className={`text-[0.78rem] font-medium truncate ${isSelected ? 'text-blue-900 font-semibold' : 'text-gray-900'}`}>{d.name}</div>
                  <div className={`text-[0.68rem] mt-0.5 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>
                    {d.imported && <span className="text-indigo-500 mr-1">{d.fileType?.toUpperCase()}</span>}
                    {STATUS_LABELS[d.status]}
                    {d.status === 'review' && docCommentCount > 0 && ` \u00b7 ${docCommentCount} comment${docCommentCount !== 1 ? 's' : ''}`}
                  </div>
                </div>
                {d.templateId !== 'tpl_hc_general' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmRemoveDoc(d.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                  title="Remove document"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                )}
                {isSelected && !confirmRemoveDoc && <span className="text-blue-400 text-[0.7rem]">&rsaquo;</span>}
              </div>
            );
          })}

          {docs.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-gray-400">
              No documents. Click + Add to assign templates.
            </div>
          )}

          {/* Checklist */}
          <div className="px-4 py-3 border-t border-gray-100 mt-auto">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.07em] text-gray-400 mb-2.5">Checklist</div>
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 text-[0.78rem]">
                <div className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center text-[0.6rem] border-[1.5px] ${
                  item.done ? 'bg-green-500 border-green-500 text-white' :
                  item.partial ? 'border-amber-400 text-amber-500' :
                  'border-gray-200'
                }`}>
                  {item.done ? '\u2713' : item.partial ? '\u2014' : ''}
                </div>
                <span className={item.done ? 'text-gray-600' : 'text-gray-500'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL: Document Preview */}
        <div className="flex-1 min-w-0 bg-[#f8f7f5] overflow-y-auto flex flex-col">
          {/* Document title bar */}
          {selectedDoc && selectedDoc.status !== 'empty' && (
            <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-3 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[selectedDoc.status] || '#9ca3af' }} />
              <span className="text-[0.82rem] font-semibold text-gray-800">{selectedDoc.name}</span>
              <span className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full border" style={{
                color: STATUS_COLORS[selectedDoc.status] || '#9ca3af',
                borderColor: STATUS_COLORS[selectedDoc.status] || '#9ca3af',
                background: `${STATUS_COLORS[selectedDoc.status] || '#9ca3af'}12`,
              }}>
                {STATUS_LABELS[selectedDoc.status]}
              </span>
              <span className="text-[0.7rem] text-gray-400">
                {state.activeDocIndex + 1} of {docs.length} documents
              </span>
              <div className="flex-1" />
              {selectedDoc.imported && (
                <span className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600">
                  {selectedDoc.fileType?.toUpperCase() || 'Imported'}
                </span>
              )}
              {docTemplate && <span className="text-[0.68rem] text-gray-400">Template: {docTemplate.name}</span>}
            </div>
          )}
          {selectedDoc && missingRequiredVars.length > 0 && (
            <div className="w-full max-w-[816px] mb-3 px-3 py-2 border border-amber-200 bg-amber-50 rounded-lg flex items-center gap-2">
              <span className="text-[0.72rem] font-semibold text-amber-700 flex-1">
                Missing {missingRequiredVars.length} field{missingRequiredVars.length !== 1 ? 's' : ''} used in this document.
              </span>
              <button
                className="text-[0.7rem] font-semibold px-2.5 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Fill fields
              </button>
            </div>
          )}
          <div className="flex-1 flex flex-col items-center p-6">
          {!selectedDoc || selectedDoc.status === 'empty' ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-600 mb-1">No document selected</div>
                <div className="text-xs text-gray-400 mb-4">Choose a template or import a file to start</div>
                <button onClick={() => setShowAddDoc(true)} className="text-xs font-semibold bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Add Document</button>
              </div>
            </div>
          ) : (selectedDoc.imported || hasTemplateImportedPreview) ? (
            <ImportedDocView
              doc={selectedDoc}
              template={docTemplate}
              variables={effectiveVars}
              mode={docViewMode}
              trusted={!!docTemplate && BUILT_IN_TEMPLATE_IDS.has(docTemplate.id)}
              onInsertVariable={handleInsertVariable}
              onContentChange={(content) => updateDocContent(activeCase.id, selectedDoc.id, content)}
            />
          ) : (
            <div
              className="bg-white border border-gray-200 rounded-[14px] w-full px-12 py-10 shadow-sm min-h-[600px]"
              style={{ maxWidth: `${LEGAL_PREVIEW_WIDTH_PX}px` }}
            >
              {/* Court header */}
              <div className="text-center mb-7 pb-5 border-b-2 border-gray-900">
                <div className="text-[0.82rem] font-bold tracking-[0.1em] uppercase" style={{ fontFamily: "'Source Serif 4', serif" }}>
                  United States District Court
                </div>
                <div className="text-[0.75rem] text-gray-500 mt-1" style={{ fontFamily: "'Source Serif 4', serif" }}>
                  for the {effectiveVars.DISTRICT_FULL || 'District'}
                </div>
              </div>

              {/* Case caption */}
              <div className="flex justify-between items-start py-4 border-b border-gray-900 mb-6" style={{ fontFamily: "'Source Serif 4', serif" }}>
                <div className="text-[0.85rem] leading-relaxed">
                  <VarSpan vars={effectiveVars} varKey="PETITIONER_NAME" />,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;Petitioner,<br /><br />
                  v.<br /><br />
                  <VarSpan vars={effectiveVars} varKey="WARDEN_NAME" />,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;Respondent.
                </div>
                <div className="text-right text-[0.82rem]">
                  <div className="font-semibold">
                    Case No. <VarSpan vars={effectiveVars} varKey="CASE_NUMBER" />
                  </div>
                  <div className="mt-2 text-[0.78rem] text-gray-500">
                    PETITION FOR WRIT OF<br />HABEAS CORPUS UNDER<br />28 U.S.C. &sect; 2241
                  </div>
                </div>
              </div>

              {/* Sections */}
              {previewSections.map((sec, i) => {
                if (!sec.required && sec.condition) {
                  if (!evaluateCondition(sec.condition, effectiveVars)) return null;
                }
                const sectionComments = docComments.filter(c => c.section === sec.name);
                const isAnnotated = sectionComments.length > 0;
                return (
                  <div key={i} className={`mb-5 relative ${isAnnotated ? 'border-l-[3px] border-purple-500 pl-3 -ml-3.5' : ''}`}>
                    {isAnnotated && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-500 text-white text-[0.6rem] font-bold flex items-center justify-center">
                        {sectionComments.length}
                      </div>
                    )}
                    <div
                      className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-gray-500 mb-3"
                      style={{
                        fontFamily: (sec.layout?.fontFamily || DEFAULT_SECTION_LAYOUT.fontFamily),
                        textAlign: sec.layout?.sectionTitleAlign || DEFAULT_SECTION_LAYOUT.sectionTitleAlign,
                      }}
                    >
                      {sec.name}
                    </div>
                    {sec.content ? (
                      <div
                        className="text-gray-900"
                        style={{
                          fontFamily: sec.layout?.fontFamily || DEFAULT_SECTION_LAYOUT.fontFamily,
                          fontSize: `${sec.layout?.fontSize || DEFAULT_SECTION_LAYOUT.fontSize}px`,
                          lineHeight: sec.layout?.lineHeight || DEFAULT_SECTION_LAYOUT.lineHeight,
                          textAlign: sec.layout?.textAlign || DEFAULT_SECTION_LAYOUT.textAlign,
                        }}
                      >
                        {renderContent(sec.content, effectiveVars, sec.layout)}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="h-2 bg-gray-100 rounded-full w-full" />
                        <div className="h-2 bg-gray-100 rounded-full w-11/12" />
                        <div className="h-2 bg-gray-100 rounded-full w-10/12" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>

        {/* Confirm remove document dialog */}
        <ConfirmDialog
          open={!!confirmRemoveDoc}
          title="Remove Document"
          message={`Are you sure you want to remove "${docs.find(d => d.id === confirmRemoveDoc)?.name || 'this document'}" from the case? This action cannot be undone.`}
          confirmLabel="Remove"
          danger
          onConfirm={handleRemoveDoc}
          onCancel={() => setConfirmRemoveDoc(null)}
        />

        {/* RIGHT PANEL: Variables */}
        <div className="w-[300px] min-w-[300px] border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
              <div className="px-4 pt-3.5 pb-1 border-b border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.72rem] font-bold text-gray-700 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit Fields
                  </span>
                  <span className="text-[0.68rem] font-semibold text-gray-400">{filledVars.length}/{allVarKeys.length}</span>
                </div>
                <div className="mb-2 inline-flex w-full rounded-md border border-gray-200 bg-gray-50 p-0.5">
                  <button
                    onClick={() => setDocViewMode('fill')}
                    className={`flex-1 rounded px-2 py-1 text-[0.66rem] font-semibold transition-colors ${docViewMode === 'fill' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Fill Variables
                  </button>
                  <button
                    onClick={() => setDocViewMode('preview')}
                    className={`flex-1 rounded px-2 py-1 text-[0.66rem] font-semibold transition-colors ${docViewMode === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Preview Output
                  </button>
                </div>
                <p className="text-[0.66rem] text-gray-400 pb-1.5">Fill in case details below. Values auto-populate into all documents.</p>
                <input
                  type="text"
                  value={varSearch}
                  onChange={(e) => setVarSearch(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full text-[0.72rem] px-2.5 py-1.5 border border-gray-200 rounded-md outline-none focus:border-blue-300 mb-2 bg-white"
                />
                {/* Fill progress bar */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: allVarKeys.length > 0 ? `${(filledVars.length / allVarKeys.length) * 100}%` : '0%',
                      background: filledVars.length === allVarKeys.length ? '#22c55e' : '#3b82f6',
                    }}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {varGroups.map((g, gi) => {
                  const filteredFields = g.fields.filter((field) => {
                    if (!varSearch.trim()) return true;
                    const q = varSearch.toLowerCase();
                    return field.toLowerCase().includes(q) || formatLabel(field).toLowerCase().includes(q);
                  });
                  if (filteredFields.length === 0) return null;
                  const groupFilled = filteredFields.filter(f => variables[f] && String(variables[f]).trim()).length;
                  const allFilled = groupFilled === filteredFields.length;
                  const isCollapsed = collapsedGroups[g.name];
                  return (
                    <div key={gi} className="border-b border-gray-100">
                      <button
                        onClick={() => setCollapsedGroups(prev => ({ ...prev, [g.name]: !prev[g.name] }))}
                        className="w-full px-4 py-3 flex items-center gap-1.5 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <span className={`text-[0.62rem] text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>&rsaquo;</span>
                        <span className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-gray-400">{g.name}</span>
                        <span className={`font-medium text-[0.62rem] ${allFilled ? 'text-green-500' : 'text-amber-500'}`}>
                          {groupFilled}/{filteredFields.length} {allFilled ? '\u2713' : '\u26A0'}
                        </span>
                        {allFilled && <span className="ml-auto text-[0.6rem] text-green-500 font-medium">Complete</span>}
                      </button>
                      {!isCollapsed && (
                        <div className="px-4 pb-3">
                          {filteredFields.map((f) => {
                            const val = variables[f] || '';
                            const isFilled = val && String(val).trim();
                            const isCascade = CASCADE_FIELDS.has(f);
                            const varType = VAR_TYPES[f] || { type: 'text', label: formatLabel(f) };
                            return (
                              <div key={f} className="mb-2.5">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[0.7rem] font-medium text-gray-500">{varType.label}</label>
                                  {isFilled && isCascade && <span className="text-[0.68rem] text-green-500 font-semibold">{'\u2713'} auto</span>}
                                  {isFilled && !isCascade && <span className="text-[0.68rem] text-green-500 font-semibold">{'\u2713'}</span>}
                                  {!isFilled && <span className="text-[0.68rem] text-amber-500 font-semibold">empty</span>}
                                </div>
                                <VarInput
                                  type={varType.type}
                                  value={val}
                                  onChange={(v) => handleVarChange(f, v)}
                                  filled={!!isFilled}
                                  readOnly={isCascade}
                                  placeholder={`e.g. ${f.toLowerCase().replace(/_/g, ' ')}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {allVarKeys.length === 0 && (
                  <div className="px-4 py-6 text-xs text-gray-400 text-center">No variables defined for this case yet.</div>
                )}
                {allVarKeys.length > 0 && varSearch.trim() && !varGroups.some(g => g.fields.some(f => f.toLowerCase().includes(varSearch.toLowerCase()) || formatLabel(f).toLowerCase().includes(varSearch.toLowerCase()))) && (
                  <div className="px-4 py-6 text-xs text-gray-400 text-center">No fields match “{varSearch}”.</div>
                )}

                {/* Add New Variable */}
                <div className="px-4 py-3 border-t border-gray-200">
                  {showNewVarForm ? (
                    <div className="space-y-2">
                      <div className="text-[0.68rem] font-bold text-gray-500">New Variable</div>
                      <input
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                        placeholder="Variable name (e.g. Bond Amount)"
                        className="w-full text-xs px-2.5 py-[7px] border border-gray-200 rounded-md outline-none focus:border-blue-300 bg-[#f8f7f5]"
                      />
                      <input
                        value={newVarValue}
                        onChange={(e) => setNewVarValue(e.target.value)}
                        placeholder="Initial value (optional)"
                        className="w-full text-xs px-2.5 py-[7px] border border-gray-200 rounded-md outline-none focus:border-blue-300 bg-[#f8f7f5]"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => { setShowNewVarForm(false); setNewVarName(''); setNewVarValue(''); }} className="flex-1 text-xs py-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleAddNewVariable} disabled={!newVarName.trim()} className="flex-1 text-xs py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-semibold disabled:opacity-40">Add</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewVarForm(true)}
                      className="w-full text-xs font-medium text-blue-500 py-2 border border-dashed border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      + Add New Variable
                    </button>
                  )}
                </div>
              </div>
        </div>
      </div>
    </div>
  );
}

function ImportedDocView({ doc, template, variables, mode, trusted, onInsertVariable, onContentChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [varPopup, setVarPopup] = useState(null);
  const [newVarKey, setNewVarKey] = useState('');
  const contentRef = useRef(null);

  const content = doc.importedContent || '';
  const sourceHtml = doc.sourceHtml || template?.sourceHtml || null;
  const previewSourceDataUrl = doc.sourceDataUrl || template?.sourceDataUrl || null;
  const previewFileType = doc.fileType || template?.sourceFileType || null;
  const previewName = doc.name || template?.name || 'Document';
  const hasVisualPdf = previewFileType === 'pdf' && !!previewSourceDataUrl;
  const canEditExtractedText = doc.imported && !!doc.importedContent && !sourceHtml;
  const isPreviewMode = mode === 'preview';

  function handleStartEdit() {
    if (!canEditExtractedText) return;
    setEditContent(content);
    setIsEditing(true);
  }

  function handleSaveEdit() {
    onContentChange(editContent);
    setIsEditing(false);
  }

  function handleTextSelect() {
    const sel = window.getSelection();
    const text = sel?.toString()?.trim();
    if (!text || text.length < 2 || text.length > 100) {
      setVarPopup(null);
      return;
    }
    // Get position for popup
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current?.getBoundingClientRect();
    if (containerRect) {
      setVarPopup({
        text,
        top: rect.top - containerRect.top - 40,
        left: rect.left - containerRect.left + rect.width / 2,
      });
      setNewVarKey(text.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 30));
    }
  }

  function handleMakeVariable() {
    if (!varPopup || !newVarKey.trim()) return;
    onInsertVariable(newVarKey.trim(), varPopup.text);
    setVarPopup(null);
    setNewVarKey('');
  }

  if (isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-[14px] w-full px-8 py-6 shadow-sm min-h-[600px] flex flex-col" style={{ maxWidth: `${LEGAL_PREVIEW_EDIT_WIDTH_PX}px` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-700">Editing: {previewName}</div>
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSaveEdit} className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-semibold">Save</button>
          </div>
        </div>
        <p className="text-[0.68rem] text-gray-400 mb-2">Use {'{{VARIABLE_NAME}}'} syntax to insert variables that auto-fill from case fields.</p>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="flex-1 w-full border border-gray-200 rounded-lg p-4 text-[0.85rem] leading-[1.8] resize-none outline-none focus:border-blue-300 font-mono"
          style={{ minHeight: 500 }}
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-[14px] w-full px-12 py-10 shadow-sm min-h-[600px] relative" style={{ maxWidth: `${LEGAL_PREVIEW_WIDTH_PX}px` }}>
      {/* Document header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Imported {previewFileType?.toUpperCase() || 'Document'}
          </div>
          <div className="text-[1rem] font-bold text-gray-800">{previewName}</div>
        </div>
        {canEditExtractedText && (
          <button
            onClick={handleStartEdit}
            className="text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-md text-gray-500 hover:border-blue-300 hover:text-blue-600 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit
          </button>
        )}
      </div>

      {hasVisualPdf ? (
        <>
          <div className={`mb-4 px-3 py-2 border rounded-lg text-[0.72rem] ${isPreviewMode ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
            {isPreviewMode
              ? 'Preview mode shows rendered output from the original PDF layout.'
              : 'Fill mode keeps the original PDF layout visible while you edit values in the fields panel.'}
          </div>
          <iframe
            src={previewSourceDataUrl}
            title={`${previewName} preview`}
            className="w-full min-h-[700px] border border-gray-200 rounded-lg"
          />
        </>
      ) : (
        <>
          {/* Tip for making variables */}
          {isPreviewMode ? (
            <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-[0.72rem] text-green-700">
              Preview output mode shows values as they would appear in the exported document.
            </div>
          ) : (
            <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-[0.72rem] text-blue-700">
              Select any text to convert it into a variable placeholder. Variables auto-fill across all documents.
            </div>
          )}

          {/* Document content with variable highlighting */}
          <div
            ref={contentRef}
            className="relative text-[0.88rem] leading-[1.8] text-gray-900"
            style={{ fontFamily: "'Source Serif 4', serif" }}
            onMouseUp={!sourceHtml && !isPreviewMode ? handleTextSelect : undefined}
          >
            {sourceHtml ? (
              <div dangerouslySetInnerHTML={{ __html: (trusted ? safeTrustedHtml : safeHtml)(substituteVarsInHtml(sourceHtml, variables)) }} />
            ) : (
              <div className="whitespace-pre-wrap">{renderContent(content, variables, {}, isPreviewMode)}</div>
            )}

            {/* Variable creation popup */}
            {varPopup && !isPreviewMode && (
              <div
                className="absolute z-20 bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-64"
                style={{ top: varPopup.top, left: Math.max(0, varPopup.left - 128) }}
              >
                <div className="text-[0.7rem] font-semibold text-gray-600 mb-1.5">Make variable from selection</div>
                <div className="text-[0.68rem] text-gray-400 mb-2 truncate">"{varPopup.text}"</div>
                <input
                  value={newVarKey}
                  onChange={(e) => setNewVarKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  placeholder="VARIABLE_NAME"
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded mb-2 font-mono outline-none focus:border-blue-300"
                />
                <div className="flex gap-2">
                  <button onClick={() => setVarPopup(null)} className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50">Cancel</button>
                  <button
                    onClick={handleMakeVariable}
                    disabled={!newVarKey.trim()}
                    className="flex-1 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold disabled:opacity-40"
                  >
                    Create {'{{'}...{'}}'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function VarInput({ type, value, onChange, filled, readOnly, placeholder }) {
  const baseClass = `w-full py-[7px] px-2.5 border rounded-md text-[0.78rem] outline-none transition-colors ${
    filled ? 'border-green-200' : 'border-gray-200'
  } ${readOnly ? 'opacity-70 bg-gray-50' : 'bg-[#f8f7f5] focus:border-blue-300 focus:bg-white'}`;

  if (type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        rows={2}
        className={baseClass}
        style={{ fontFamily: 'inherit', resize: 'vertical' }}
        placeholder={placeholder}
      />
    );
  }
  if (type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={readOnly} className={baseClass} style={{ fontFamily: 'inherit', appearance: 'none' }}>
        <option value="">Select...</option>
        <option value={value}>{value}</option>
      </select>
    );
  }
  return (
    <input
      type={type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      className={baseClass}
      style={{ fontFamily: 'inherit' }}
      placeholder={placeholder}
    />
  );
}

function VarSpan({ vars, varKey }) {
  const val = vars[varKey];
  if (val && String(val).trim()) {
    return (
      <span className="bg-green-50 px-[5px] py-[1px] rounded border-b-2 border-green-300 cursor-pointer hover:bg-green-100 transition-colors">
        {val}
      </span>
    );
  }
  return (
    <span className="bg-amber-50 px-[5px] py-[1px] rounded border-b-2 border-amber-300 font-mono text-[0.78rem] text-amber-500 cursor-pointer hover:bg-amber-100 transition-colors">
      {`{{${varKey}}}`}
    </span>
  );
}

function groupVariables(keys) {
  const groups = [];
  const petitioner = keys.filter(k => k.startsWith('PETITIONER') || ['ENTRY_DATE', 'YEARS_RESIDENCE', 'APPREHENSION_LOCATION', 'APPREHENSION_DATE', 'CRIMINAL_HISTORY', 'COMMUNITY_TIES'].includes(k));
  const detention = keys.filter(k => k.startsWith('DETENTION') || k.startsWith('FACILITY') || k.startsWith('WARDEN'));
  const court = keys.filter(k => k.startsWith('DISTRICT') || k.startsWith('DIVISION') || k.startsWith('COURT') || k.startsWith('CASE_') || k.startsWith('JUDGE') || k.startsWith('FILING'));
  const officials = keys.filter(k => k.startsWith('FOD') || k.startsWith('FIELD_OFFICE') || k.startsWith('ICE') || k.startsWith('DHS') || k.startsWith('AG_'));
  const attorneys = keys.filter(k => k.startsWith('ATTORNEY'));
  const ausa = keys.filter(k => k.startsWith('AUSA'));
  const used = new Set([...petitioner, ...detention, ...court, ...officials, ...attorneys, ...ausa]);
  const other = keys.filter(k => !used.has(k));
  if (petitioner.length) groups.push({ name: 'Petitioner', fields: petitioner });
  if (detention.length) groups.push({ name: 'Detention', fields: detention });
  if (court.length) groups.push({ name: 'Court', fields: court });
  if (officials.length) groups.push({ name: 'Officials & Counsel', fields: [...officials, ...ausa] });
  if (attorneys.length) groups.push({ name: 'Attorneys', fields: attorneys });
  if (!officials.length && ausa.length) groups.push({ name: 'Opposing Counsel', fields: ausa });
  if (other.length) groups.push({ name: 'Other', fields: other });
  return groups;
}

function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/^Petitioner /, '')
    .replace(/^Detention /, '')
    .replace(/^Attorney (\d)/, 'Attorney $1')
    .replace(/^Ausa /, 'AUSA ');
}

function renderContent(content, variables, layout = {}, previewOnly = false) {
  if (!content) return null;
  const paragraphSpacing = Number(layout.paragraphSpacing ?? DEFAULT_SECTION_LAYOUT.paragraphSpacing);
  const paragraphs = content.split(/\n{2,}/).filter(p => p.trim().length > 0);
  const source = paragraphs.length > 0 ? paragraphs : [content];

  return source.map((paragraph, paraIdx) => {
    const parts = paragraph.split(/(\{\{[A-Z_0-9]+\}\})/g);
    return (
      <p key={paraIdx} style={{ margin: `0 0 ${paragraphSpacing}px 0` }}>
        {parts.map((part, i) => {
          const match = part.match(/^\{\{([A-Z_0-9]+)\}\}$/);
          if (match) {
            const val = variables[match[1]];
            if (previewOnly) {
              return <span key={`${paraIdx}-${i}`}>{val || `{{${match[1]}}}`}</span>;
            }
            return (
              <span key={`${paraIdx}-${i}`} className={val ? 'bg-green-50 border-b-2 border-green-300 px-[5px] rounded cursor-pointer hover:bg-green-100' : 'bg-amber-50 border-b-2 border-amber-300 px-[5px] rounded font-mono text-[0.78rem] text-amber-500 cursor-pointer hover:bg-amber-100'}>
                {val || `{{${match[1]}}}`}
              </span>
            );
          }
          return <span key={`${paraIdx}-${i}`}>{part}</span>;
        })}
      </p>
    );
  });
}

function evaluateCondition(condition, variables) {
  if (!condition) return true;
  const compMatch = condition.match(/^([A-Z_0-9]+)\s*(>|<|>=|<=|==|!=)\s*(.+)$/);
  if (compMatch) {
    const val = Number(variables[compMatch[1]]) || 0;
    const target = Number(compMatch[3]) || 0;
    switch (compMatch[2]) {
      case '>': return val > target;
      case '<': return val < target;
      case '>=': return val >= target;
      case '<=': return val <= target;
      case '==': return val === target;
      case '!=': return val !== target;
      default: return true;
    }
  }
  return !!(variables[condition] && variables[condition] !== 'false' && variables[condition] !== '0');
}


function substituteVarsInHtml(html, vars) {
  return (html || '').replace(/\{\{([A-Z_0-9]+)\}\}/g, (_, k) => {
    const value = vars[k];
    return value == null || value === '' ? `{{${k}}}` : value;
  });
}

function safeHtml(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  doc.querySelectorAll('script,style,iframe,object').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML;
}

// Trusted HTML sanitizer that preserves <style> tags for built-in templates.
// Styles are scoped to prevent leaking into the rest of the application.
function safeTrustedHtml(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  doc.querySelectorAll('script,iframe,object').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    });
  });
  // Extract styles and scope them to avoid leaking into the app
  const scopeClass = 'hc-petition-scope';
  const styles = Array.from(doc.querySelectorAll('style'));
  const scopedCss = styles.map((s) => {
    return s.textContent.replace(/([^{}]+)\{/g, (match, selector) => {
      if (selector.trim().startsWith('@')) return match;
      const scoped = selector.split(',').map((sel) => `.${scopeClass} ${sel.trim()}`).join(', ');
      return `${scoped} {`;
    });
  }).join('\n');
  // Remove original style elements from body (they were in head, but just in case)
  doc.body.querySelectorAll('style').forEach((el) => el.remove());
  return `<style>${scopedCss}</style><div class="${scopeClass}">${doc.body.innerHTML}</div>`;
}

function buildDocText(doc, variables, template) {
  if (doc.imported && (doc.sourceText || doc.importedContent)) {
    const text = doc.sourceText || doc.importedContent || '';
    return text.replace(/\{\{([A-Z_0-9]+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
  }
  if (!template) return '';
  let text = '';
  for (const sec of template.sections || []) {
    if (!sec.required && sec.condition && !evaluateCondition(sec.condition, variables)) continue;
    text += `\n${'='.repeat(60)}\n  ${sec.name.toUpperCase()}\n${'='.repeat(60)}\n\n`;
    if (sec.content) {
      text += sec.content.replace(/\{\{([A-Z_0-9]+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
    }
    text += '\n\n';
  }
  return text;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderImportedBodyHtml(content, variables, layout = DEFAULT_SECTION_LAYOUT) {
  const substituted = (content || '')
    .replace(/\{\{([A-Z_0-9]+)\}\}/g, (_, key) => (variables[key] == null || variables[key] === '' ? `{{${key}}}` : variables[key]));

  // Escape HTML, then convert newlines into basic document structure:
  // - blank lines => paragraph breaks
  // - single newlines => <br/>
  const escaped = escapeHtml(substituted);

  const paras = escaped
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 ${layout.paragraphSpacing || DEFAULT_SECTION_LAYOUT.paragraphSpacing}px 0;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `<div style="font-family:${layout.fontFamily || DEFAULT_SECTION_LAYOUT.fontFamily};font-size:${layout.fontSize || DEFAULT_SECTION_LAYOUT.fontSize}px;line-height:${layout.lineHeight || DEFAULT_SECTION_LAYOUT.lineHeight};text-align:${layout.textAlign || DEFAULT_SECTION_LAYOUT.textAlign};margin:0;">${paras || '<p style=\"margin:0;\">&nbsp;</p>'}</div>`;
}

function buildDocHtml(doc, variables, template) {
  const docTitle = doc.name || 'Document';
  let body = '';

  if (doc.imported && (doc.sourceHtml || doc.importedContent)) {
    const importedHtml = doc.sourceHtml
      ? safeHtml(substituteVarsInHtml(doc.sourceHtml, variables))
      : safeHtml(renderImportedBodyHtml(doc.importedContent || '', variables, DEFAULT_SECTION_LAYOUT));
    body = `<div style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;">${importedHtml}</div>`;
  } else if (template) {
    if (template.sourceHtml && BUILT_IN_TEMPLATE_IDS.has(template.id)) {
      // Built-in template: use full original HTML with styles preserved
      return substituteVarsInHtml(template.sourceHtml, variables);
    } else if (template.sourceHtml) {
      const substituted = safeHtml(substituteVarsInHtml(template.sourceHtml, variables));
      body = `<div style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;">${substituted}</div>`;
    } else {
      for (const sec of template.sections || []) {
        if (!sec.required && sec.condition && !evaluateCondition(sec.condition, variables)) continue;
        const secLayout = { ...DEFAULT_SECTION_LAYOUT, ...(sec.layout || {}) };
        body += `<h2 style="text-align:${secLayout.sectionTitleAlign}; font-family:${secLayout.fontFamily}; font-size:11pt; text-transform:uppercase; letter-spacing:1px; margin-top:24pt;">${sec.name}</h2>`;
        if (sec.content) {
          body += `<div style="font-family:${secLayout.fontFamily};font-size:${secLayout.fontSize}px;line-height:${secLayout.lineHeight};text-align:${secLayout.textAlign};margin-bottom:${secLayout.paragraphSpacing}px;">${renderImportedBodyHtml(sec.content, variables, secLayout)}</div>`;
        }
      }
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docTitle}</title>
<style>
body{margin:0;background:#fff;color:#111;}
.page{width:8.5in;min-height:11in;margin:0 auto;padding:1in;box-sizing:border-box;font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;}
h2{font-size:11pt;text-align:center;text-transform:uppercase;letter-spacing:1px;margin-top:24pt;}
@page{size:letter;margin:1in;}
</style></head><body><div class="page">${body}</div></body></html>`;
}
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportDoc(format, doc, variables, template) {
  if (!doc) return;
  if (!template && !doc.imported) {
    alert('No template associated with this document.');
    return;
  }

  const safeName = (doc.name || 'document').replace(/[^a-zA-Z0-9_\- ]/g, '');

  if (format === 'pdf') {
    // Generate HTML and open print dialog for PDF
    const html = buildDocHtml(doc, variables, template);
    const printWindow = window.open('', '_blank', 'width=800,height=1100');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.print(); };
    }
  } else {
    // Download as .docx-compatible HTML (opens in Word) or plain text
    if (format === 'docx') {
      const html = buildDocHtml(doc, variables, template);
      downloadFile(html, `${safeName}.doc`, 'application/msword');
    } else {
      const text = buildDocText(doc, variables, template);
      downloadFile(text, `${safeName}.txt`, 'text/plain');
    }
  }
}

function exportAll(activeCase, templates) {
  const readyDocs = (activeCase.documents || []).filter(d => d.status === 'ready' || d.status === 'filed');
  if (readyDocs.length === 0) {
    alert('No ready or filed documents to export.');
    return;
  }
  const variables = activeCase.variables || {};
  // Concatenate all docs into a single HTML file
  let combinedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Case Packet - ${activeCase.petitionerName || 'Case'}</title>
<style>body{margin:40px 60px;font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;color:#111;}
h1{font-size:14pt;text-align:center;border-bottom:2px solid #333;padding-bottom:8pt;}
h2{font-size:11pt;text-align:center;text-transform:uppercase;letter-spacing:1px;margin-top:24pt;}
.doc-break{page-break-before:always;border-top:3px double #333;margin-top:40pt;padding-top:20pt;}
@page{margin:1in;}</style></head><body>`;

  combinedHtml += `<h1>CASE PACKET: ${(activeCase.petitionerName || 'Unknown').toUpperCase()}</h1>`;
  combinedHtml += `<p style="text-align:center;color:#666;font-size:10pt;">${activeCase.circuit || ''} | ${activeCase.facility || ''} | Generated ${new Date().toLocaleDateString()}</p>`;

  readyDocs.forEach((doc, idx) => {
    const effectiveVars = { ...variables, ...(doc.variableOverrides || {}) };
    const template = doc.templateId ? (templates || []).find(t => t.id === doc.templateId) : null;
    if (idx > 0) combinedHtml += '<div class="doc-break"></div>';
    combinedHtml += `<h1>${doc.name || "Document"}</h1>`;

    if (doc.imported && (doc.sourceHtml || doc.importedContent)) {
      const rendered = doc.sourceHtml
        ? safeHtml(substituteVarsInHtml(doc.sourceHtml, effectiveVars))
        : safeHtml(renderImportedBodyHtml(doc.importedContent || '', effectiveVars, DEFAULT_SECTION_LAYOUT));
      combinedHtml += `<div>${rendered}</div>`;
    } else if (template) {
      if (template.sourceHtml && BUILT_IN_TEMPLATE_IDS.has(template.id)) {
        // Built-in template: use full original HTML with styles preserved
        const substituted = substituteVarsInHtml(template.sourceHtml, effectiveVars);
        // Extract just the body content for embedding in the combined document
        const parsed = new DOMParser().parseFromString(substituted, 'text/html');
        const styles = Array.from(parsed.querySelectorAll('style')).map(s => s.outerHTML).join('');
        combinedHtml += `${styles}<div>${parsed.body.innerHTML}</div>`;
      } else {
        for (const sec of template.sections || []) {
          if (!sec.required && sec.condition && !evaluateCondition(sec.condition, effectiveVars)) continue;
          const secLayout = { ...DEFAULT_SECTION_LAYOUT, ...(sec.layout || {}) };
          combinedHtml += `<h2 style="text-align:${secLayout.sectionTitleAlign};font-family:${secLayout.fontFamily};">${sec.name}</h2>`;
          if (sec.content) {
            const rendered = sec.content
              .replace(/\{\{([A-Z_0-9]+)\}\}/g, (_, key) => effectiveVars[key] || `[${key}]`)
              .replace(/\n/g, '<br/>');
            combinedHtml += `<div style="font-family:${secLayout.fontFamily};font-size:${secLayout.fontSize}px;line-height:${secLayout.lineHeight};text-align:${secLayout.textAlign};margin-bottom:${secLayout.paragraphSpacing}px;">${rendered}</div>`;
          }
        }
      }
    }
  });

  combinedHtml += '</body></html>';
  const safeName = (activeCase.petitionerName || 'case-packet').replace(/[^a-zA-Z0-9_\- ]/g, '');
  downloadFile(combinedHtml, `${safeName}-packet.doc`, 'application/msword');
}
