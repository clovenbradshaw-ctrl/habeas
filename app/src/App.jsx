import { useMemo } from 'react';
import { AppProvider, useApp, SCREENS } from './context/AppContext';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import CasesScreen from './screens/CasesScreen';
import WorkspaceScreen from './screens/WorkspaceScreen';
import TemplatesScreen from './screens/TemplatesScreen';
import TemplateEditScreen from './screens/TemplateEditScreen';
import PipelineScreen from './screens/PipelineScreen';
import IntakeScreen from './screens/IntakeScreen';
import UserManagementScreen from './screens/UserManagementScreen';
import SharedWithMeScreen from './screens/SharedWithMeScreen';

// SVG icon components for sidebar
function IconDashboard() {
  return (
    <svg className="w-[18px] h-[18px] opacity-70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
function IconCases() {
  return (
    <svg className="w-[18px] h-[18px] opacity-70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconPipeline() {
  return (
    <svg className="w-[18px] h-[18px] opacity-70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
function IconTemplates() {
  return (
    <svg className="w-[18px] h-[18px] opacity-70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}
function IconAlert() {
  return (
    <svg className="w-[18px] h-[18px] opacity-70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function IconShared() {
  return (
    <svg className="w-[18px] h-[18px] opacity-70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="w-[18px] h-[18px] opacity-70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function AppShell() {
  const { state, navigate, dispatch } = useApp();

  if (!state.isLoggedIn) {
    return <LoginScreen />;
  }

  // Compute badge counts
  const activeCases = state.cases.filter(c => c.stage !== 'Resolved' && !c.archived);
  const sharedWithMeCount = (state.fileShares || []).filter(s => s.sharedWith === state.user?.userId).length;
  const needsAttention = useMemo(() => {
    return activeCases.filter(c => {
      const days = c.daysInStage || 0;
      if (days > 10) return true;
      const emptyVars = c.variables ? Object.values(c.variables).filter(v => !v || !String(v).trim()).length : 0;
      if (emptyVars > 3) return true;
      const openComments = (c.comments || []).filter(cm => cm.status === 'open').length;
      if (openComments > 0 && c.stage === 'Attorney Review') return true;
      return false;
    }).length;
  }, [activeCases]);

  function isNavActive(navId) {
    if (state.screen === navId) return true;
    if (state.screen === SCREENS.WORKSPACE && navId === SCREENS.CASES) return true;
    if (state.screen === SCREENS.INTAKE && navId === SCREENS.CASES) return true;
    if (state.screen === SCREENS.TEMPLATE_EDIT && navId === SCREENS.TEMPLATES) return true;
    return false;
  }

  // Workspace and Intake get full-width layout (no padding container)
  const isFullWidth = state.screen === SCREENS.WORKSPACE || state.screen === SCREENS.INTAKE;

  const userInitials = (state.user?.name || state.user?.userId || 'U')
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('');

  return (
    <div className="flex h-screen bg-[#f8f7f5] text-gray-900" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-[220px] min-w-[220px] bg-[#1a1a1e] flex flex-col sticky top-0 h-screen z-50">
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
          <h1 className="text-white font-bold text-[1.4rem] tracking-tight" style={{ fontFamily: "'Source Serif 4', serif" }}>
            Habeas
          </h1>
          <div className="text-[0.7rem] text-white/35 mt-0.5 flex items-center gap-[5px]">
            {state.connected && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
            {state.connected ? 'Connected' : 'Demo Mode'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3">
          {/* Overview section */}
          <div className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-white/25 px-3 pt-3 pb-1.5">
            Overview
          </div>
          <NavItem active={isNavActive(SCREENS.DASHBOARD)} onClick={() => navigate(SCREENS.DASHBOARD)} icon={<IconDashboard />} label="Dashboard" />
          <NavItem active={isNavActive(SCREENS.CASES)} onClick={() => navigate(SCREENS.CASES)} icon={<IconCases />} label={state.role === 'admin' ? 'All Cases' : 'My Cases'} badge={activeCases.length} />
          <NavItem active={isNavActive(SCREENS.PIPELINE)} onClick={() => navigate(SCREENS.PIPELINE)} icon={<IconPipeline />} label="Pipeline" />
          <NavItem active={isNavActive(SCREENS.SHARED)} onClick={() => navigate(SCREENS.SHARED)} icon={<IconShared />} label="Shared Files" badge={sharedWithMeCount} />

          {/* Library section */}
          <div className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-white/25 px-3 pt-4 pb-1.5">
            Library
          </div>
          <NavItem active={isNavActive(SCREENS.TEMPLATES)} onClick={() => navigate(SCREENS.TEMPLATES)} icon={<IconTemplates />} label="Templates" />

          {/* Alerts section */}
          <div className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-white/25 px-3 pt-4 pb-1.5">
            Alerts
          </div>
          <NavItem onClick={() => navigate(SCREENS.DASHBOARD)} icon={<IconAlert />} label="Needs Attention" badge={needsAttention} badgeAlert />

          {/* Admin section (only for admins) */}
          {state.role === 'admin' && (
            <>
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-white/25 px-3 pt-4 pb-1.5">
                Admin
              </div>
              <NavItem active={isNavActive(SCREENS.USERS)} onClick={() => navigate(SCREENS.USERS)} icon={<IconUsers />} label="Users" badge={(state.users || []).length} />
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-[30px] h-[30px] rounded-full bg-purple-500 flex items-center justify-center text-white text-[0.7rem] font-semibold">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.75rem] font-semibold text-white/80 truncate">
                {state.user?.name || state.user?.userId}
              </div>
              <div className="text-[0.65rem] text-white/35">
                {state.role === 'admin' ? 'Admin' : 'Attorney'}
              </div>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'LOGOUT' })}
            className="mt-2 text-[0.7rem] text-white/35 hover:text-white/60 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {isFullWidth ? (
          <>
            {state.screen === SCREENS.WORKSPACE && <WorkspaceScreen />}
            {state.screen === SCREENS.INTAKE && <IntakeScreen />}
          </>
        ) : (
          <div className="flex-1 p-7 max-w-[1200px] w-full mx-auto">
            {state.loading && (
              <div className="text-center py-4 text-sm text-gray-400">Loading...</div>
            )}
            {state.screen === SCREENS.DASHBOARD && <DashboardScreen />}
            {state.screen === SCREENS.CASES && <CasesScreen />}
            {state.screen === SCREENS.TEMPLATES && <TemplatesScreen />}
            {state.screen === SCREENS.TEMPLATE_EDIT && <TemplateEditScreen />}
            {state.screen === SCREENS.PIPELINE && <PipelineScreen />}
            {state.screen === SCREENS.SHARED && <SharedWithMeScreen />}
            {state.screen === SCREENS.USERS && <UserManagementScreen />}
          </div>
        )}
      </main>

      {/* Toast */}
      {state.toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-semibold shadow-lg z-[100] ${
            state.toast.isError ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
          }`}
        >
          {state.toast.message}
        </div>
      )}
    </div>
  );
}

function NavItem({ active, onClick, icon, label, badge, badgeAlert }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-[9px] rounded-md text-[0.82rem] font-medium transition-all relative ${
        active
          ? 'bg-white/[0.12] text-white font-semibold'
          : 'text-white/55 hover:bg-white/[0.06] hover:text-white/80'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`ml-auto text-[0.65rem] font-semibold px-[7px] py-[1px] rounded-[10px] ${
          badgeAlert
            ? 'bg-red-500 text-white'
            : 'bg-white/15 text-white/70'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
