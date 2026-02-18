import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function UserManagementScreen() {
  const { state, createUser, inviteUser, removeUser, loadUsers, showToast } = useApp();
  const [mode, setMode] = useState(null); // null, 'create', 'invite'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null); // userId to confirm removal
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (state.connected) loadUsers();
  }, [state.connected, loadUsers]);

  const users = state.users || [];
  const currentUserId = state.user?.userId;

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.userId || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const adminCount = users.filter(u => u.isAdmin).length;
  const activeCount = users.filter(u => u.status === 'active').length;
  const invitedCount = users.filter(u => u.status === 'invited').length;

  function resetForm() {
    setMode(null);
    setUsername('');
    setEmail('');
    setDisplayName('');
    setMakeAdmin(false);
    setSubmitting(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      showToast('Username and email are required', true);
      return;
    }
    // Check for duplicate username
    if (users.some(u => u.username === username.trim() || u.userId === `@${username.trim()}:app.aminoimmigration.com`)) {
      showToast('A user with this username already exists', true);
      return;
    }
    setSubmitting(true);
    const fn = mode === 'create' ? createUser : inviteUser;
    const result = await fn({
      username: username.trim(),
      email: email.trim(),
      displayName: displayName.trim() || username.trim(),
      makeAdmin,
    });
    setSubmitting(false);
    if (result) resetForm();
  }

  async function handleRemoveUser() {
    if (!confirmRemove) return;
    setRemoving(true);
    await removeUser(confirmRemove);
    setRemoving(false);
    setConfirmRemove(null);
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const confirmUser = confirmRemove ? users.find(u => u.userId === confirmRemove) : null;

  if (state.role !== 'admin') {
    return (
      <div className="text-center py-16">
        <div className="text-[1.1rem] font-semibold text-gray-500 mb-2">Access Denied</div>
        <p className="text-[0.82rem] text-gray-400">Only administrators can manage users.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[1.2rem] font-bold text-gray-900">User Management</h2>
          <p className="text-[0.82rem] text-gray-500 mt-0.5">
            {users.length} user{users.length !== 1 ? 's' : ''} &middot; {adminCount} admin{adminCount !== 1 ? 's' : ''} &middot; {invitedCount > 0 ? `${invitedCount} pending` : 'none pending'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode(mode === 'invite' ? null : 'invite')}
            className="inline-flex items-center gap-1.5 bg-white text-blue-600 text-[0.8rem] font-semibold px-4 py-2 rounded-md border border-blue-300 hover:bg-blue-50 transition-colors"
          >
            Invite User
          </button>
          <button
            onClick={() => setMode(mode === 'create' ? null : 'create')}
            className="inline-flex items-center gap-1.5 bg-blue-500 text-white text-[0.8rem] font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            + Create User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <div className="bg-white border border-gray-200 rounded-[10px] px-[18px] py-4">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-1.5">Total Users</div>
          <div className="text-[1.8rem] font-bold leading-none text-gray-900">{users.length}</div>
          <div className="text-[0.72rem] text-gray-500 mt-1">{activeCount} active</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-[10px] px-[18px] py-4">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-1.5">Administrators</div>
          <div className="text-[1.8rem] font-bold leading-none text-purple-600">{adminCount}</div>
          <div className="text-[0.72rem] text-gray-500 mt-1">with full access</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-[10px] px-[18px] py-4">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-1.5">Pending Invitations</div>
          <div className="text-[1.8rem] font-bold leading-none text-amber-500">{invitedCount}</div>
          <div className="text-[0.72rem] text-gray-500 mt-1">awaiting acceptance</div>
        </div>
      </div>

      {/* Create / Invite Form */}
      {mode && (
        <form onSubmit={handleSubmit} className="bg-white border border-blue-200 rounded-[14px] p-5 space-y-3 mb-5">
          <h3 className="text-[0.9rem] font-semibold">
            {mode === 'create' ? 'Create New User' : 'Invite Existing User'}
          </h3>
          {mode === 'invite' && (
            <p className="text-[0.75rem] text-gray-500 -mt-1">
              Invite someone who already has a Matrix account on this server.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[0.72rem] font-semibold text-gray-500">Username *</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
                placeholder="e.g., jsmith"
                autoFocus
                style={{ fontFamily: 'inherit' }}
              />
              <span className="text-[0.68rem] text-gray-400">@{username || 'username'}:app.aminoimmigration.com</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.72rem] font-semibold text-gray-500">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
                placeholder="e.g., jsmith@aminoimmigration.com"
                style={{ fontFamily: 'inherit' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.72rem] font-semibold text-gray-500">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
                placeholder="e.g., John Smith"
                style={{ fontFamily: 'inherit' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.72rem] font-semibold text-gray-500">Role</label>
              <div className="flex items-center gap-3 h-[38px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={makeAdmin}
                    onChange={(e) => setMakeAdmin(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-[0.82rem] text-gray-700">Make administrator</span>
                </label>
              </div>
              {makeAdmin && (
                <span className="text-[0.68rem] text-purple-500">This user will have full admin access</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={resetForm} className="text-[0.78rem] font-semibold px-3 py-[5px] rounded-md border border-gray-200 text-gray-500 hover:border-gray-400">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !username.trim() || !email.trim()}
              className="text-[0.78rem] font-semibold px-4 py-[5px] rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : mode === 'create' ? 'Create User' : 'Send Invitation'}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="flex items-center gap-2.5 mb-[18px]">
        <div className="flex-1 max-w-[360px] relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[0.82rem]">{'\u2315'}</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, username, or email\u2026"
            className="w-full py-2 px-3 pl-[34px] border border-gray-200 rounded-md text-[0.8rem] bg-white outline-none focus:border-blue-300 transition-colors"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* User list */}
      <div className="flex flex-col gap-2">
        {filtered.map((u) => {
          const isSelf = u.userId === currentUserId;
          return (
            <div key={u.userId} className="bg-white border border-gray-200 rounded-[14px] px-5 py-4 hover:border-gray-300 transition-all">
              <div className="flex items-center gap-3.5">
                {/* Avatar */}
                <div className={`w-[38px] h-[38px] rounded-full flex items-center justify-center text-white text-[0.8rem] font-semibold flex-shrink-0 ${u.isAdmin ? 'bg-purple-500' : 'bg-blue-400'}`}>
                  {(u.displayName || u.username || '?').split(/[\s@]/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.9rem] font-semibold text-gray-900">{u.displayName || u.username}</span>
                    {u.isAdmin && (
                      <span className="text-[0.65rem] font-semibold px-[8px] py-[2px] rounded-[10px] bg-purple-100 text-purple-600">Admin</span>
                    )}
                    {u.status === 'invited' && (
                      <span className="text-[0.65rem] font-semibold px-[8px] py-[2px] rounded-[10px] bg-amber-100 text-amber-600">Invited</span>
                    )}
                    {isSelf && (
                      <span className="text-[0.65rem] font-semibold px-[8px] py-[2px] rounded-[10px] bg-gray-100 text-gray-500">You</span>
                    )}
                  </div>
                  <div className="text-[0.75rem] text-gray-400 mt-0.5">
                    {u.email || u.userId}
                    {u.createdAt && <> &middot; Joined {formatDate(u.createdAt)}</>}
                  </div>
                </div>

                {/* Username */}
                <div className="text-[0.75rem] text-gray-400 font-mono flex-shrink-0">
                  {u.userId || `@${u.username}:app.aminoimmigration.com`}
                </div>

                {/* Remove button - don't allow removing yourself */}
                {!isSelf && (
                  <button
                    onClick={() => setConfirmRemove(u.userId)}
                    className="text-[0.75rem] font-semibold px-3 py-1.5 rounded-md border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors flex-shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-[0.82rem]">{search ? 'No users match your search.' : 'No users found.'}</p>
          </div>
        )}
      </div>

      {/* Remove confirmation dialog */}
      {confirmRemove && confirmUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]" onClick={() => setConfirmRemove(null)}>
          <div className="bg-white rounded-xl p-6 w-[420px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[1rem] font-bold text-gray-900 mb-2">Remove User</h3>
            <p className="text-[0.82rem] text-gray-600 mb-1">
              Are you sure you want to remove <strong>{confirmUser.displayName || confirmUser.username}</strong>?
            </p>
            <p className="text-[0.75rem] text-gray-400 mb-5">
              This will deactivate their account. They will no longer be able to log in or access any cases.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmRemove(null)}
                disabled={removing}
                className="text-[0.8rem] font-semibold px-4 py-2 rounded-md border border-gray-200 text-gray-600 hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveUser}
                disabled={removing}
                className="text-[0.8rem] font-semibold px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {removing ? 'Removing...' : 'Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
