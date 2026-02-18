import { useState, useMemo } from 'react';
import { useApp, SCREENS } from '../context/AppContext';
import { STAGE_COLORS } from '../lib/matrix';
import ConfirmDialog from '../components/ConfirmDialog';

const STAGE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Intake', label: 'Intake' },
  { id: 'Drafting', label: 'Drafting' },
  { id: 'review', label: 'Review' },
  { id: 'filed+', label: 'Filed+' },
];

export default function CasesScreen() {
  const { state, navigate, openCase, archiveCase, unarchiveCase, deleteCase } = useApp();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const isAdmin = state.role === 'admin';

  // Admin sees all cases; partner sees only own cases (or all in demo mode)
  const myCases = useMemo(() => {
    return state.cases.filter(c => {
      if (!state.connected) return true;
      if (isAdmin) return true;
      return c.owner === state.user?.userId;
    });
  }, [state.cases, state.connected, state.user?.userId, isAdmin]);

  const activeCases = useMemo(() => {
    return myCases.filter(c => {
      if (c.stage === 'Resolved') return false;
      if (showArchived) return c.archived;
      return !c.archived;
    });
  }, [myCases, showArchived]);

  // Apply search
  const searched = useMemo(() => {
    if (!search.trim()) return activeCases;
    const q = search.toLowerCase();
    return activeCases.filter(c =>
      (c.petitionerName || '').toLowerCase().includes(q) ||
      (c.facility || '').toLowerCase().includes(q) ||
      (c.circuit || '').toLowerCase().includes(q) ||
      (c.variables?.A_NUMBER || '').toLowerCase().includes(q) ||
      (c.owner || '').toLowerCase().includes(q)
    );
  }, [activeCases, search]);

  // Apply stage filter
  const filtered = useMemo(() => {
    if (stageFilter === 'all') return searched;
    if (stageFilter === 'review') return searched.filter(c => c.stage === 'Attorney Review');
    if (stageFilter === 'filed+') return searched.filter(c => ['Filed', 'Awaiting Response', 'Reply Filed', 'Order Received', 'Bond Hearing'].includes(c.stage));
    return searched.filter(c => c.stage === stageFilter);
  }, [searched, stageFilter]);

  const reviewCount = activeCases.filter(c => c.stage === 'Attorney Review').length;
  const archivedCount = myCases.filter(c => c.archived && c.stage !== 'Resolved').length;

  function getDocReadiness(c) {
    const docs = c.documents || [];
    const ready = docs.filter(d => d.status === 'ready' || d.status === 'filed').length;
    return { ready, total: docs.length };
  }

  function getDaysColor(days) {
    if (days > 10) return 'bg-red-50 text-red-500';
    if (days > 5) return 'bg-amber-50 text-amber-500';
    return 'bg-green-50 text-green-600';
  }

  function getProgressColor(ready, total) {
    if (total === 0) return 'bg-blue-400';
    const pct = ready / total;
    if (pct >= 1) return 'bg-green-500';
    if (pct >= 0.5) return 'bg-blue-400';
    return 'bg-amber-400';
  }

  function getNextAction(c) {
    const docs = c.documents || [];
    const emptyVars = c.variables ? Object.entries(c.variables).filter(([, v]) => !v || !String(v).trim()) : [];
    const openComments = (c.comments || []).filter(cm => cm.status === 'open');

    if (c.stage === 'Intake' && docs.length === 0) {
      return 'Complete client intake \u2014 assign document templates for this case';
    }
    if (c.stage === 'Drafting' && emptyVars.length > 0) {
      const names = emptyVars.slice(0, 3).map(([k]) => k).join(', ');
      return `Fill ${emptyVars.length} empty variable${emptyVars.length !== 1 ? 's' : ''} in petition (${names})`;
    }
    if (c.stage === 'Attorney Review' && openComments.length > 0) {
      return `Review petition \u2014 ${openComments.length} comment${openComments.length !== 1 ? 's' : ''} from paralegal need resolution`;
    }
    if (c.stage === 'Ready to File' && docs.length > 0 && docs.every(d => d.status === 'ready' || d.status === 'filed')) {
      return 'All documents ready \u2014 export packet and file with court';
    }
    if (c.stage === 'Attorney Review') {
      return 'Review proposed documents \u2014 approve for filing';
    }
    if (c.stage === 'Drafting') {
      return 'Continue drafting documents';
    }
    return 'Review case status';
  }

  function getOwnerDisplay(c) {
    if (!c.owner) return '';
    // Try to find a matching user
    const user = (state.users || []).find(u => u.userId === c.owner);
    if (user) return user.displayName || user.username;
    // Extract username from Matrix ID
    const match = c.owner.match(/^@(.+?):/);
    return match ? match[1] : c.owner;
  }

  function handleArchive(e, caseId) {
    e.stopPropagation();
    archiveCase(caseId);
  }

  function handleUnarchive(e, caseId) {
    e.stopPropagation();
    unarchiveCase(caseId);
  }

  function handleDeleteCase(e, caseId) {
    e.stopPropagation();
    setConfirmDelete(caseId);
  }

  function confirmDeleteCase() {
    if (confirmDelete) {
      deleteCase(confirmDelete);
      setConfirmDelete(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[1.2rem] font-bold text-gray-900">
            {isAdmin ? 'All Cases' : 'My Cases'}
          </h2>
          <p className="text-[0.82rem] text-gray-500 mt-0.5">
            {showArchived
              ? `${archivedCount} archived case${archivedCount !== 1 ? 's' : ''}`
              : `${activeCases.length} active case${activeCases.length !== 1 ? 's' : ''} \u00b7 ${reviewCount} awaiting review`
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
            onClick={() => navigate(SCREENS.INTAKE)}
            className="inline-flex items-center gap-1.5 bg-blue-500 text-white text-[0.8rem] font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            + New Case
          </button>
        </div>
      </div>

      {/* Toolbar: search + filters */}
      <div className="flex items-center gap-2.5 mb-[18px]">
        <div className="flex-1 max-w-[360px] relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[0.82rem]">{'\u2315'}</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAdmin ? 'Search cases by name, facility, owner\u2026' : 'Search cases by name, facility, or A-number\u2026'}
            className="w-full py-2 px-3 pl-[34px] border border-gray-200 rounded-md text-[0.8rem] bg-white outline-none focus:border-blue-300 transition-colors"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        {STAGE_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setStageFilter(f.id)}
            className={`px-3.5 py-2 border rounded-md text-[0.78rem] font-medium transition-all ${
              stageFilter === f.id
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
            }`}
            style={{ fontFamily: 'inherit' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Case cards */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-[0.82rem]">
            {search ? 'No cases match your search.' : showArchived ? 'No archived cases.' : 'No cases yet. Create one to get started.'}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {filtered.map((c) => {
          const dr = getDocReadiness(c);
          const days = c.daysInStage || 0;
          const stageColor = STAGE_COLORS[c.stage] || '#9ca3af';
          return (
            <div
              key={c.id}
              onClick={() => openCase(c.id)}
              className={`bg-white border rounded-[14px] px-5 py-[18px] cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all flex items-start gap-4 ${
                c.archived ? 'border-gray-100 opacity-75' : 'border-gray-200'
              }`}
            >
              {/* Stage color bar */}
              <div className="w-1 self-stretch rounded-sm flex-shrink-0" style={{ background: stageColor, minHeight: 56 }} />

              {/* Card body */}
              <div className="flex-1 min-w-0">
                {/* Top row: name + chips */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[0.95rem] font-semibold text-gray-900">{c.petitionerName}</div>
                    <div className="text-[0.75rem] text-gray-400 mt-0.5">
                      {c.facility}{c.facilityLocation ? ` \u2014 ${c.facilityLocation}` : ''} &middot; {c.circuit}
                      {isAdmin && c.owner && (
                        <> &middot; <span className="text-purple-400">{getOwnerDisplay(c)}</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {c.archived && (
                      <span className="text-[0.68rem] font-semibold px-[9px] py-[3px] rounded-[10px] bg-gray-100 text-gray-500">
                        Archived
                      </span>
                    )}
                    <span className={`text-[0.68rem] font-semibold px-[9px] py-[3px] rounded-[10px] ${getDaysColor(days)}`}>
                      {days}d
                    </span>
                    <span className="text-[0.68rem] font-semibold px-[9px] py-[3px] rounded-[10px] text-white" style={{ background: stageColor }}>
                      {c.stage}
                    </span>
                    {/* Archive/Unarchive button */}
                    {showArchived ? (
                      <>
                        <button
                          onClick={(e) => handleUnarchive(e, c.id)}
                          className="text-[0.68rem] font-semibold px-[9px] py-[3px] rounded-[10px] bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                          title="Unarchive case"
                        >
                          Restore
                        </button>
                        <button
                          onClick={(e) => handleDeleteCase(e, c.id)}
                          className="text-[0.68rem] font-semibold px-[9px] py-[3px] rounded-[10px] bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                          title="Delete case permanently"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => handleArchive(e, c.id)}
                        className="text-[0.68rem] font-semibold px-[9px] py-[3px] rounded-[10px] bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Archive case"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {dr.total > 0 && (
                  <div className="flex items-center gap-2.5 mt-2.5">
                    <div className="flex-1 h-[5px] bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(dr.ready, dr.total)}`}
                        style={{ width: `${dr.total > 0 ? (dr.ready / dr.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[0.7rem] text-gray-400 whitespace-nowrap">
                      {dr.ready}/{dr.total} docs ready
                    </span>
                  </div>
                )}

                {/* Next action */}
                {!c.archived && (
                  <div className="mt-2.5 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
                    <span className="text-[0.62rem] font-bold uppercase tracking-[0.06em] text-blue-500">Next &rarr;</span>
                    <span className="text-[0.75rem] text-blue-800">{getNextAction(c)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Case Permanently"
        message={`Are you sure you want to permanently delete "${state.cases.find(c => c.id === confirmDelete)?.petitionerName || 'this case'}"? This will remove all case data, documents, and comments. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
        onConfirm={confirmDeleteCase}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
