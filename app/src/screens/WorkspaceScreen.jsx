import { useState } from 'react';
import { useApp, SCREENS } from '../context/AppContext';
import Chip from '../components/Chip';
import { STAGE_CHIP_COLORS, STAGES } from '../lib/matrix';
import { VARIABLE_GROUPS, suggestStageAdvancement } from '../lib/seedData';

const STATUS_COLORS = { filed: 'blue', ready: 'green', review: 'purple', draft: 'yellow', empty: 'gray' };
const STATUS_LABELS = { filed: 'Filed', ready: 'Ready', review: 'In Review', draft: 'Draft', empty: 'Not started' };

const DATE_FIELDS = ['ENTRY_DATE', 'APPREHENSION_DATE', 'FILING_DATE'];
const COUNTRY_FIELDS = ['PETITIONER_COUNTRY'];
const COUNTRIES = ['Afghanistan','Albania','Algeria','Argentina','Armenia','Azerbaijan','Bangladesh','Belarus','Belize','Bolivia','Bosnia and Herzegovina','Brazil','Burkina Faso','Burma (Myanmar)','Burundi','Cambodia','Cameroon','Chad','Chile','China','Colombia','Congo (DRC)','Costa Rica','Cuba','Dominican Republic','Ecuador','Egypt','El Salvador','Eritrea','Ethiopia','Gambia','Georgia','Ghana','Guatemala','Guinea','Guyana','Haiti','Honduras','India','Indonesia','Iran','Iraq','Ivory Coast','Jamaica','Jordan','Kazakhstan','Kenya','Kosovo','Kyrgyzstan','Laos','Lebanon','Liberia','Libya','Mali','Mauritania','Mexico','Moldova','Morocco','Nepal','Nicaragua','Niger','Nigeria','North Korea','Pakistan','Palestine','Panama','Paraguay','Peru','Philippines','Romania','Russia','Rwanda','Senegal','Sierra Leone','Somalia','South Korea','South Sudan','Sri Lanka','Sudan','Syria','Tajikistan','Tanzania','Thailand','Togo','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Uganda','Ukraine','Uzbekistan','Venezuela','Vietnam','Yemen','Zimbabwe'];

