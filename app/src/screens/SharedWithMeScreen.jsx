import { useMemo } from 'react';
import { useApp } from '../context/AppContext';

export default function SharedWithMeScreen() {
  const { state, openCase, revokeFileShare } = useApp();

  const myUserId = state.user?.userId;

  // Shares sent to me
  const sharedWithMe = useMemo(() => {
    return (state.fileShares || [])
      .filter(s => s.sharedWith === myUserId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [state.fileShares, myUserId]);

  // Shares I sent
  const sharedByMe = useMemo(() => {
    return (state.fileShares || [])
      .filter(s => s.sharedBy === myUserId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [state.fileShares, myUserId]);

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffHrs = Math.floor(diffMs / 3600000);
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[1.2rem] font-bold text-gray-900">Shared Files</h2>
          <p className="text-[0.82rem] text-gray-500 mt-0.5">
            {sharedWithMe.length} shared with you &middot; {sharedByMe.length} shared by you
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <div className="bg-white border border-gray-200 rounded-[10px] px-[18px] py-4">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-1.5">Received</div>
          <div className="text-[1.8rem] font-bold leading-none text-blue-600">{sharedWithMe.length}</div>
          <div className="text-[0.72rem] text-gray-500 mt-1">files for review</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-[10px] px-[18px] py-4">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-1.5">Sent</div>
          <div className="text-[1.8rem] font-bold leading-none text-green-600">{sharedByMe.length}</div>
          <div className="text-[0.72rem] text-gray-500 mt-1">files shared out</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-[10px] px-[18px] py-4">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-1.5">With Comments</div>
          <div className="text-[1.8rem] font-bold leading-none text-purple-600">
            {[...sharedWithMe, ...sharedByMe].filter(s => s.permission === 'comment').length}
          </div>
          <div className="text-[0.72rem] text-gray-500 mt-1">can add comments</div>
        </div>
      </div>

      {/* Shared with me */}
      <div className="mb-6">
        <h3 className="text-[0.82rem] font-bold text-gray-700 mb-3">Shared with you</h3>
        {sharedWithMe.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-[14px] px-5 py-8 text-center">
            <p className="text-[0.82rem] text-gray-400">No files have been shared with you yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sharedWithMe.map(s => (
              <div key={s.id} className="bg-white border border-gray-200 rounded-[14px] px-5 py-4 hover:border-blue-300 transition-all">
                <div className="flex items-start gap-3.5">
                  {/* Icon */}
                  <div className="w-[38px] h-[38px] rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[0.9rem] flex-shrink-0">
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[0.9rem] font-semibold text-gray-900">{s.caseName}</span>
                      <span className={`text-[0.65rem] font-semibold px-[8px] py-[2px] rounded-[10px] ${
                        s.permission === 'comment'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {s.permission === 'comment' ? 'View + Comment' : 'View Only'}
                      </span>
                    </div>
                    <div className="text-[0.78rem] text-gray-600 mb-1.5">
                      {(s.documentNames || []).join(', ')}
                    </div>
                    {s.message && (
                      <div className="text-[0.75rem] text-gray-500 italic bg-gray-50 rounded-md px-3 py-2 mb-2">
                        &ldquo;{s.message}&rdquo;
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[0.72rem] text-gray-400">
                      <span>From {s.sharedByName || s.sharedBy}</span>
                      <span>&middot;</span>
                      <span>{formatDate(s.createdAt)}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => openCase(s.caseId)}
                    className="text-[0.78rem] font-semibold px-3 py-[5px] rounded-md bg-blue-500 text-white hover:bg-blue-600 flex-shrink-0"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shared by me */}
      <div>
        <h3 className="text-[0.82rem] font-bold text-gray-700 mb-3">Shared by you</h3>
        {sharedByMe.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-[14px] px-5 py-8 text-center">
            <p className="text-[0.82rem] text-gray-400">You haven&apos;t shared any files yet. Open a case and click Share to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sharedByMe.map(s => (
              <div key={s.id} className="bg-white border border-gray-200 rounded-[14px] px-5 py-4 hover:border-green-300 transition-all">
                <div className="flex items-start gap-3.5">
                  {/* Icon */}
                  <div className="w-[38px] h-[38px] rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[0.9rem] flex-shrink-0">
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[0.9rem] font-semibold text-gray-900">{s.caseName}</span>
                      <span className={`text-[0.65rem] font-semibold px-[8px] py-[2px] rounded-[10px] ${
                        s.permission === 'comment'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {s.permission === 'comment' ? 'View + Comment' : 'View Only'}
                      </span>
                    </div>
                    <div className="text-[0.78rem] text-gray-600 mb-1.5">
                      {(s.documentNames || []).join(', ')}
                    </div>
                    <div className="flex items-center gap-3 text-[0.72rem] text-gray-400">
                      <span>Shared with {s.sharedWithName || s.sharedWith}</span>
                      <span>&middot;</span>
                      <span>{formatDate(s.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openCase(s.caseId)}
                      className="text-[0.78rem] font-semibold px-3 py-[5px] rounded-md border border-gray-200 text-gray-600 hover:border-gray-400"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => revokeFileShare(s.id)}
                      className="text-[0.78rem] font-semibold px-3 py-[5px] rounded-md border border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
