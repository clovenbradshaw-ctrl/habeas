import { useState, useCallback } from 'react';
import { useApp, SCREENS } from '../context/AppContext';
import Chip from '../components/Chip';
import { STAGE_CHIP_COLORS, STAGES } from '../lib/matrix';

const STATUS_COLORS = { ready: 'green', review: 'purple', draft: 'yellow', empty: 'gray' };
const STATUS_LABELS = { ready: 'Ready', review: 'In Review', draft: 'Draft', empty: 'Not started' };

export default function WorkspaceScreen() {
  const { state, dispatch, navigate, goBack, showToast, persistCaseMetadata, persistCaseData, persistDocument, persistComment } = useApp();
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

  // Count filled variables
  const allVarKeys = Object.keys(variables);
  const filledVars = allVarKeys.filter(k => variables[k] && variables[k].trim());

  // Get template for selected doc
  const docTemplate = selectedDoc?.templateId
    ? state.templates.find(t => t.id === selectedDoc.templateId)
    : null;

  // Variable groups derived from actual variables
  const varGroups = groupVariables(variables);

  function groupVariables(vars) {
    const groups = [];
    const keys = Object.keys(vars);
    const petitioner = keys.filter(k => k.startsWith('PETITIONER') || ['COUNTRY', 'ENTRY_DATE', 'YEARS_RESIDENCE', 'APPREHENSION_LOCATION', 'APPREHENSION_DATE', 'CRIMINAL_HISTORY', 'COMMUNITY_TIES'].includes(k));
    const detention = keys.filter(k => k.startsWith('DETENTION') || k.startsWith('FACILITY') || k.startsWith('WARDEN'));
    const court = keys.filter(k => k.startsWith('DISTRICT') || k.startsWith('DIVISION') || k.startsWith('COURT') || k.startsWith('CASE_') || k.startsWith('JUDGE') || k.startsWith('FILING'));
    const officials = keys.filter(k => k.startsWith('FOD') || k.startsWith('FIELD_OFFICE') || k.startsWith('ICE') || k.startsWith('DHS') || k.startsWith('AG_'));
    const attorneys = keys.filter(k => k.startsWith('ATTORNEY'));
    const used = new Set([...petitioner, ...detention, ...court, ...officials, ...attorneys]);
    const other = keys.filter(k => !used.has(k));

    if (petitioner.length) groups.push({ name: 'Petitioner', fields: petitioner });
    if (detention.length) groups.push({ name: 'Detention', fields: detention });
    if (court.length) groups.push({ name: 'Court', fields: court });
    if (officials.length) groups.push({ name: 'Officials', fields: officials });
    if (attorneys.length) groups.push({ name: 'Attorneys', fields: attorneys });
    if (other.length) groups.push({ name: 'Other', fields: other });
    return groups;
  }

  function handleAdvanceStage() {
    const idx = STAGES.indexOf(activeCase.stage);
    if (idx < STAGES.length - 1) {
      dispatch({ type: 'ADVANCE_STAGE', caseId: activeCase.id });
      persistCaseMetadata(activeCase.id, { ...activeCase, stage: STAGES[idx + 1], daysInStage: 0 });
      showToast(`Stage advanced to ${STAGES[idx + 1]}`);
    }
  }

  function handleDocStatusChange(docId, newStatus) {
    dispatch({ type: 'UPDATE_DOCUMENT_STATUS', caseId: activeCase.id, docId, status: newStatus });
    const doc = docs.find(d => d.id === docId);
    if (doc) persistDocument(activeCase.id, docId, { ...doc, status: newStatus });
  }

  function startEditVar(key) {
    setEditingVar(key);
    setEditingVarValue(variables[key] || '');
  }

  function saveVar() {
    if (editingVar) {
      dispatch({ type: 'UPDATE_CASE_VARIABLE', caseId: activeCase.id, key: editingVar, value: editingVarValue });
      persistCaseData(activeCase.id, { ...variables, [editingVar]: editingVarValue });
      setEditingVar(null);
    }
  }

  function handleAddComment() {
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
    dispatch({ type: 'ADD_COMMENT', caseId: activeCase.id, comment });
    persistComment(activeCase.id, comment.id, comment);
    setNewCommentText('');
    setNewCommentSection('');
    showToast('Comment added');
  }

  function handleResolveComment(commentId) {
    dispatch({ type: 'RESOLVE_COMMENT', caseId: activeCase.id, commentId });
    persistComment(activeCase.id, commentId, { status: 'resolved' });
  }

  function handleApproveDoc() {
    if (selectedDoc) {
      handleDocStatusChange(selectedDoc.id, 'ready');
      // Resolve all open comments for this doc
      comments
        .filter(c => c.documentId === selectedDoc.id)
        .forEach(c => handleResolveComment(c.id));
      showToast('Document approved');
    }
  }

  function handleRequestChanges() {
    if (selectedDoc && selectedDoc.status !== 'review') {
      handleDocStatusChange(selectedDoc.id, 'review');
      showToast('Changes requested');
    }
  }

  function handleAddDocFromTemplate(template) {
    const docId = `doc_${Date.now()}`;
    const doc = {
      id: docId,
      templateId: template.id,
      name: template.name,
      status: 'draft',
      sections: [],
    };
    dispatch({ type: 'ADD_DOCUMENT_TO_CASE', caseId: activeCase.id, doc });
    persistDocument(activeCase.id, docId, doc);
    setShowAddDoc(false);
    showToast(`Added: ${template.name}`);
  }

  function handleRemoveDoc(docId) {
    dispatch({ type: 'REMOVE_DOCUMENT_FROM_CASE', caseId: activeCase.id, docId });
    showToast('Document removed');
  }

  // Template sections for the preview
  const previewSections = docTemplate?.sections || [
    { name: 'INTRODUCTION' },
    { name: 'CUSTODY' },
    { name: 'JURISDICTION' },
    { name: 'STATEMENT OF FACTS' },
    { name: 'COUNT I' },
    { name: 'PRAYER FOR RELIEF' },
  ];

  const docComments = comments.filter(c => c.documentId === selectedDoc?.id);

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(SCREENS.CASES)} className="text-sm text-gray-500 hover:text-gray-800">
          &larr; Cases
        </button>
        <h2 className="text-lg font-bold text-gray-900">{activeCase.petitionerName}</h2>
        <Chip color={STAGE_CHIP_COLORS[activeCase.stage] || 'gray'}>{activeCase.stage}</Chip>
        {activeCase.circuit && <span className="text-xs text-gray-400">{activeCase.circuit}</span>}
        <div className="flex-1" />
        <button
          onClick={() => setShowReview(!showReview)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${showReview ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}
        >
          {showReview ? 'Exit Review' : 'Review Mode'}
        </button>
        <button
          onClick={handleAdvanceStage}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400 transition-colors"
        >
          Advance Stage &rarr;
        </button>
        <div className="relative">
          <button
            onClick={() => setShowExport(!showExport)}
            className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            Export
          </button>
          {showExport && (
            <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-lg shadow-xl p-1 z-10 w-56">
              <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">This document</div>
              <button onClick={() => { exportDoc('docx'); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">
                Download as Word (.docx)
              </button>
              <button onClick={() => { exportDoc('pdf'); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">
                Download as PDF
              </button>
              <div className="border-t border-gray-100 my-1" />
              <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Full packet</div>
              <button onClick={() => { exportAll('zip'); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">
                Download all ready docs (.zip)
              </button>
              <button onClick={() => { window.print(); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">
                Print packet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex gap-3" style={{ minHeight: 520 }}>
        {/* LEFT: Document list */}
        <div className="w-56 flex-shrink-0 space-y-1">
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
                    {d.status !== 'empty' && (
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
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-2 pb-2">
              <button
                onClick={() => setShowAddDoc(!showAddDoc)}
                className="w-full text-xs font-semibold text-blue-600 border border-dashed border-blue-300 rounded-lg py-2 hover:bg-blue-50"
              >
                + Add document from template
              </button>
              {showAddDoc && (
                <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                  {state.templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleAddDocFromTemplate(t)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-semibold text-gray-800">{t.name}</div>
                      <div className="text-gray-400">{t.category}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Document preview */}
        <div className="flex-1 min-w-0">
          <div className="border border-gray-200 rounded-lg bg-white h-full">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 pt-2">
              {selectedDoc?.name || 'No document selected'}
            </div>
            <div className="p-4">
              {!selectedDoc || selectedDoc.status === 'empty' ? (
                <div className="text-center py-16">
                  <div className="text-3xl mb-3">📄</div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">No template selected</div>
                  <div className="text-xs text-gray-400 mb-4">Choose a template to start this document</div>
                  <button
                    onClick={() => setShowAddDoc(true)}
                    className="text-xs font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Browse Templates
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Document header */}
                  <div className="text-center">
                    <div className="text-xs font-bold tracking-wide text-gray-700">UNITED STATES DISTRICT COURT</div>
                    <div className="text-xs text-gray-500">
                      FOR THE {(variables.DISTRICT_FULL || 'DISTRICT').toUpperCase()}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3" style={{ fontFamily: "'Source Serif 4', serif" }}>
                    {previewSections.map((sec, i) => {
                      const sectionComments = docComments.filter(c => c.section === sec.name);
                      return (
                        <div key={i} className="mb-4 group relative">
                          <div className="text-xs font-bold text-gray-500 tracking-wide mb-1 text-center">{sec.name}</div>
                          {/* Render template content with variable substitution */}
                          {sec.content ? (
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {renderContent(sec.content, variables)}
                            </p>
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
                        <button
                          onClick={() => handleResolveComment(c.id)}
                          className="text-xs text-green-600 font-semibold hover:underline"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {docComments.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No comments on this document.</p>
                )}

                {/* Add comment form */}
                <div className="border-t border-gray-200 pt-2 space-y-2">
                  <input
                    value={newCommentSection}
                    onChange={(e) => setNewCommentSection(e.target.value)}
                    placeholder="Section (e.g., INTRODUCTION)"
                    className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded"
                  />
                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded resize-none"
                    rows={3}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newCommentText.trim()}
                    className="w-full text-xs font-semibold border border-purple-300 text-purple-600 rounded-lg py-2 hover:bg-purple-50 disabled:opacity-40"
                  >
                    + Add comment
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-2 flex gap-2">
                  <button onClick={handleApproveDoc} className="flex-1 text-xs font-bold bg-green-600 text-white rounded-lg py-2 hover:bg-green-700">
                    Approve
                  </button>
                  <button onClick={handleRequestChanges} className="flex-1 text-xs font-bold border border-orange-300 text-orange-600 rounded-lg py-2 hover:bg-orange-50">
                    Changes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg bg-white h-full">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 pt-2">Shared Variables</div>
              <div className="p-3 space-y-2">
                <div className="text-xs text-gray-500 mb-2">
                  {filledVars.length}/{allVarKeys.length} filled &middot; shared across all docs
                </div>
                {varGroups.map((g, gi) => (
                  <div key={gi}>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{g.name}</div>
                    {g.fields.map((f) => (
                      <div key={f} className="text-xs py-0.5 px-2 rounded hover:bg-gray-50 cursor-pointer" onClick={() => startEditVar(f)}>
                        {editingVar === f ? (
                          <div className="flex gap-1">
                            <input
                              value={editingVarValue}
                              onChange={(e) => setEditingVarValue(e.target.value)}
                              onBlur={saveVar}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveVar(); if (e.key === 'Escape') setEditingVar(null); }}
                              className="flex-1 text-xs px-1 py-0.5 border border-blue-300 rounded"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span className={variables[f] ? 'text-gray-600' : 'text-yellow-600'}>
                            {f} {variables[f] ? '✓' : '⚠'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="text-xs text-gray-400">
                    Click any variable to edit. Empty fields shown with ⚠. Values are shared across all documents in this case.
                  </div>
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
  const parts = content.split(/(\{\{[A-Z_]+\}\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{\{([A-Z_]+)\}\}$/);
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

function exportDoc(format) {
  // In a real app this would generate the actual document
  alert(`Export as ${format} — this would generate the document using the filled template and variables.`);
}

function exportAll(format) {
  alert(`Export all ready docs as ${format} — this would package all documents with status "ready".`);
}
