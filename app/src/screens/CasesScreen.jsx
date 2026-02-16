import { useState } from 'react';
import { useApp, SCREENS } from '../context/AppContext';
import Chip from '../components/Chip';
import DocReadinessBar from '../components/DocReadinessBar';
import { STAGE_CHIP_COLORS, STAGES } from '../lib/matrix';

const NEXT_ACTIONS = {
  'Intake': 'Complete client information and assign documents',
  'Drafting': 'Fill remaining variables in petition',
  'Attorney Review': 'Review proposed documents — reviewer comments pending',
  'Ready to File': 'All documents ready — proceed to filing',
  'Filed': 'Awaiting court response — monitor ECF',
  'Awaiting Response': 'Government response pending',
  'Reply Filed': 'Awaiting court ruling',
  'Order Received': 'Review court order and determine next steps',
  'Bond Hearing': 'Prepare for bond hearing',
  'Resolved': 'Case resolved',
};

export default function CasesScreen() {
  const { state, navigate, openCase, createCase, showToast } = useApp();
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseCircuit, setNewCaseCircuit] = useState('');
  const [newCaseFacility, setNewCaseFacility] = useState('');
  const [newCaseFacilityLocation, setNewCaseFacilityLocation] = useState('');

  // Filter to user's cases (or show all in demo)
  const myCases = state.cases.filter(c => {
    if (!state.connected) return true;
    return c.owner === state.user?.userId;
  });

  const activeCases = myCases.filter(c => c.stage !== 'Resolved');

  function getDocReadiness(c) {
    const docs = c.documents || [];
    const ready = docs.filter(d => d.status === 'ready').length;
    return { ready, total: docs.length };
  }

  function getDaysColor(days) {
    if (days > 10) return 'red';
    if (days > 5) return 'yellow';
    return 'green';
  }

  function getNextAction(c) {
    const docs = c.documents || [];
    const emptyVars = c.variables ? Object.values(c.variables).filter(v => !v).length : 0;
    if (c.stage === 'Drafting' && emptyVars > 0) {
      return `Fill remaining variables in petition (${emptyVars} empty)`;
    }
    return NEXT_ACTIONS[c.stage] || 'Review case status';
  }

  async function handleCreateCase(e) {
    e.preventDefault();
    if (!newCaseName.trim()) return;
    const id = await createCase({
      petitionerName: newCaseName.trim(),
      stage: 'Intake',
      circuit: newCaseCircuit.trim() || 'Unknown',
      facility: newCaseFacility.trim() || 'Unknown',
      facilityLocation: newCaseFacilityLocation.trim() || '',
      variables: { PETITIONER_NAME: newCaseName.trim() },
      documents: [],
    });
    setShowNewCase(false);
    setNewCaseName('');
    setNewCaseCircuit('');
    setNewCaseFacility('');
    setNewCaseFacilityLocation('');
    showToast('Case created');
    openCase(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">My Cases</h2>
          <p className="text-sm text-gray-500">{activeCases.length} active case{activeCases.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNewCase(true)}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Case
        </button>
      </div>

      {/* New case form */}
      {showNewCase && (
        <form onSubmit={handleCreateCase} className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Create New Case</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Petitioner Name *</label>
              <input
                value={newCaseName}
                onChange={(e) => setNewCaseName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="Last, First"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Circuit</label>
              <input
                value={newCaseCircuit}
                onChange={(e) => setNewCaseCircuit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g., 4th Cir."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Facility</label>
              <input
                value={newCaseFacility}
                onChange={(e) => setNewCaseFacility(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="Facility name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Facility Location</label>
              <input
                value={newCaseFacilityLocation}
                onChange={(e) => setNewCaseFacilityLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="City, State"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowNewCase(false)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              Create Case
            </button>
          </div>
        </form>
      )}

      {/* Case cards */}
      {activeCases.length === 0 && !showNewCase && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No cases yet. Create one to get started.</p>
        </div>
      )}

      {activeCases.map((c) => {
        const dr = getDocReadiness(c);
        return (
          <div
            key={c.id}
            onClick={() => openCase(c.id)}
            className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-gray-900">{c.petitionerName}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {c.circuit} · {c.facility}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Chip color={getDaysColor(c.daysInStage)}>{c.daysInStage}d</Chip>
                <Chip color={STAGE_CHIP_COLORS[c.stage] || 'gray'}>{c.stage}</Chip>
              </div>
            </div>

            {dr.total > 0 && (
              <div className="mb-3">
                <DocReadinessBar ready={dr.ready} total={dr.total} />
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-0.5">Next step</div>
              <div className="text-xs text-blue-800">{getNextAction(c)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