export default function WorkspaceScreen() {
  const {
    state, dispatch, navigate, showToast,
    advanceStage, updateCaseVariable, updateDocStatus, updateDocOverride,
    addDocToCase, addComment, resolveComment, moveCaseToStage,
  } = useApp();

  const [showReview, setShowReview] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingVar, setEditingVar] = useState(null);
  const [editingVarValue, setEditingVarValue] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentSection, setNewCommentSection] = useState('');
  const [showAddDoc, setShowAddDoc] = useState(false);

  const activeCase = state.cases.find(c => c.id === state.activeCaseId);
  if (!activeCase) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No case selected.</p>
        <button onClick={() => navigate(SCREENS.CASES)} className="mt-2 text-blue-600 text-sm">Back to cases</button>
      </div>
    );
  }

  const docs = activeCase.documents || [];
  const selectedDoc = docs[state.activeDocIndex] || null;
  const comments = (activeCase.comments || []).filter(c => c.status !== 'resolved');
  const variables = activeCase.variables || {};

  // Merge document-level overrides on top of shared variables for rendering
  const docOverrides = selectedDoc?.variableOverrides || {};
  const effectiveVars = { ...variables, ...docOverrides };
  const hasOverrides = Object.keys(docOverrides).some(k => docOverrides[k]);

  const allVarKeys = Object.keys(variables);
  const filledVars = allVarKeys.filter(k => variables[k] && String(variables[k]).trim());

  const docTemplate = selectedDoc?.templateId
    ? state.templates.find(t => t.id === selectedDoc.templateId)
    : null;

  // Stage suggestion based on document state (Phase 3)
  const stageSuggestion = suggestStageAdvancement(activeCase.stage, docs);

  const varGroups = groupVariables(variables);

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
    if (officials.length) groups.push({ name: 'Officials', fields: officials });
    if (attorneys.length) groups.push({ name: 'Attorneys', fields: attorneys });
    if (ausa.length) groups.push({ name: 'Opposing Counsel', fields: ausa });
    if (other.length) groups.push({ name: 'Other', fields: other });
    return groups;
  }

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

  function startEditVar(key) {
    setEditingVar(key);
    setEditingVarValue(variables[key] || '');
  }

  async function saveVar() {
    if (editingVar) {
      await updateCaseVariable(activeCase.id, editingVar, editingVarValue);
      setEditingVar(null);
    }
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
    const docComments = comments.filter(c => c.documentId === selectedDoc.id);
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

  const previewSections = docTemplate?.sections || [
    { name: 'INTRODUCTION' }, { name: 'CUSTODY' }, { name: 'JURISDICTION' },
    { name: 'STATEMENT OF FACTS' }, { name: 'COUNT I' }, { name: 'PRAYER FOR RELIEF' },
  ];

  const docComments = comments.filter(c => c.documentId === selectedDoc?.id);

  // Template lineage info
  const parentTemplate = docTemplate?.parentId ? state.templates.find(t => t.id === docTemplate.parentId) : null;

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(SCREENS.CASES)} className="text-sm text-gray-500 hover:text-gray-800">&larr; Cases</button>
        <h2 className="text-lg font-bold text-gray-900">{activeCase.petitionerName}</h2>
        <Chip color={STAGE_CHIP_COLORS[activeCase.stage] || 'gray'}>{activeCase.stage}</Chip>
        {activeCase.circuit && <span className="text-xs text-gray-400">{activeCase.circuit}</span>}
        <div className="flex-1" />
        {state.caseLoading && <span className="text-xs text-gray-400">Loading case data...</span>}
        <button
          onClick={() => setShowReview(!showReview)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${showReview ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}
        >
          {showReview ? 'Exit Review' : 'Review Mode'}
        </button>
        <button onClick={handleAdvanceStage} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400">
          Advance Stage &rarr;
        </button>
        <div className="relative">
          <button onClick={() => setShowExport(!showExport)} className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700">Export</button>
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

      {/* Stage suggestion banner (Phase 3) */}
      {stageSuggestion && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 flex items-center gap-3">
          <span className="text-green-700 text-sm font-semibold flex-1">
            {stageSuggestion.reason} &mdash; move to {stageSuggestion.nextStage}?
          </span>
          <button onClick={handleAcceptSuggestion} className="text-xs font-bold bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700">
            Advance to {stageSuggestion.nextStage}
          </button>
          <button onClick={() => {}} className="text-xs text-gray-500 hover:text-gray-700">Dismiss</button>
        </div>
      )}

      {/* Three-panel layout */}
      <div className="flex gap-3" style={{ minHeight: 520 }}>
        {/* LEFT: Document list */}
        <div className="w-56 flex-shrink-0">
          <div className="border border-gray-200 rounded-lg bg-white">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 pt-2 pb-1">Case Documents</div>
            <div className="px-2 pb-2 space-y-0.5">
              {docs.map((d, i) => (
                <div
                  key={d.id}
                  onClick={() => { dispatch({ type: 'SET_ACTIVE_DOC', index: i }); setShowExport(false); }}
                  className={`px-3 py-2.5 rounded-lg cursor-pointer transition-all text-left ${state.activeDocIndex === i ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}
                >
                  <div className="text-xs font-semibold text-gray-800 leading-tight mb-1">{d.name}</div>
                  <div className="flex items-center gap-1.5">
                    <Chip color={STATUS_COLORS[d.status]}>{STATUS_LABELS[d.status]}</Chip>
                    <select
                      value={d.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); handleDocStatusChange(d.id, e.target.value); }}
                      className="text-xs text-gray-400 bg-transparent border-none cursor-pointer p-0"
                    >
                      <option value="empty">Not started</option>
                      <option value="draft">Draft</option>
                      <option value="review">In Review</option>
                      <option value="ready">Ready</option>
                      <option value="filed">Filed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-2 pb-2">
              <button onClick={() => setShowAddDoc(!showAddDoc)} className="w-full text-xs font-semibold text-blue-600 border border-dashed border-blue-300 rounded-lg py-2 hover:bg-blue-50">
                + Add document from template
              </button>
              {showAddDoc && (
                <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                  {state.templates.map(t => (
                    <button key={t.id} onClick={() => handleAddDocFromTemplate(t)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0">
                      <div className="font-semibold text-gray-800">{t.name}</div>
                      <div className="text-gray-400">{t.category}{t.parentId ? ' (fork)' : ''}</div>
                    </button>
                  ))}
                  {state.templates.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">No templates available</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Document preview */}
        <div className="flex-1 min-w-0">
          <div className="border border-gray-200 rounded-lg bg-white h-full">
            <div className="flex items-center gap-2 px-3 pt-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex-1">
                {selectedDoc?.name || 'No document selected'}
              </div>
              {parentTemplate && (
                <span className="text-xs text-gray-400">Based on {parentTemplate.name}</span>
              )}
              {hasOverrides && (
                <Chip color="orange">Has overrides</Chip>
              )}
            </div>
            <div className="p-4">
              {!selectedDoc || selectedDoc.status === 'empty' ? (
                <div className="text-center py-16">
                  <div className="text-sm font-semibold text-gray-600 mb-1">No template selected</div>
                  <div className="text-xs text-gray-400 mb-4">Choose a template to start this document</div>
                  <button onClick={() => setShowAddDoc(true)} className="text-xs font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Browse Templates</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-xs font-bold tracking-wide text-gray-700">UNITED STATES DISTRICT COURT</div>
                    <div className="text-xs text-gray-500">FOR THE {(effectiveVars.DISTRICT_FULL || 'DISTRICT').toUpperCase()}</div>
                  </div>
                  <div className="border-t border-gray-200 pt-3" style={{ fontFamily: "'Source Serif 4', serif" }}>
                    {previewSections.map((sec, i) => {
                      // Evaluate conditional sections
                      if (!sec.required && sec.condition) {
                        if (!evaluateCondition(sec.condition, effectiveVars)) return null;
                      }
                      const sectionComments = docComments.filter(c => c.section === sec.name);
                      return (
                        <div key={i} className="mb-4 group relative">
                          <div className="text-xs font-bold text-gray-500 tracking-wide mb-1 text-center">{sec.name}</div>
                          {sec.content ? (
                            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{renderContent(sec.content, effectiveVars)}</p>
                          ) : (
                            <>
                              <div className="h-2 bg-gray-100 rounded-full w-full mb-0.5" />
                              <div className="h-2 bg-gray-100 rounded-full w-11/12 mb-0.5" />
                              <div className="h-2 bg-gray-100 rounded-full w-10/12" />
                            </>
                          )}
                          {showReview && sectionComments.length > 0 && (
                            <div className="absolute -right-2 top-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {sectionComments.length}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Variables or Review panel */}
        <div className="w-60 flex-shrink-0">
          {showReview ? (
            <div className="border border-gray-200 rounded-lg bg-white h-full">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 pt-2">Review Comments</div>
              <div className="p-3 space-y-3">
                {docComments.map((c) => (
                  <div key={c.id} className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-purple-700">{c.section}</span>
                      <Chip color="purple">{c.status}</Chip>
                    </div>
                    <div className="text-xs text-gray-700 leading-relaxed">{c.text}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{c.author}</span>
                      {c.status === 'open' && (
                        <button onClick={() => handleResolveComment(c.id)} className="text-xs text-green-600 font-semibold hover:underline">Resolve</button>
                      )}
                    </div>
                  </div>
                ))}
                {docComments.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No comments on this document.</p>}
                <div className="border-t border-gray-200 pt-2 space-y-2">
                  <select value={newCommentSection} onChange={(e) => setNewCommentSection(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded">
                    <option value="">Section...</option>
                    {(docTemplate?.sections || []).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    <option value="General">General</option>
                  </select>
                  <textarea value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Add a comment..." className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded resize-none" rows={3} />
                  <button onClick={handleAddComment} disabled={!newCommentText.trim()} className="w-full text-xs font-semibold border border-purple-300 text-purple-600 rounded-lg py-2 hover:bg-purple-50 disabled:opacity-40">+ Add comment</button>
                </div>
                <div className="border-t border-gray-200 pt-2 flex gap-2">
                  <button onClick={handleApproveDoc} className="flex-1 text-xs font-bold bg-green-600 text-white rounded-lg py-2 hover:bg-green-700">Approve</button>
                  <button onClick={handleRequestChanges} className="flex-1 text-xs font-bold border border-orange-300 text-orange-600 rounded-lg py-2 hover:bg-orange-50">Changes</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg bg-white h-full overflow-y-auto" style={{ maxHeight: 520 }}>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 pt-2">Shared Variables</div>
              <div className="p-3 space-y-2">
                <div className="text-xs text-gray-500 mb-2">{filledVars.length}/{allVarKeys.length} filled</div>
                {varGroups.map((g, gi) => (
                  <div key={gi}>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{g.name}</div>
                    {g.fields.map((f) => {
                      const isOverridden = docOverrides[f] !== undefined && docOverrides[f] !== '';
                      return (
                        <div key={f} className="text-xs py-0.5 px-2 rounded hover:bg-gray-50 cursor-pointer" onClick={() => startEditVar(f)}>
                          {editingVar === f ? (
                            <input
                              value={editingVarValue}
                              onChange={(e) => setEditingVarValue(e.target.value)}
                              onBlur={saveVar}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveVar(); if (e.key === 'Escape') setEditingVar(null); }}
                              className="w-full text-xs px-1 py-0.5 border border-blue-300 rounded"
                              autoFocus
                            />
                          ) : (
                            <span className={variables[f] ? (isOverridden ? 'text-orange-600' : 'text-gray-600') : 'text-yellow-600'}>
                              {f} {variables[f] ? '\u2713' : '\u26A0'} {isOverridden ? '(doc)' : ''}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                {allVarKeys.length === 0 && (
                  <p className="text-xs text-gray-400">No variables defined for this case yet.</p>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="text-xs text-gray-400">Click any variable to edit. Values are shared across all documents in this case.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderContent(content, variables) {
  if (!content) return null;
  const parts = content.split(/(\{\{[A-Z_0-9]+\}\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{\{([A-Z_0-9]+)\}\}$/);
    if (match) {
      const val = variables[match[1]];
      return (
        <span key={i} className={val ? 'bg-green-100 border-b-2 border-green-400 px-1 rounded' : 'bg-yellow-100 border-b-2 border-yellow-400 px-1 rounded'}>
          {val || `{{${match[1]}}}`}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function evaluateCondition(condition, variables) {
  if (!condition) return true;
  // Simple condition evaluator: "VAR > 180" or "HAS_VAR"
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
  // Boolean: just check if variable is truthy
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
  a.download = `${doc.name}.${format === 'pdf' ? 'txt' : 'txt'}`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAll(activeCase) {
  const readyDocs = (activeCase.documents || []).filter(d => d.status === 'ready' || d.status === 'filed');
  alert(`Would export ${readyDocs.length} document(s) as a zip package.`);
}
