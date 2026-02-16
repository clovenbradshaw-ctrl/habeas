import { useState } from 'react';
import { useApp, SCREENS } from '../context/AppContext';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'petition', label: 'Petitions' },
  { id: 'motion', label: 'Motions' },
  { id: 'filing', label: 'Filing Docs' },
  { id: 'brief', label: 'Briefs' },
];

export default function TemplatesScreen() {
  const { state, navigate, openTemplate, openCase, showToast, createTemplate, forkTemplate, deleteTemplate, addDocToCase } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplCategory, setNewTplCategory] = useState('petition');
  const [newTplDesc, setNewTplDesc] = useState('');
  const [useCaseTarget, setUseCaseTarget] = useState(null);

  const templates = state.templates;
  const categoryCounts = {};
  CATEGORIES.forEach(c => {
    categoryCounts[c.id] = c.id === 'all' ? templates.length : templates.filter(t => t.category === c.id).length;
  });
  const filtered = selectedCategory === 'all' ? templates : templates.filter(t => t.category === selectedCategory);

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
    const newId = await forkTemplate(tpl.id);
    showToast(`Forked: ${tpl.name}`);
  }

  async function handleDeleteTemplate(tplId) {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    await deleteTemplate(tplId);
    showToast('Template deleted');
  }

  function handleUseInCase(template) {
    setUseCaseTarget(template);
  }

  async function handleSelectCaseForTemplate(caseId) {
    if (!useCaseTarget) return;
    await addDocToCase(caseId, useCaseTarget);
    setUseCaseTarget(null);
    showToast(`Added ${useCaseTarget.name} to case`);
    openCase(caseId);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Template Library</h2>
          <p className="text-sm text-gray-500">Shared document templates for the team</p>
        </div>
        <button
          onClick={() => setShowNewTemplate(true)}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Template
        </button>
      </div>

      {/* New template form */}
      {showNewTemplate && (
        <form onSubmit={handleCreateTemplate} className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Create New Template</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Template Name *</label>
              <input
                value={newTplName}
                onChange={(e) => setNewTplName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g., HC Petition (5th Circuit)"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
              <select
                value={newTplCategory}
                onChange={(e) => setNewTplCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="petition">Petition</option>
                <option value="motion">Motion</option>
                <option value="filing">Filing Doc</option>
                <option value="brief">Brief</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
              <input
                value={newTplDesc}
                onChange={(e) => setNewTplDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="Brief description of this template"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowNewTemplate(false)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              Create Template
            </button>
          </div>
        </form>
      )}

      {/* Category filter */}
      <div className="flex gap-1">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${selectedCategory === c.id ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {c.label} ({categoryCounts[c.id]})
          </button>
        ))}
      </div>

      {/* Case selector modal for "Use in case" */}
      {useCaseTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setUseCaseTarget(null)}>
          <div className="bg-white rounded-xl p-5 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Add "{useCaseTarget.name}" to case</h3>
            <p className="text-xs text-gray-500 mb-3">Select a case:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {state.cases.filter(c => c.stage !== 'Resolved').map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCaseForTemplate(c.id)}
                  className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-sm font-semibold text-gray-800">{c.petitionerName}</div>
                  <div className="text-xs text-gray-400">{c.stage} &middot; {c.circuit}</div>
                </button>
              ))}
              {state.cases.filter(c => c.stage !== 'Resolved').length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No active cases. Create a case first.</p>
              )}
            </div>
            <button onClick={() => setUseCaseTarget(null)} className="mt-3 w-full text-xs font-semibold border border-gray-200 rounded-lg py-2 text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">{t.sections?.length || 0} sections</span>
                  <span className="text-xs text-gray-400">{t.variables?.length || 0} variables</span>
                  <span className="text-xs text-gray-400">Used in {t.docs || 0} docs</span>
                  <span className="text-xs text-gray-400">Last: {formatLastUsed(t.lastUsed)}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => openTemplate(t.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleForkTemplate(t)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400"
                >
                  Fork
                </button>
                <button
                  onClick={() => handleDeleteTemplate(t.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleUseInCase(t)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Use in case
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No templates in this category.</div>
        )}
      </div>
    </div>
  );
}
