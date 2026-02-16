import { useState } from 'react';
import { useApp, SCREENS } from '../context/AppContext';
import Chip from '../components/Chip';
import { STAGES, STAGE_COLORS } from '../lib/matrix';

export default function PipelineScreen() {
  const { state, openCase, dispatch, persistCaseMetadata, showToast } = useApp();
  const [attFilter, setAttFilter] = useState('all');
  const [dragItem, setDragItem] = useState(null);

  const cases = state.cases;
  const filteredCases = attFilter === 'all'
    ? cases
    : cases.filter(c => c.owner === attFilter);

  // Get unique attorneys/owners
  const owners = [...new Set(cases.map(c => c.owner).filter(Boolean))];

  // Group cases by stage
  const stageGroups = {};
  STAGES.forEach(s => { stageGroups[s] = []; });
  filteredCases.forEach(c => {
    const stage = c.stage || 'Intake';
    if (stageGroups[stage]) stageGroups[stage].push(c);
  });

  // Total for progress strip
  const total = filteredCases.length;

  // Only show stages that have cases or are in the first 5
  const visibleStages = STAGES.filter((s, i) => stageGroups[s].length > 0 || i < 5);

  function getDocReadiness(c) {
    const docs = c.documents || [];
    if (docs.length === 0) {
      // Use docReadiness from metadata if available
      return c.docReadiness || { ready: 0, total: 0 };
    }
    const ready = docs.filter(d => d.status === 'ready').length;
    return { ready, total: docs.length };
  }

  function getDaysColor(days) {
    if (days > 10) return 'red';
    if (days > 5) return 'yellow';
    return 'green';
  }

  function handleDragStart(e, caseItem) {
    setDragItem(caseItem);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e, targetStage) {
    e.preventDefault();
    if (!dragItem) return;
    if (dragItem.stage === targetStage) return;

    dispatch({ type: 'UPDATE_CASE', caseId: dragItem.id, data: { stage: targetStage, daysInStage: 0 } });
    persistCaseMetadata(dragItem.id, { ...dragItem, stage: targetStage, daysInStage: 0 });
    showToast(`${dragItem.petitionerName} moved to ${targetStage}`);
    setDragItem(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Pipeline</h2>
        <div className="flex gap-2 items-center">
          <select
            value={attFilter}
            onChange={(e) => setAttFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
          >
            <option value="all">All Attorneys</option>
            {owners.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">{filteredCases.length} cases</span>
        </div>
      </div>

      {/* Progress strip */}
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden gap-px">
          {visibleStages.map((s) => {
            const count = stageGroups[s].length;
            if (count === 0) return null;
            return (
              <div
                key={s}
                className="transition-all"
                style={{ flex: count, backgroundColor: STAGE_COLORS[s] }}
                title={`${s}: ${count}`}
              />
            );
          })}
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex gap-2 overflow-x-auto pb-4">
        {visibleStages.map((stage) => (
          <div
            key={stage}
            className="flex-shrink-0"
            style={{ width: 200 }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="flex items-center justify-between px-2 py-1.5 border-b-2 mb-2" style={{ borderColor: STAGE_COLORS[stage] }}>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                <span className="text-xs font-bold text-gray-600">{stage}</span>
              </div>
              <span className="text-xs font-bold text-gray-400">{stageGroups[stage].length}</span>
            </div>
            {stageGroups[stage].map((c) => {
              const dr = getDocReadiness(c);
              const comments = (c.comments || []).filter(cm => cm.status === 'open');
              return (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, c)}
                  onClick={() => openCase(c.id)}
                  className="bg-white border border-gray-200 rounded-lg p-2.5 mb-2 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                  style={{ borderLeftWidth: 3, borderLeftColor: STAGE_COLORS[stage] }}
                >
                  <div className="text-xs font-bold text-gray-800 mb-1.5">{c.petitionerName}</div>
                  {/* Mini doc progress */}
                  {dr.total > 0 && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full"
                          style={{ width: `${(dr.ready / dr.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 font-medium">{dr.ready}/{dr.total}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Chip color={getDaysColor(c.daysInStage || 0)}>{c.daysInStage || 0}d</Chip>
                    {comments.length > 0 && (
                      <span className="text-xs text-purple-500 font-bold">{comments.length} comments</span>
                    )}
                    {(c.daysInStage || 0) > 10 && (
                      <span className="text-xs text-red-500 font-bold">!</span>
                    )}
                    {c.circuit && (
                      <span className="text-xs text-gray-400">{c.circuit}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {stageGroups[stage].length === 0 && (
              <div className="text-xs text-gray-300 text-center py-6 border border-dashed border-gray-200 rounded-lg">
                Drop here
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
