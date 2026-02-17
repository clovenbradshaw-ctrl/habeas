import { useState, useMemo } from 'react';
import { useApp, SCREENS } from '../context/AppContext';
import { STAGES, STAGE_COLORS } from '../lib/matrix';
import { suggestStageAdvancement } from '../lib/seedData';

const STATUS_COLORS = { filed: '#3b82f6', ready: '#22c55e', review: '#a855f7', draft: '#eab308', empty: '#9ca3af' };
const STATUS_LABELS = { filed: 'Filed', ready: 'Ready', review: 'In Review', draft: 'Draft', empty: 'Not started' };

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
  ATTORNEY_1_EMAIL: { type: 'email', label: 'Attorney Email' },
  ATTORNEY_2_PHONE: { type: 'tel', label: 'Attorney 2 Phone' },
  ATTORNEY_2_EMAIL: { type: 'email', label: 'Attorney 2 Email' },
  AUSA_PHONE: { type: 'tel', label: 'AUSA Phone' },
  AUSA_EMAIL: { type: 'email', label: 'AUSA Email' },
};

// Fields auto-populated by cascade (read-only)
const CASCADE_FIELDS = new Set([
  'DETENTION_FACILITY', 'FACILITY_LOCATION', 'FACILITY_OPERATOR',
  'WARDEN_NAME', 'WARDEN_TITLE', 'DISTRICT_FULL', 'DIVISION',
  'COURT_LOCATION', 'COURT_ADDRESS', 'FOD_NAME', 'FIELD_OFFICE',
  'FIELD_OFFICE_ADDRESS', 'ICE_DIRECTOR', 'ICE_DIRECTOR_ACTING',
  'DHS_SECRETARY', 'AG_NAME', 'JUDGE_NAME', 'JUDGE_TITLE', 'JUDGE_CODE',
]);

