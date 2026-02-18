import { useMemo } from 'react';
import { useApp, SCREENS } from '../context/AppContext';
import { STAGE_COLORS } from '../lib/matrix';

export default function DashboardScreen() {
  const { state, navigate, openCase } = useApp();

  // Admin sees all cases; partners see only own (in connected mode)
  const allCases = useMemo(() => {
    if (!state.connected) return state.cases;
    if (state.role === 'admin') return state.cases;
    return state.cases.filter(c => c.owner === state.user?.userId);
  }, [state.cases, state.connected, state.role, state.user?.userId]);

  const activeCases = useMemo(() => allCases.filter(c => c.stage !== 'Resolved' && !c.archived), [allCases]);

  // Compute stats
  const stats = useMemo(() => {
    const inReview = activeCases.filter(c => c.stage === 'Attorney Review').length;
    const totalDocs = activeCases.reduce((sum, c) => sum + (c.documents || []).length, 0);
    const readyDocs = activeCases.reduce((sum, c) => sum + (c.documents || []).filter(d => d.status === 'ready' || d.status === 'filed').length, 0);
    const stale = activeCases.filter(c => (c.daysInStage || 0) > 10).length;
    return { active: activeCases.length, inReview, totalDocs, readyDocs, stale };
  }, [activeCases]);

  // Derive alerts
  const alerts = useMemo(() => {
    const items = [];
    // Urgent: cases stuck in drafting with empty vars
    for (const c of activeCases) {
      const days = c.daysInStage || 0;
      const emptyVars = c.variables ? Object.values(c.variables).filter(v => !v || !String(v).trim()).length : 0;
      if (days > 10 && emptyVars > 0) {
        items.push({
          type: 'urgent',
          icon: '\u26A0',
          text: <><strong>{c.petitionerName}</strong> &mdash; {days} days in {c.stage}, {emptyVars} empty variable{emptyVars !== 1 ? 's' : ''} blocking filing</>,
          action: 'Open case \u2192',
          caseId: c.id,
        });
      }
    }
    // Warning: docs awaiting review
    const reviewDocs = [];
    for (const c of activeCases) {
      for (const d of (c.documents || [])) {
        if (d.status === 'review') reviewDocs.push({ caseId: c.id, docName: d.name, caseName: c.petitionerName });
      }
    }
    if (reviewDocs.length > 0) {
      items.push({
        type: 'warning',
        icon: '\u23F1',
        text: <><strong>{reviewDocs.length} document{reviewDocs.length !== 1 ? 's' : ''}</strong> awaiting your review</>,
        action: 'Review \u2192',
        caseId: reviewDocs[0]?.caseId,
      });
    }
    // Info: cases ready to advance
    for (const c of activeCases) {
      const docs = c.documents || [];
      if (c.stage === 'Ready to File' && docs.length > 0 && docs.every(d => d.status === 'ready' || d.status === 'filed')) {
        items.push({
          type: 'info',
          icon: '\uD83D\uDCCB',
          text: <><strong>{c.petitionerName}</strong> &mdash; all docs ready, eligible to advance to Filing</>,
          action: 'Advance \u2192',
          caseId: c.id,
        });
      }
    }
    return items.slice(0, 4);
  }, [activeCases]);

  // Derive next actions
  const nextActions = useMemo(() => {
    const actions = [];
    for (const c of activeCases) {
      const docs = c.documents || [];
      const emptyVars = c.variables ? Object.entries(c.variables).filter(([, v]) => !v || !String(v).trim()) : [];
      const openComments = (c.comments || []).filter(cm => cm.status === 'open');

      if (c.stage === 'Attorney Review' && openComments.length > 0) {
        actions.push({
          title: `Review petition for ${c.petitionerName}`,
          meta: `Attorney Review \u00b7 ${openComments.length} comment${openComments.length !== 1 ? 's' : ''} pending \u00b7 ${c.daysInStage || 0}d`,
          caseId: c.id,
          partial: true,
        });
      } else if (c.stage === 'Drafting' && emptyVars.length > 0) {
        const varNames = emptyVars.slice(0, 3).map(([k]) => k).join(', ');
        actions.push({
          title: `Fill variables for ${c.petitionerName}`,
          meta: `Drafting \u00b7 ${emptyVars.length} variable${emptyVars.length !== 1 ? 's' : ''} empty \u00b7 ${varNames}`,
          caseId: c.id,
          partial: true,
        });
      } else if (c.stage === 'Attorney Review') {
        actions.push({
          title: `Approve documents for ${c.petitionerName}`,
          meta: `Attorney Review \u00b7 all variables filled \u00b7 ${c.daysInStage || 0}d`,
          caseId: c.id,
          partial: false,
        });
      } else if (c.stage === 'Intake' && docs.length === 0) {
        actions.push({
          title: `Add documents for ${c.petitionerName}`,
          meta: `Intake \u00b7 no documents assigned yet`,
          caseId: c.id,
          partial: false,
        });
      }
    }
    return actions.slice(0, 5);
  }, [activeCases]);

  // Needs attention cases sorted by urgency
  const attentionCases = useMemo(() => {
    return [...activeCases]
      .map(c => {
        const days = c.daysInStage || 0;
        const emptyVars = c.variables ? Object.values(c.variables).filter(v => !v || !String(v).trim()).length : 0;
        const openComments = (c.comments || []).filter(cm => cm.status === 'open').length;
        const urgency = (days / 10) * 2 + emptyVars * 0.5 + openComments;
        return { ...c, urgency };
      })
      .filter(c => c.urgency > 1)
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 5);
  }, [activeCases]);

  const userName = state.user?.name || 'there';
  const firstName = userName.split(/[\s@]/)[0];

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-[1.3rem] font-bold text-gray-900">Good morning, {firstName}</h2>
        <p className="text-[0.85rem] text-gray-500 mt-1">
          {alerts.length > 0 ? `${alerts.length} item${alerts.length !== 1 ? 's' : ''} need your attention` : 'All caught up'}
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2.5 mb-7">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-3.5 px-[18px] py-3.5 rounded-[10px] text-[0.82rem] border ${
                a.type === 'urgent' ? 'bg-red-50 border-red-200 text-red-900' :
                a.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <span className="text-base flex-shrink-0 w-[22px] text-center">{a.icon}</span>
              <span className="flex-1 font-medium">{a.text}</span>
              <button
                onClick={() => openCase(a.caseId)}
                className={`text-[0.75rem] font-semibold px-3 py-[5px] rounded-md border-none cursor-pointer text-white ${
                  a.type === 'urgent' ? 'bg-red-500' :
                  a.type === 'warning' ? 'bg-amber-500' :
                  'bg-blue-500'
                }`}
              >
                {a.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3.5 mb-7">
        <StatCard label="Active Cases" value={stats.active} sub={`${stats.inReview} in review`} />
        <StatCard label="Docs Ready" value={`${stats.readyDocs}/${stats.totalDocs}`} sub={stats.totalDocs > 0 ? `${Math.round((stats.readyDocs / stats.totalDocs) * 100)}% completion` : 'No documents'} />
        <StatCard label="In Review" value={stats.inReview} sub="awaiting attorney approval" />
        <StatCard label="Stale Cases" value={stats.stale} sub=">10 days without update" valueColor={stats.stale > 0 ? 'text-red-500' : undefined} />
      </div>

      {/* Two-column sections */}
      <div className="grid grid-cols-2 gap-[18px]">
        {/* Next Actions */}
        <div className="bg-white border border-gray-200 rounded-[14px] overflow-hidden">
          <div className="flex items-center justify-between px-[18px] pt-4 pb-3 border-b border-gray-100">
            <div className="text-[0.82rem] font-semibold">Your Next Actions</div>
            <button onClick={() => navigate(SCREENS.CASES)} className="text-[0.72rem] text-blue-500 font-medium cursor-pointer">
              All cases &rarr;
            </button>
          </div>
          {nextActions.length === 0 && (
            <div className="px-[18px] py-8 text-center text-[0.82rem] text-gray-400">No pending actions</div>
          )}
          {nextActions.map((a, i) => (
            <div
              key={i}
              onClick={() => openCase(a.caseId)}
              className="flex items-start gap-3 px-[18px] py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-[#f8f7f5] transition-colors"
            >
              <div className={`w-[18px] h-[18px] rounded border-[1.5px] flex-shrink-0 mt-0.5 flex items-center justify-center text-[0.6rem] ${
                a.partial ? 'border-amber-400 text-amber-500' : 'border-gray-200'
              }`}>
                {a.partial ? '\u2014' : ''}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.8rem] font-medium text-gray-900">{a.title}</div>
                <div className="text-[0.7rem] text-gray-400 mt-0.5">{a.meta}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Cases Needing Attention */}
        <div className="bg-white border border-gray-200 rounded-[14px] overflow-hidden">
          <div className="flex items-center justify-between px-[18px] pt-4 pb-3 border-b border-gray-100">
            <div className="text-[0.82rem] font-semibold">Cases Needing Attention</div>
            <button onClick={() => navigate(SCREENS.PIPELINE)} className="text-[0.72rem] text-blue-500 font-medium cursor-pointer">
              Pipeline &rarr;
            </button>
          </div>
          {attentionCases.length === 0 && (
            <div className="px-[18px] py-8 text-center text-[0.82rem] text-gray-400">All cases on track</div>
          )}
          {attentionCases.map((c) => {
            const days = c.daysInStage || 0;
            const daysColor = days > 10 ? 'bg-red-50 text-red-500' : days > 5 ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500';
            return (
              <div
                key={c.id}
                onClick={() => openCase(c.id)}
                className="flex items-center gap-3 px-[18px] py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-[#f8f7f5] transition-colors"
              >
                <div className="w-1 h-9 rounded-sm flex-shrink-0" style={{ background: STAGE_COLORS[c.stage] || '#9ca3af' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[0.8rem] font-semibold text-gray-900">{c.petitionerName}</div>
                  <div className="text-[0.7rem] text-gray-400 mt-0.5">
                    {c.facility} &middot; {c.circuit} &middot; {c.stage}
                  </div>
                </div>
                <span className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-[10px] ${daysColor}`}>
                  {days}d
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, valueColor }) {
  return (
    <div className="bg-white border border-gray-200 rounded-[10px] px-[18px] py-4">
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-1.5">{label}</div>
      <div className={`text-[1.8rem] font-bold leading-none ${valueColor || 'text-gray-900'}`}>{value}</div>
      <div className="text-[0.72rem] text-gray-500 mt-1">{sub}</div>
    </div>
  );
}
