import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const { doLogin, enterDemo, state } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    doLogin(username.trim(), password.trim());
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
      <div className="w-96 text-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1" style={{ fontFamily: "'Source Serif 4', serif" }}>
          Habeas
        </h1>
        <p className="text-sm text-gray-500 mb-8">Immigration detention case management</p>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg text-left">
          <h3 className="text-base font-bold text-gray-900 mb-1">Sign in</h3>
          <p className="text-xs text-gray-500 mb-5">Connect to your Matrix homeserver</p>

          <form onSubmit={handleSubmit}>
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

            {state.loginError && (
              <p className="text-red-600 text-xs mb-3">{state.loginError}</p>
            )}

            <button
              type="submit"
              disabled={state.loginLoading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state.loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

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