export default function WorkspaceScreen() {
  const {
    state, dispatch, navigate, showToast,
    advanceStage, updateCaseVariable, updateDocStatus, updateDocOverride,
    addDocToCase, addComment, resolveComment, moveCaseToStage,
  } = useApp();

  const [rightTab, setRightTab] = useState('variables'); // 'variables' | 'review'
  const [showExport, setShowExport] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentSection, setNewCommentSection] = useState('');
  const [showAddDoc, setShowAddDoc] = useState(false);

  const activeCase = state.cases.find(c => c.id === state.activeCaseId);
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

  const docs = activeCase.documents || [];
  const selectedDoc = docs[state.activeDocIndex] || null;
  const allComments = (activeCase.comments || []).filter(c => c.status !== 'resolved');
  const variables = activeCase.variables || {};
  const docOverrides = selectedDoc?.variableOverrides || {};
  const effectiveVars = { ...variables, ...docOverrides };

  const docTemplate = selectedDoc?.templateId
    ? state.templates.find(t => t.id === selectedDoc.templateId)
    : null;

  const stageSuggestion = suggestStageAdvancement(activeCase.stage, docs);
  const docComments = allComments.filter(c => c.documentId === selectedDoc?.id);

  // Variable groups
  const varGroups = useMemo(() => groupVariables(variables), [variables]);
  const allVarKeys = Object.keys(variables);
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
    showToast(`Stage advanced to ${stageSuggestion.nextStage}`);
  }

  async function handleDocStatusChange(docId, newStatus) {
    await updateDocStatus(activeCase.id, docId, newStatus);
  }

  async function handleVarChange(key, value) {
    await updateCaseVariable(activeCase.id, key, value);
  }

  async function handleAddComment() {
    if (!newCommentText.trim()) return;
    const comment = {
      id: `cmt_${Date.now()}`,
      documentId: selectedDoc?.id,
      section: newCommentSection || 'General',
      author: state.user?.name || 'Unknown',
      text: newCommentText.trim(),
      status: 'open',
      createdAt: Date.now(),
    };
    await addComment(activeCase.id, comment);
    setNewCommentText('');
    setNewCommentSection('');
    showToast('Comment added');
  }

  async function handleResolveComment(commentId) {
    await resolveComment(activeCase.id, commentId);
  }

  async function handleApproveDoc() {
    if (!selectedDoc) return;
    await handleDocStatusChange(selectedDoc.id, 'ready');
    for (const c of docComments) {
      await handleResolveComment(c.id);
    }
    showToast('Document approved');
  }

  async function handleRequestChanges() {
    if (selectedDoc && selectedDoc.status !== 'review') {
      await handleDocStatusChange(selectedDoc.id, 'review');
      showToast('Changes requested');
    }
  }

  async function handleAddDocFromTemplate(template) {
    await addDocToCase(activeCase.id, template);
    setShowAddDoc(false);
    showToast(`Added: ${template.name}`);
  }

  const previewSections = docTemplate?.sections || [];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-7 py-4 flex items-center gap-3.5 flex-wrap">
        <button onClick={() => navigate(SCREENS.CASES)} className="text-[0.78rem] text-gray-400 hover:text-blue-500 cursor-pointer">
          &larr; My Cases
        </button>
        <span className="text-[1.1rem] font-bold">{activeCase.petitionerName}</span>
        <span className="text-[0.7rem] font-semibold px-[9px] py-[3px] rounded-[10px] text-white" style={{ background: STAGE_COLORS[activeCase.stage] || '#9ca3af' }}>
          {activeCase.stage}
        </span>
        <span className="text-[0.75rem] text-gray-400">
          {activeCase.circuit} &middot; {activeCase.facility}
        </span>
        <div className="flex-1" />
        {state.caseLoading && <span className="text-xs text-gray-400">Loading...</span>}

        {/* Right tab toggle for review */}
        <button
          onClick={() => setRightTab(rightTab === 'review' ? 'variables' : 'review')}
          className={`text-[0.78rem] font-semibold px-3 py-[5px] rounded-md border transition-colors ${
            rightTab === 'review'
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'border-gray-200 text-gray-500 hover:border-purple-300'
          }`}
        >
          {rightTab === 'review' ? 'Variables' : 'Review Mode'}
        </button>
        <button onClick={handleAdvanceStage} className="text-[0.78rem] font-semibold px-3 py-[5px] rounded-md border border-gray-200 text-gray-500 hover:border-gray-400">
          Advance Stage &rarr;
        </button>
        <div className="relative">
          <button onClick={() => setShowExport(!showExport)} className="bg-blue-500 text-white text-[0.78rem] font-semibold px-3 py-[5px] rounded-md hover:bg-blue-600">
            Export
          </button>
          {showExport && (
            <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-lg shadow-xl p-1 z-10 w-56">
              <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">This document</div>
              <button onClick={() => { exportDoc('docx', selectedDoc, effectiveVars, docTemplate); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Download as Word (.docx)</button>
              <button onClick={() => { exportDoc('pdf', selectedDoc, effectiveVars, docTemplate); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Download as PDF</button>
              <div className="border-t border-gray-100 my-1" />
              <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Full packet</div>
              <button onClick={() => { exportAll(activeCase); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">Download all ready docs (.zip)</button>
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
      {stageSuggestion && (
        <div className="mx-7 mt-3.5 px-[18px] py-3 bg-green-50 border border-green-200 rounded-[10px] flex items-center gap-3">
          <span className="text-green-700 text-[0.8rem] font-medium flex-1">
            {stageSuggestion.reason} &mdash; move to {stageSuggestion.nextStage}?
          </span>
          <button onClick={handleAcceptSuggestion} className="text-xs font-bold bg-green-600 text-white px-4 py-1.5 rounded-md hover:bg-green-700">
            Advance to {stageSuggestion.nextStage}
          </button>
          <button className="text-xs text-gray-500 hover:text-gray-700">Dismiss</button>
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
            <div className="mx-2 mb-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
              {state.templates.map(t => (
                <button key={t.id} onClick={() => handleAddDocFromTemplate(t)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0">
                  <div className="font-semibold text-gray-800">{t.name}</div>
                  <div className="text-gray-400">{t.category}</div>
                </button>
              ))}
              {state.templates.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">No templates</div>}
            </div>
          )}

          {/* Document list */}
          {docs.map((d, i) => (
            <div
              key={d.id}
              onClick={() => { dispatch({ type: 'SET_ACTIVE_DOC', index: i }); setShowExport(false); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100 cursor-pointer transition-colors ${
                state.activeDocIndex === i ? 'bg-blue-50' : 'hover:bg-[#f8f7f5]'
              }`}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[d.status] || '#9ca3af' }} />
              <div className="flex-1 min-w-0">
                <div className="text-[0.78rem] font-medium text-gray-900 truncate">{d.name}</div>
                <div className="text-[0.68rem] text-gray-400 mt-0.5">
                  {STATUS_LABELS[d.status]}
                  {d.status === 'review' && docComments.length > 0 && ` \u00b7 ${docComments.length} comment${docComments.length !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
          ))}

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
        <div className="flex-1 min-w-0 bg-[#f8f7f5] overflow-y-auto flex flex-col items-center p-6">
          {!selectedDoc || selectedDoc.status === 'empty' ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-600 mb-1">No template selected</div>
                <div className="text-xs text-gray-400 mb-4">Choose a template to start this document</div>
                <button onClick={() => setShowAddDoc(true)} className="text-xs font-semibold bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Browse Templates</button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-[14px] w-full max-w-[680px] px-12 py-10 shadow-sm min-h-[600px]">
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
                  <VarSpan vars={effectiveVars} varKey="WARDEN_NAME" fallback="Warden" />,<br />
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
                const isAnnotated = rightTab === 'review' && sectionComments.length > 0;
                return (
                  <div key={i} className={`mb-5 relative ${isAnnotated ? 'border-l-[3px] border-purple-500 pl-3 -ml-3.5' : ''}`}>
                    {isAnnotated && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-500 text-white text-[0.6rem] font-bold flex items-center justify-center">
                        {sectionComments.length}
                      </div>
                    )}
                    <div className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-gray-500 text-center mb-3" style={{ fontFamily: "'Source Serif 4', serif" }}>
                      {sec.name}
                    </div>
                    {sec.content ? (
                      <div className="text-[0.88rem] leading-[1.7] text-gray-900" style={{ fontFamily: "'Source Serif 4', serif" }}>
                        {renderContent(sec.content, effectiveVars)}
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

        {/* RIGHT PANEL: Variables or Review */}
        <div className="w-[300px] min-w-[300px] border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
          {rightTab === 'review' ? (
            /* Review Panel */
            <>
              <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.07em] text-gray-400">Review Comments</span>
                <span className="text-[0.7rem] text-gray-400">{docComments.length} open</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {docComments.map((c) => (
                  <div key={c.id} className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[0.7rem] font-semibold text-purple-700">{c.section}</span>
                      <span className="text-[0.62rem] font-semibold px-[7px] py-0.5 rounded-lg bg-purple-100 text-purple-600">{c.status}</span>
                    </div>
                    <div className="text-[0.78rem] text-gray-600 leading-relaxed">{c.text}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[0.68rem] text-gray-400">{c.author}</span>
                      {c.status === 'open' && (
                        <button onClick={() => handleResolveComment(c.id)} className="text-[0.68rem] text-green-600 font-semibold hover:underline cursor-pointer">Resolve</button>
                      )}
                    </div>
                  </div>
                ))}
                {docComments.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No comments on this document.</p>}
                {/* Add comment form */}
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <select value={newCommentSection} onChange={(e) => setNewCommentSection(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded" style={{ fontFamily: 'inherit' }}>
                    <option value="">Section...</option>
                    {(docTemplate?.sections || []).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    <option value="General">General</option>
                  </select>
                  <textarea value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Add a comment..." className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded resize-none" rows={3} style={{ fontFamily: 'inherit' }} />
                  <button onClick={handleAddComment} disabled={!newCommentText.trim()} className="w-full text-xs font-semibold border border-purple-300 text-purple-600 rounded-md py-2 hover:bg-purple-50 disabled:opacity-40">+ Add comment</button>
                </div>
                <div className="border-t border-gray-200 pt-2 flex gap-2">
                  <button onClick={handleApproveDoc} className="flex-1 text-xs font-bold bg-green-600 text-white rounded-md py-2 hover:bg-green-700">Approve</button>
                  <button onClick={handleRequestChanges} className="flex-1 text-xs font-bold border border-orange-300 text-orange-600 rounded-md py-2 hover:bg-orange-50">Changes</button>
                </div>
              </div>
            </>
          ) : (
            /* Variables Panel */
            <>
              <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.07em] text-gray-400">Case Variables</span>
                <span className="text-[0.7rem] text-gray-400">{filledVars.length}/{allVarKeys.length} filled</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {varGroups.map((g, gi) => {
                  const groupFilled = g.fields.filter(f => variables[f] && String(variables[f]).trim()).length;
                  const allFilled = groupFilled === g.fields.length;
                  return (
                    <div key={gi} className="px-4 py-3 border-b border-gray-100">
                      <div className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-gray-400 mb-2.5 flex items-center gap-1.5">
                        {g.name}
                        <span className={`font-medium text-[0.62rem] ${allFilled ? 'text-green-500' : 'text-amber-500'}`}>
                          {groupFilled}/{g.fields.length} {allFilled ? '\u2713' : '\u26A0'}
                        </span>
                      </div>
                      {g.fields.map((f) => {
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
                  );
                })}
                {allVarKeys.length === 0 && (
                  <div className="px-4 py-6 text-xs text-gray-400 text-center">No variables defined for this case yet.</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
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

function VarSpan({ vars, varKey, fallback }) {
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

function groupVariables(vars) {
  const groups = [];
  const keys = Object.keys(vars);
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

function renderContent(content, variables) {
  if (!content) return null;
  const parts = content.split(/(\{\{[A-Z_0-9]+\}\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{\{([A-Z_0-9]+)\}\}$/);
    if (match) {
      const val = variables[match[1]];
      return (
        <span key={i} className={val ? 'bg-green-50 border-b-2 border-green-300 px-[5px] rounded cursor-pointer hover:bg-green-100' : 'bg-amber-50 border-b-2 border-amber-300 px-[5px] rounded font-mono text-[0.78rem] text-amber-500 cursor-pointer hover:bg-amber-100'}>
          {val || `{{${match[1]}}}`}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
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

function exportDoc(format, doc, variables, template) {
  if (!doc || !template) {
    alert('No template associated with this document.');
    return;
  }
  let text = '';
  for (const sec of template.sections || []) {
    if (!sec.required && sec.condition && !evaluateCondition(sec.condition, variables)) continue;
    text += `\n=== ${sec.name} ===\n`;
    if (sec.content) {
      text += sec.content.replace(/\{\{([A-Z_0-9]+)\}\}/g, (_, key) => variables[key] || `[${key}]`);
    }
    text += '\n';
  }
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.name}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAll(activeCase) {
  const readyDocs = (activeCase.documents || []).filter(d => d.status === 'ready' || d.status === 'filed');
  alert(`Would export ${readyDocs.length} document(s) as a zip package.`);
}
