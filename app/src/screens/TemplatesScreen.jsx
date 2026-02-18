import { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { importTemplate } from '../lib/fileImport';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'petition', label: 'Petitions' },
  { id: 'motion', label: 'Motions' },
  { id: 'filing', label: 'Filing Docs' },
  { id: 'brief', label: 'Briefs' },
];

export default function TemplatesScreen() {
  const { state, openTemplate, openCase, showToast, createTemplate, forkTemplate, deleteTemplate, archiveTemplate, unarchiveTemplate, addDocToCase } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplCategory, setNewTplCategory] = useState('petition');
  const [newTplDesc, setNewTplDesc] = useState('');
  const [useCaseTarget, setUseCaseTarget] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState(null);
  const [importMode, setImportMode] = useState('html_semantic');
  const importInputRef = useRef(null);

  const isAdmin = state.role === 'admin';

  // Cases filtered by ownership for "Use in case" modal
  const myCases = useMemo(() => {
    return state.cases.filter(c => {
      if (!state.connected) return true;
      if (isAdmin) return true;
      return c.owner === state.user?.userId;
    });
  }, [state.cases, state.connected, state.user?.userId, isAdmin]);

  const allTemplates = state.templates;
  const templates = showArchived ? allTemplates.filter(t => t.archived) : allTemplates.filter(t => !t.archived);
  const archivedCount = allTemplates.filter(t => t.archived).length;

  // Search + category filter
  const filtered = useMemo(() => {
    let list = templates;
    if (selectedCategory !== 'all') {
      list = list.filter(t => t.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.desc || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, selectedCategory, search]);

  const categoryCounts = {};
  CATEGORIES.forEach(c => {
    categoryCounts[c.id] = c.id === 'all' ? templates.length : templates.filter(t => t.category === c.id).length;
  });

  async function handleCreateTemplate(e) {
    e.preventDefault();
    if (!newTplName.trim()) return;
    const id = await createTemplate({
      name: newTplName.trim(),
      category: newTplCategory,
      desc: newTplDesc.trim(),
      sections: [
        { id: `s_${Date.now()}`, name: 'Introduction', required: true, paraCount: 1, content: '' },
      ],
      variables: [],
    });
    setShowNewTemplate(false);
    setNewTplName('');
    setNewTplDesc('');
    showToast('Template created');
    openTemplate(id);
  }

  async function handleForkTemplate(tpl) {
    await forkTemplate(tpl.id);
    showToast(`Forked: ${tpl.name}`);
  }

  async function handleDeleteTemplate(tplId) {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    await deleteTemplate(tplId);
    showToast('Template deleted');
  }

  async function handleSelectCaseForTemplate(caseId) {
    if (!useCaseTarget) return;
    await addDocToCase(caseId, useCaseTarget);
    setUseCaseTarget(null);
    showToast(`Added ${useCaseTarget.name} to case`);
    openCase(caseId);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setImportMode('pdf_reading');
    else setImportMode('html_semantic');
    setPendingImportFile(file);
  }

  async function handleConfirmImport() {
    if (!pendingImportFile) return;
    setImporting(true);
    try {
      const template = await importTemplate(pendingImportFile, {}, { renderMode: importMode });
      const id = await createTemplate({
        ...template,
        sourceDataUrl: template.sourceDataUrl || null,
        sourceFileType: template.sourceFileType || null,
      });
      showToast('Template created from imported file');
      openTemplate(id);
      setPendingImportFile(null);
    } catch (err) {
      showToast(err.message || 'Failed to import file', true);
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  }

  function formatLastUsed(ts) {
    if (!ts) return 'Never';
    const diff = Date.now() - ts;
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[1.2rem] font-bold text-gray-900">Template Library</h2>
          <p className="text-[0.82rem] text-gray-500 mt-0.5">
            {showArchived
              ? `${archivedCount} archived template${archivedCount !== 1 ? 's' : ''}`
              : 'Shared document templates for the team'
            }
          </p>
        </div>
        <div className="flex gap-2">
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`inline-flex items-center gap-1.5 text-[0.8rem] font-semibold px-4 py-2 rounded-md border transition-colors ${
                showArchived
                  ? 'bg-gray-100 border-gray-300 text-gray-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {showArchived ? 'Show Active' : `Archived (${archivedCount})`}
            </button>
          )}
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-[0.8rem] font-semibold px-4 py-2 rounded-md hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            {importing ? 'Importing\u2026' : 'Import from File'}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.json,.md,.markdown,.txt,.text"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => setShowNewTemplate(true)}
            className="inline-flex items-center gap-1.5 bg-blue-500 text-white text-[0.8rem] font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            + New Template
          </button>
        </div>
      </div>


      {pendingImportFile && (
        <div className="mb-4 bg-white border border-gray-200 rounded-[12px] p-4">
          <div className="text-[0.82rem] font-semibold text-gray-800 mb-2">Import mode for {pendingImportFile.name}</div>
          <select
            value={importMode}
            onChange={(e) => setImportMode(e.target.value)}
            className="w-full max-w-[460px] px-3 py-2 border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
          >
            {pendingImportFile.name.toLowerCase().endsWith('.docx') && (
              <option value="html_semantic">Word (DOCX) → HTML (formatted)</option>
            )}
            {pendingImportFile.name.toLowerCase().endsWith('.pdf') && (
              <option value="pdf_reading">PDF → HTML (editable, reading order)</option>
            )}
            {pendingImportFile.name.toLowerCase().endsWith('.pdf') && (
              <option value="pdf_positioned">PDF → HTML (layout-preserving positioned text)</option>
            )}
          </select>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setPendingImportFile(null)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleConfirmImport} disabled={importing} className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-semibold disabled:opacity-50">{importing ? 'Importing…' : 'Import Template'}</button>
          </div>
        </div>
      )}
      {/* New template form */}
      {showNewTemplate && (
        <form onSubmit={handleCreateTemplate} className="bg-white border border-blue-200 rounded-[14px] p-5 space-y-3 mb-5">
          <h3 className="text-[0.9rem] font-semibold">Create New Template</h3>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[0.72rem] font-semibold text-gray-500">Template Name *</label>
              <input
                value={newTplName}
                onChange={(e) => setNewTplName(e.target.value)}
                className="px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
                placeholder="e.g., HC Petition (5th Circuit)"
                autoFocus
                style={{ fontFamily: 'inherit' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.72rem] font-semibold text-gray-500">Category</label>
              <select
                value={newTplCategory}
                onChange={(e) => setNewTplCategory(e.target.value)}
                className="px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
                style={{ fontFamily: 'inherit' }}
              >
                <option value="petition">Petition</option>
                <option value="motion">Motion</option>
                <option value="filing">Filing Doc</option>
                <option value="brief">Brief</option>
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[0.72rem] font-semibold text-gray-500">Description</label>
              <input
                value={newTplDesc}
                onChange={(e) => setNewTplDesc(e.target.value)}
                className="px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
                placeholder="Brief description of this template"
                style={{ fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowNewTemplate(false)} className="text-[0.78rem] font-semibold px-3 py-[5px] rounded-md border border-gray-200 text-gray-500 hover:border-gray-400">
              Cancel
            </button>
            <button type="submit" className="text-[0.78rem] font-semibold px-4 py-[5px] rounded-md bg-blue-500 text-white hover:bg-blue-600">
              Create Template
            </button>
          </div>
        </form>
      )}

      {/* Toolbar: search + filters */}
      <div className="flex items-center gap-2.5 mb-[18px]">
        <div className="flex-1 max-w-[360px] relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[0.82rem]">{'\u2315'}</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates by name or description\u2026"
            className="w-full py-2 px-3 pl-[34px] border border-gray-200 rounded-md text-[0.8rem] bg-white outline-none focus:border-blue-300 transition-colors"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3.5 py-2 border rounded-md text-[0.78rem] font-medium transition-all ${
              selectedCategory === c.id
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
            }`}
            style={{ fontFamily: 'inherit' }}
          >
            {c.label} ({categoryCounts[c.id]})
          </button>
        ))}
      </div>

      {/* Case selector modal */}
      {useCaseTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={() => setUseCaseTarget(null)}>
          <div className="bg-white rounded-[14px] p-5 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[0.9rem] font-semibold mb-1">Add &ldquo;{useCaseTarget.name}&rdquo; to case</h3>
            <p className="text-[0.75rem] text-gray-500 mb-3">Select a case:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {myCases.filter(c => c.stage !== 'Resolved').map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCaseForTemplate(c.id)}
                  className="w-full text-left px-3 py-2.5 border border-gray-200 rounded-[10px] hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-[0.82rem] font-semibold text-gray-800">{c.petitionerName}</div>
                  <div className="text-[0.72rem] text-gray-400">{c.stage} &middot; {c.circuit}</div>
                </button>
              ))}
              {myCases.filter(c => c.stage !== 'Resolved').length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No active cases.</p>
              )}
            </div>
            <button onClick={() => setUseCaseTarget(null)} className="mt-3 w-full text-[0.78rem] font-semibold border border-gray-200 rounded-md py-2 text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template cards */}
      <div className="flex flex-col gap-2.5">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-[14px] px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-[0.95rem] font-semibold text-gray-900">{t.name}</div>
                <div className="text-[0.78rem] text-gray-500 mt-0.5">{t.desc}</div>
                {t.parentId && (
                  <div className="text-[0.72rem] text-purple-500 mt-0.5">
                    Forked from: {state.templates.find(p => p.id === t.parentId)?.name || t.parentId}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[0.72rem] text-gray-400">{t.sections?.length || 0} sections</span>
                  <span className="text-[0.72rem] text-gray-400">{t.variables?.length || 0} variables</span>
                  <span className="text-[0.72rem] text-gray-400">Last: {formatLastUsed(t.lastUsed)}</span>
                </div>
              </div>
              <div className="flex gap-1.5 ml-4 flex-shrink-0">
                {showArchived ? (
                  <button
                    onClick={() => unarchiveTemplate(t.id)}
                    className="text-[0.75rem] font-semibold px-3 py-[5px] rounded-md bg-blue-500 text-white hover:bg-blue-600"
                  >
                    Restore
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => openTemplate(t.id)}
                      className="text-[0.75rem] font-semibold px-3 py-[5px] rounded-md border border-gray-200 text-gray-500 hover:border-gray-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleForkTemplate(t)}
                      className="text-[0.75rem] font-semibold px-3 py-[5px] rounded-md border border-gray-200 text-gray-500 hover:border-gray-400"
                    >
                      Fork
                    </button>
                    <button
                      onClick={() => archiveTemplate(t.id)}
                      className="text-[0.75rem] font-semibold px-3 py-[5px] rounded-md border border-gray-200 text-gray-500 hover:border-gray-400"
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="text-[0.75rem] font-semibold px-3 py-[5px] rounded-md border border-gray-200 text-gray-500 hover:border-gray-400"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setUseCaseTarget(t)}
                      className="text-[0.75rem] font-semibold px-3 py-[5px] rounded-md bg-blue-500 text-white hover:bg-blue-600"
                    >
                      Use in case
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-[0.82rem]">{search ? 'No templates match your search.' : 'No templates in this category.'}</div>
        )}
      </div>
    </div>
  );
}
