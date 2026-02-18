import { useState, useRef } from 'react';
import { useApp, SCREENS } from '../context/AppContext';
import { parseImportedFile } from '../lib/fileImport';
import { VARIABLE_GROUPS } from '../lib/seedData';

export default function TemplateEditScreen() {
  const { state, dispatch, navigate, showToast, saveTemplateNow } = useApp();
  const importSectionRef = useRef(null);
  const [importingSec, setImportingSec] = useState(false);
  const [showOriginalPdf, setShowOriginalPdf] = useState(true);

  const template = state.templates.find(t => t.id === state.activeTemplateId);
  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No template selected.</p>
        <button onClick={() => navigate(SCREENS.TEMPLATES)} className="mt-2 text-blue-600 text-sm">Back to templates</button>
      </div>
    );
  }

  const sections = template.sections || [];
  const hasPdfSource = template.sourceFileType === 'pdf' && !!template.sourceDataUrl;
  const selectedIdx = state.activeTemplateSection;
  const selectedSection = sections[selectedIdx] || null;

  // Collect all variables used across all sections
  const allVariables = new Set();
  sections.forEach(s => {
    if (s.content) {
      const matches = s.content.match(/\{\{([A-Z_0-9]+)\}\}/g);
      if (matches) matches.forEach(m => allVariables.add(m.replace(/[{}]/g, '')));
    }
  });

  const canonicalVariables = VARIABLE_GROUPS.flatMap(group => group.variables);
  const availableVariables = Array.from(new Set([
    ...(template.variables || []),
    ...canonicalVariables,
    ...Array.from(allVariables),
  ]));

  function handleSave() {
    saveTemplateNow(template.id);
  }

  function handleSectionSelect(idx) {
    dispatch({ type: 'SET_ACTIVE_TEMPLATE_SECTION', index: idx });
  }

  function handleSectionNameChange(value) {
    dispatch({ type: 'UPDATE_TEMPLATE_SECTION', templateId: template.id, sectionIndex: selectedIdx, data: { name: value } });
  }

  function handleSectionContentChange(value) {
    dispatch({ type: 'UPDATE_TEMPLATE_SECTION', templateId: template.id, sectionIndex: selectedIdx, data: { content: value } });
  }

  function handleSectionRequiredToggle() {
    dispatch({ type: 'UPDATE_TEMPLATE_SECTION', templateId: template.id, sectionIndex: selectedIdx, data: { required: !selectedSection.required } });
  }

  function handleSectionConditionChange(value) {
    dispatch({ type: 'UPDATE_TEMPLATE_SECTION', templateId: template.id, sectionIndex: selectedIdx, data: { condition: value } });
  }

  function handleAddSection() {
    const newSection = {
      id: `s_${Date.now()}`,
      name: 'New Section',
      required: true,
      paraCount: 1,
      content: '',
    };
    dispatch({ type: 'ADD_TEMPLATE_SECTION', templateId: template.id, section: newSection });
    dispatch({ type: 'SET_ACTIVE_TEMPLATE_SECTION', index: sections.length });
  }

  function handleRemoveSection() {
    if (sections.length <= 1) {
      showToast('Cannot remove the last section', true);
      return;
    }
    if (!confirm(`Remove section "${selectedSection.name}"?`)) return;
    dispatch({ type: 'REMOVE_TEMPLATE_SECTION', templateId: template.id, sectionIndex: selectedIdx });
    dispatch({ type: 'SET_ACTIVE_TEMPLATE_SECTION', index: Math.max(0, selectedIdx - 1) });
  }

  function handleMoveSection(direction) {
    const newIdx = selectedIdx + direction;
    if (newIdx < 0 || newIdx >= sections.length) return;
    dispatch({ type: 'REORDER_TEMPLATE_SECTIONS', templateId: template.id, fromIndex: selectedIdx, toIndex: newIdx });
    dispatch({ type: 'SET_ACTIVE_TEMPLATE_SECTION', index: newIdx });
  }

  function insertVariableToken(varName) {
    if (!selectedSection || !varName) return;
    const insertion = `{{${varName}}}`;
    const ta = document.getElementById('section-content-editor');
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = selectedSection.content || '';
      const newText = text.slice(0, start) + insertion + text.slice(end);
      handleSectionContentChange(newText);
      requestAnimationFrame(() => {
        ta.focus();
        const cursor = start + insertion.length;
        ta.setSelectionRange(cursor, cursor);
      });
      return;
    }
    handleSectionContentChange((selectedSection.content || '') + insertion);
  }


  async function handleImportToSection(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingSec(true);
    try {
      const { text } = await parseImportedFile(file);
      if (selectedSection) {
        // Replace current section content with imported text
        handleSectionContentChange(text);
        showToast(`Imported into "${selectedSection.name}"`);
      } else {
        // Create a new section with the imported content
        const name = file.name.replace(/\.[^.]+$/, '');
        const newSection = {
          id: `s_${Date.now()}`,
          name,
          required: true,
          paraCount: text.split(/\n{2,}/).length,
          content: text,
        };
        dispatch({ type: 'ADD_TEMPLATE_SECTION', templateId: template.id, section: newSection });
        dispatch({ type: 'SET_ACTIVE_TEMPLATE_SECTION', index: sections.length });
        showToast(`Imported as new section "${name}"`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to import file', true);
    } finally {
      setImportingSec(false);
      if (importSectionRef.current) importSectionRef.current.value = '';
    }
  }

  function handleTemplateNameChange(value) {
    dispatch({ type: 'UPDATE_TEMPLATE', templateId: template.id, data: { name: value } });
  }

  function handleTemplateCategoryChange(value) {
    dispatch({ type: 'UPDATE_TEMPLATE', templateId: template.id, data: { category: value } });
  }

  function handleTemplateDescChange(value) {
    dispatch({ type: 'UPDATE_TEMPLATE', templateId: template.id, data: { desc: value } });
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(SCREENS.TEMPLATES)} className="text-sm text-gray-500 hover:text-gray-800">
          &larr; Templates
        </button>
        <h2 className="text-lg font-bold text-gray-900">Edit: {template.name}</h2>
        <div className="flex-1" />
        <div className="flex gap-2">
          <select
            value={template.category}
            onChange={(e) => handleTemplateCategoryChange(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border border-gray-200"
          >
            <option value="petition">Petition</option>
            <option value="motion">Motion</option>
            <option value="filing">Filing Doc</option>
            <option value="brief">Brief</option>
          </select>
          <button onClick={handleSave} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            Save Template
          </button>
        </div>
      </div>

      {/* Template meta */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Template Name</label>
          <input
            value={template.name}
            onChange={(e) => handleTemplateNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
          <input
            value={template.desc || ''}
            onChange={(e) => handleTemplateDescChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-3" style={{ minHeight: 480 }}>
        {/* Section list */}
        <div className="w-52 flex-shrink-0">
          <div className="border border-gray-200 rounded-lg bg-white">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 pt-2 pb-1">Sections</div>
            <div className="px-2 pb-2 space-y-0.5">
              {sections.map((s, i) => (
                <div
                  key={s.id || i}
                  onClick={() => handleSectionSelect(i)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-all ${selectedIdx === i ? 'bg-blue-50 border border-blue-200 font-bold text-blue-800' : 'hover:bg-gray-50 text-gray-700 border border-transparent'}`}
                >
                  <span className="flex-shrink-0 w-4 text-center">{s.required ? '■' : '☐'}</span>
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="text-gray-400">{s.paraCount || 1}¶</span>
                </div>
              ))}
            </div>
            <div className="px-2 pb-2 space-y-1">
              <button onClick={handleAddSection} className="w-full text-xs font-semibold text-blue-600 border border-dashed border-blue-300 rounded-lg py-1.5 hover:bg-blue-50">
                + Add section
              </button>
              <button
                onClick={() => {
                  // Temporarily deselect so import creates a new section
                  dispatch({ type: 'SET_ACTIVE_TEMPLATE_SECTION', index: -1 });
                  setTimeout(() => importSectionRef.current?.click(), 0);
                }}
                disabled={importingSec}
                className="w-full text-xs font-semibold text-gray-500 border border-dashed border-gray-300 rounded-lg py-1.5 hover:bg-gray-50"
              >
                {importingSec ? 'Importing\u2026' : 'Import section'}
              </button>
            </div>
          </div>
        </div>

        {/* Section editor */}
        <div className="flex-1 min-w-0 space-y-3">
          {hasPdfSource && (
            <div className="border border-blue-200 rounded-lg bg-blue-50 px-3 py-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-blue-900">Original PDF preserved</p>
                <p className="text-xs text-blue-700">Review exact layout in the native PDF viewer while editing sections.</p>
              </div>
              <button
                onClick={() => setShowOriginalPdf(v => !v)}
                className="text-xs font-semibold px-2.5 py-1 rounded border border-blue-300 text-blue-700 bg-white hover:bg-blue-100"
              >
                {showOriginalPdf ? 'Hide PDF' : 'Show PDF'}
              </button>
            </div>
          )}

          {selectedSection ? (
            <div className={`grid gap-3 ${hasPdfSource && showOriginalPdf ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div className="border border-gray-200 rounded-lg bg-white p-4">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Section: {selectedSection.name}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 block mb-1">Section Title</label>
                    <input
                      value={selectedSection.name}
                      onChange={(e) => handleSectionNameChange(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Required</label>
                    <div className="flex items-center gap-2 py-2">
                      <button
                        onClick={handleSectionRequiredToggle}
                        className={`w-8 h-4 rounded-full relative transition-colors ${selectedSection.required ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${selectedSection.required ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                      <span className="text-xs text-gray-500">
                        {selectedSection.required ? 'Always included' : 'Conditional'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleMoveSection(-1)} disabled={selectedIdx === 0} className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">
                      ↑
                    </button>
                    <button onClick={() => handleMoveSection(1)} disabled={selectedIdx === sections.length - 1} className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">
                      ↓
                    </button>
                    <button onClick={handleRemoveSection} className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50">
                      ×
                    </button>
                  </div>
                </div>

                {!selectedSection.required && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <label className="text-xs font-bold text-yellow-700 block mb-1">Include when:</label>
                    <input
                      value={selectedSection.condition || ''}
                      onChange={(e) => handleSectionConditionChange(e.target.value)}
                      className="w-full border border-yellow-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-yellow-500"
                      placeholder="Condition expression..."
                    />
                    <div className="text-xs text-yellow-600 mt-1">
                      Section appears only when condition is true
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Content <span className="font-normal text-gray-400">— use {"{{VARIABLE_NAME}}"} for merge fields</span>
                  </label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Toolbar */}
                    <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex gap-2 items-center">
                      <button
                        onClick={() => {
                          const ta = document.getElementById('section-content-editor');
                          if (ta) {
                            const start = ta.selectionStart;
                            const end = ta.selectionEnd;
                            const text = selectedSection.content || '';
                            const selected = text.slice(start, end);
                            const newText = text.slice(0, start) + `**${selected}**` + text.slice(end);
                            handleSectionContentChange(newText);
                          }
                        }}
                        className="text-xs px-2 py-1 rounded hover:bg-gray-200 font-bold"
                      >
                        B
                      </button>
                      <button
                        onClick={() => {
                          const ta = document.getElementById('section-content-editor');
                          if (ta) {
                            const start = ta.selectionStart;
                            const end = ta.selectionEnd;
                            const text = selectedSection.content || '';
                            const selected = text.slice(start, end);
                            const newText = text.slice(0, start) + `*${selected}*` + text.slice(end);
                            handleSectionContentChange(newText);
                          }
                        }}
                        className="text-xs px-2 py-1 rounded hover:bg-gray-200 italic"
                      >
                        I
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleSectionContentChange((selectedSection.content || '') + '\n\n')}
                        className="text-xs px-2 py-1 rounded hover:bg-gray-200"
                      >
                        ¶ New para
                      </button>
                      <label className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                        {"{{ }}"}
                        <span className="sr-only">Insert variable</span>
                        <select
                          value=""
                          onChange={(e) => insertVariableToken(e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="" disabled>
                            Insert variable
                          </option>
                          {availableVariables.map((variableName) => (
                            <option key={variableName} value={variableName}>
                              {variableName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => importSectionRef.current?.click()}
                        disabled={importingSec}
                        className="text-xs px-2 py-1 rounded hover:bg-gray-200 text-gray-600 font-semibold"
                      >
                        {importingSec ? 'Importing\u2026' : 'Import from file'}
                      </button>
                      <input
                        ref={importSectionRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.md,.markdown,.txt,.text"
                        onChange={handleImportToSection}
                        className="hidden"
                      />
                    </div>
                    <textarea
                      id="section-content-editor"
                      value={selectedSection.content || ''}
                      onChange={(e) => handleSectionContentChange(e.target.value)}
                      className="w-full p-3 min-h-48 text-sm text-gray-700 leading-relaxed resize-y border-none focus:outline-none"
                      style={{ fontFamily: "'Source Serif 4', serif" }}
                      placeholder="Enter the legal prose for this section. Use {{VARIABLE_NAME}} for merge fields."
                    />
                  </div>
                </div>
              </div>

              </div>

              {hasPdfSource && showOriginalPdf && (
                <div className="border border-gray-200 rounded-lg bg-white p-3 flex flex-col">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Original PDF preview
                  </div>
                  <iframe
                    title="Original template PDF"
                    src={`${template.sourceDataUrl}#toolbar=1&view=FitH`}
                    className="w-full flex-1 min-h-[560px] rounded border border-gray-100"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg bg-white p-8 text-center text-gray-400">
              <p>Select a section to edit.</p>
            </div>
          )}
        </div>

        {/* Variable panel */}
        <div className="w-48 flex-shrink-0">
          <div className="border border-gray-200 rounded-lg bg-white p-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Variables used</div>
            <div className="space-y-1">
              {Array.from(allVariables).map((v) => (
                <div
                  key={v}
                  className="text-xs bg-yellow-50 border border-yellow-200 rounded px-2 py-1 font-mono text-yellow-800 cursor-pointer hover:bg-yellow-100"
                  onClick={() => {
                    if (selectedSection) {
                      handleSectionContentChange((selectedSection.content || '') + `{{${v}}}`);
                    }
                  }}
                >
                  {v}
                </div>
              ))}
              {allVariables.size === 0 && (
                <p className="text-xs text-gray-400">No variables detected. Use {"{{VAR_NAME}}"} syntax in content.</p>
              )}
              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="text-xs text-gray-400">
                  {allVariables.size} total variable{allVariables.size !== 1 ? 's' : ''} across all sections. Click to insert at cursor.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
