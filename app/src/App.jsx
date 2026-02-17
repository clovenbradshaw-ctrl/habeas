import { AppProvider, useApp, SCREENS } from './context/AppContext';
import LoginScreen from './screens/LoginScreen';
import CasesScreen from './screens/CasesScreen';
import WorkspaceScreen from './screens/WorkspaceScreen';
import TemplatesScreen from './screens/TemplatesScreen';
import TemplateEditScreen from './screens/TemplateEditScreen';
import PipelineScreen from './screens/PipelineScreen';

function AppShell() {
  const { state, navigate, dispatch } = useApp();

  if (!state.isLoggedIn) {
    return <LoginScreen />;
  }

  const navItems = [
    { id: SCREENS.CASES, label: 'My Cases' },
    { id: SCREENS.PIPELINE, label: 'Pipeline' },
    { id: SCREENS.TEMPLATES, label: 'Templates' },
  ];

  const screenLabels = {
    [SCREENS.CASES]: 'My Cases',
    [SCREENS.WORKSPACE]: 'Case Workspace',
    [SCREENS.TEMPLATES]: 'Template Library',
    [SCREENS.TEMPLATE_EDIT]: 'Template Editor',
    [SCREENS.PIPELINE]: 'Pipeline',
  };

  function isNavActive(navId) {
    if (state.screen === navId) return true;
    if (state.screen === SCREENS.WORKSPACE && navId === SCREENS.CASES) return true;
    if (state.screen === SCREENS.TEMPLATE_EDIT && navId === SCREENS.TEMPLATES) return true;
    return false;
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <div className="w-48 bg-gray-900 flex flex-col flex-shrink-0">
        <div className="p-4">
          <div className="text-white font-bold text-base tracking-tight" style={{ fontFamily: "'Source Serif 4', serif" }}>
            Habeas
          </div>
          <div className="text-gray-500 text-xs mt-0.5">
            {state.connected ? 'Connected' : 'Demo Mode'}
          </div>
        </div>
        <div className="flex-1 px-2 space-y-0.5">
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => navigate(n.id)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isNavActive(n.id)
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-white/10">
          <div className="text-xs text-gray-500 truncate mb-2">{state.user?.name || state.user?.userId}</div>
          <button
            onClick={() => dispatch({ type: 'LOGOUT' })}
            className="w-full text-xs text-gray-500 hover:text-gray-300 text-left"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-5">
          {/* Breadcrumb */}
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="cursor-pointer hover:text-gray-600" onClick={() => navigate(SCREENS.CASES)}>
                Habeas
              </span>
              <span>&rsaquo;</span>
              <span className="text-gray-600 font-semibold">{screenLabels[state.screen] || ''}</span>
            </div>
          </div>

          {state.loading && (
            <div className="text-center py-4 text-sm text-gray-400">Loading...</div>
          )}

          {state.screen === SCREENS.CASES && <CasesScreen />}
          {state.screen === SCREENS.WORKSPACE && <WorkspaceScreen />}
          {state.screen === SCREENS.TEMPLATES && <TemplatesScreen />}
          {state.screen === SCREENS.TEMPLATE_EDIT && <TemplateEditScreen />}
          {state.screen === SCREENS.PIPELINE && <PipelineScreen />}
        </div>
      </div>

      {/* Toast */}
      {state.toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-semibold shadow-lg z-50 ${
            state.toast.isError ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
          }`}
        >
          {state.toast.message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
