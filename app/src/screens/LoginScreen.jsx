import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const { doLogin, doRegister, enterDemo, state } = useApp();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setLocalError('');
    if (!username.trim() || !password.trim()) return;
    doLogin(username.trim(), password.trim());
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setLocalError('');
    if (!username.trim() || !password.trim()) return;
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    doRegister(username.trim(), password.trim(), displayName.trim() || username.trim());
  };

  function switchTab(newTab) {
    setTab(newTab);
    setLocalError('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
  }

  const error = localError || state.loginError;

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
      <div className="w-96 text-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1" style={{ fontFamily: "'Source Serif 4', serif" }}>
          Habeas
        </h1>
        <p className="text-sm text-gray-500 mb-8">Immigration detention case management</p>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg text-left">
          {/* Tab switcher */}
          <div className="flex mb-5 border-b border-gray-200">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === 'login'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === 'register'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Create Account
            </button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="@user:server"
                  autoFocus
                />
              </div>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Password"
                />
              </div>

              {error && (
                <p className="text-red-600 text-xs mb-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={state.loginLoading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {state.loginLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. jsmith"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">@{username || 'username'}:app.aminoimmigration.com</p>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. John Smith"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Re-enter password"
                />
              </div>

              {error && (
                <p className="text-red-600 text-xs mb-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={state.loginLoading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {state.loginLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={enterDemo}
              className="w-full py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Enter Demo Mode (no server)
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Server: app.aminoimmigration.com
        </p>
      </div>
    </div>
  );
}
