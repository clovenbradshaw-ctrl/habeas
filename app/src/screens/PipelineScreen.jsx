import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { STAGES, STAGE_COLORS } from '../lib/matrix';

export default function PipelineScreen() {
  const { state, openCase, moveCaseToStage, showToast } = useApp();
  const [attFilter, setAttFilter] = useState('all');
  const [dragItem, setDragItem] = useState(null);

  const cases = state.cases;
  const filteredCases = attFilter === 'all'
    ? cases
    : cases.filter(c => c.owner === attFilter);

  const owners = [...new Set(cases.map(c => c.owner).filter(Boolean))];

  // Group cases by stage
  const stageGroups = {};
  STAGES.forEach(s => { stageGroups[s] = []; });
  filteredCases.forEach(c => {
    const stage = c.stage || 'Intake';
    if (stageGroups[stage]) stageGroups[stage].push(c);
  });

  const total = filteredCases.length;
  const visibleStages = STAGES.filter((s, i) => stageGroups[s].length > 0 || i < 5);

  function getDocReadiness(c) {
    const docs = c.documents || [];
    if (docs.length === 0) return c.docReadiness || { ready: 0, total: 0 };
    const ready = docs.filter(d => d.status === 'ready' || d.status === 'filed').length;
    return { ready, total: docs.length };
  }

  function getDaysColor(days) {
    if (days > 10) return 'bg-red-50 text-red-500';
    if (days > 5) return 'bg-amber-50 text-amber-500';
    return 'bg-green-50 text-green-600';
  }

  function handleDragStart(e, caseItem) {
    setDragItem(caseItem);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async function handleDrop(e, targetStage) {
    e.preventDefault();
    if (!dragItem) return;
    if (dragItem.stage === targetStage) return;
    await moveCaseToStage(dragItem.id, targetStage);
    showToast(`${dragItem.petitionerName} moved to ${targetStage}`);
    setDragItem(null);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[1.2rem] font-bold text-gray-900">Pipeline</h2>
          <p className="text-[0.82rem] text-gray-500 mt-0.5">{filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''} across {visibleStages.length} stages</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={attFilter}
            onChange={(e) => setAttFilter(e.target.value)}
            className="text-[0.78rem] border border-gray-200 rounded-md px-2 py-1.5 bg-white outline-none focus:border-blue-300"
            style={{ fontFamily: 'inherit' }}
          >
            <option value="all">All Attorneys</option>
            {owners.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress strip */}
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden gap-px mb-5">
          {visibleStages.map((s) => {
            const count = stageGroups[s].length;
            if (count === 0) return null;
            return (
              <div
                key={s}
                className="transition-all rounded-full"
                style={{ flex: count, backgroundColor: STAGE_COLORS[s] }}
                title={`${s}: ${count}`}
              />
            );
          })}
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {visibleStages.map((stage) => (
          <div
            key={stage}
            className="flex-shrink-0"
            style={{ width: 220 }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="flex items-center justify-between px-2 py-2 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                <span className="text-[0.78rem] font-semibold text-gray-700">{stage}</span>
              </div>
              <span className="text-[0.68rem] font-semibold px-[7px] py-[2px] rounded-lg bg-gray-100 text-gray-500">{stageGroups[stage].length}</span>
            </div>
            <div className="space-y-2">
              {stageGroups[stage].map((c) => {
                const dr = getDocReadiness(c);
                const days = c.daysInStage || 0;
                const openComments = (c.comments || []).filter(cm => cm.status === 'open').length;
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, c)}
                    onClick={() => openCase(c.id)}
                    className="bg-white border border-gray-200 rounded-[10px] p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                    style={{ borderLeftWidth: 3, borderLeftColor: STAGE_COLORS[stage] }}
                  >
                    <div className="text-[0.82rem] font-semibold text-gray-900 mb-2">{c.petitionerName}</div>
                    {dr.total > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-[4px] bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded-full"
                            style={{ width: `${(dr.ready / dr.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-[0.68rem] text-gray-400 font-medium">{dr.ready}/{dr.total}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[0.65rem] font-semibold px-[7px] py-[2px] rounded-[8px] ${getDaysColor(days)}`}>
                        {days}d
                      </span>
                      {openComments > 0 && (
                        <span className="text-[0.65rem] font-semibold text-purple-500">{openComments} comment{openComments !== 1 ? 's' : ''}</span>
                      )}
                      {days > 10 && (
                        <span className="text-[0.65rem] font-bold text-red-500">!</span>
                      )}
                      {c.circuit && (
                        <span className="text-[0.65rem] text-gray-400 ml-auto">{c.circuit}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {stageGroups[stage].length === 0 && (
                <div className="text-[0.75rem] text-gray-300 text-center py-8 border border-dashed border-gray-200 rounded-[10px]">
                  Drop here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
