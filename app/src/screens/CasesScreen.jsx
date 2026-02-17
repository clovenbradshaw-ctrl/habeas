import { useState, useMemo } from 'react';
import { useApp, SCREENS } from '../context/AppContext';
import Chip from '../components/Chip';
import DocReadinessBar from '../components/DocReadinessBar';
import { STAGE_CHIP_COLORS, STAGES } from '../lib/matrix';
import { buildCascadeFromFacility, buildCountryVariables, buildAttorneyVariables } from '../lib/seedData';

const NEXT_ACTIONS = {
  'Intake': 'Complete client information and assign documents',
  'Drafting': 'Fill remaining variables in petition',
  'Attorney Review': 'Review proposed documents \u2014 reviewer comments pending',
  'Ready to File': 'All documents ready \u2014 proceed to filing',
  'Filed': 'Awaiting court response \u2014 monitor ECF',
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
  const [newFacilityId, setNewFacilityId] = useState('');
  const [newCountryId, setNewCountryId] = useState('');
  const [newAttorneyId, setNewAttorneyId] = useState('');
  const [newStatuteId, setNewStatuteId] = useState('');
  const [facilitySearch, setFacilitySearch] = useState('');

  const refData = state.refData || {};
  const facilities = refData.facility || [];
  const countries = refData.country || [];
  const attorneys = refData.attorney || [];
  const statutes = refData.detention_statute || [];

  // Cascade: compute auto-populated values when facility is selected
  const cascade = useMemo(() => {
    if (!newFacilityId) return null;
    return buildCascadeFromFacility(newFacilityId, {
      facilities: refData.facility || [],
      fieldOffices: refData.field_office || [],
      wardens: refData.warden || [],
      courts: refData.court || [],
      officials: refData.official || [],
      attorneys: refData.attorney || [],
    });
  }, [newFacilityId, refData]);

  // Filter facilities by search
  const filteredFacilities = useMemo(() => {
    if (!facilitySearch.trim()) return facilities;
    const q = facilitySearch.toLowerCase();
    return facilities.filter(f => f.name.toLowerCase().includes(q) || f.location.toLowerCase().includes(q));
  }, [facilities, facilitySearch]);

  // Filter to user's cases (or show all in demo)
  const myCases = state.cases.filter(c => {
    if (!state.connected) return true;
    return c.owner === state.user?.userId;
  });

  const activeCases = myCases.filter(c => c.stage !== 'Resolved');

  function getDocReadiness(c) {
    const docs = c.documents || [];
    const ready = docs.filter(d => d.status === 'ready' || d.status === 'filed').length;
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

    const facility = facilities.find(f => f.id === newFacilityId);
    const court = cascade?.suggestedCourts?.[0];

    // Determine circuit from court district
    let circuit = 'Unknown';
    if (court) {
      const districtLower = court.district.toLowerCase();
      if (districtLower.includes('virginia') || districtLower.includes('carolina') || districtLower.includes('maryland') || districtLower.includes('west virginia')) circuit = '4th Cir.';
      else if (districtLower.includes('georgia') || districtLower.includes('florida') || districtLower.includes('alabama')) circuit = '11th Cir.';
      else if (districtLower.includes('arizona') || districtLower.includes('california') || districtLower.includes('nevada') || districtLower.includes('oregon') || districtLower.includes('washington') || districtLower.includes('hawaii') || districtLower.includes('alaska') || districtLower.includes('idaho') || districtLower.includes('montana')) circuit = '9th Cir.';
      else if (districtLower.includes('texas')) circuit = '5th Cir.';
      else if (districtLower.includes('pennsylvania') || districtLower.includes('new jersey') || districtLower.includes('delaware')) circuit = '3rd Cir.';
      else if (districtLower.includes('new york') || districtLower.includes('connecticut') || districtLower.includes('vermont')) circuit = '2nd Cir.';
      else if (districtLower.includes('ohio') || districtLower.includes('michigan') || districtLower.includes('kentucky') || districtLower.includes('tennessee')) circuit = '6th Cir.';
    }

    const statute = statutes.find(s => s.id === newStatuteId);

    const id = await createCase({
      petitionerName: newCaseName.trim(),
      stage: 'Intake',
      circuit,
      facility: facility?.name || 'Unknown',
      facilityId: newFacilityId || undefined,
      facilityLocation: facility?.location || '',
      courtId: court?.id || undefined,
      countryId: newCountryId || undefined,
      detentionStatuteId: newStatuteId || undefined,
      leadAttorneyId: newAttorneyId || undefined,
      chargeIds: [],
      variables: {
        PETITIONER_NAME: newCaseName.trim(),
        ...(statute ? { DETENTION_STATUTE: statute.section } : {}),
      },
      documents: [],
    });
    setShowNewCase(false);
    setNewCaseName('');
    setNewFacilityId('');
    setNewCountryId('');
    setNewAttorneyId('');
    setNewStatuteId('');
    setFacilitySearch('');
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

      {/* New case form with cascade wizard */}
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
              <label className="block text-xs font-semibold text-gray-500 mb-1">Country of Origin</label>
              <select
                value={newCountryId}
                onChange={(e) => setNewCountryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Select country...</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Detention Facility</label>
              {facilities.length > 0 ? (
                <>
                  <input
                    value={facilitySearch}
                    onChange={(e) => { setFacilitySearch(e.target.value); setNewFacilityId(''); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 mb-1"
                    placeholder="Search facilities..."
                  />
                  {facilitySearch && !newFacilityId && (
                    <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white shadow-lg">
                      {filteredFacilities.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => { setNewFacilityId(f.id); setFacilitySearch(f.name); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0"
                        >
                          <span className="font-semibold text-gray-800">{f.name}</span>
                          <span className="text-gray-400 ml-2">{f.location}</span>
                          {f.operator && <span className="text-gray-300 ml-1">({f.operator})</span>}
                        </button>
                      ))}
                      {filteredFacilities.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">No matching facilities</div>}
                    </div>
                  )}
                </>
              ) : (
                <input
                  value={facilitySearch}
                  onChange={(e) => setFacilitySearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Facility name"
                />
              )}
            </div>
          </div>

          {/* Cascade preview */}
          {cascade && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 space-y-1">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Auto-populated from facility</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {cascade.warden && (
                  <div className="text-xs text-gray-600"><span className="text-gray-400">Warden:</span> {cascade.warden.title} {cascade.warden.name}</div>
                )}
                {cascade.fieldOffice && (
                  <div className="text-xs text-gray-600"><span className="text-gray-400">Field Office:</span> {cascade.fieldOffice.name}</div>
                )}
                {cascade.variables?.FOD_NAME && (
                  <div className="text-xs text-gray-600"><span className="text-gray-400">FOD:</span> {cascade.variables.FOD_NAME}</div>
                )}
                {cascade.variables?.DISTRICT_FULL && (
                  <div className="text-xs text-gray-600"><span className="text-gray-400">Court:</span> {cascade.variables.DISTRICT_FULL}</div>
                )}
                {cascade.variables?.AG_NAME && (
                  <div className="text-xs text-gray-600"><span className="text-gray-400">AG:</span> {cascade.variables.AG_NAME}</div>
                )}
                {cascade.variables?.DHS_SECRETARY && (
                  <div className="text-xs text-gray-600"><span className="text-gray-400">DHS Sec:</span> {cascade.variables.DHS_SECRETARY}</div>
                )}
                {cascade.variables?.ICE_DIRECTOR && (
                  <div className="text-xs text-gray-600"><span className="text-gray-400">ICE Dir:</span> {cascade.variables.ICE_DIRECTOR}</div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Detention Statute</label>
              <select
                value={newStatuteId}
                onChange={(e) => setNewStatuteId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Select statute...</option>
                {statutes.map(s => <option key={s.id} value={s.id}>{s.section} \u2014 {s.shortName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Lead Attorney</label>
              <select
                value={newAttorneyId}
                onChange={(e) => setNewAttorneyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Select attorney...</option>
                {attorneys.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowNewCase(false); setNewFacilityId(''); setFacilitySearch(''); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
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
                  {c.circuit} {c.circuit && c.facility ? '\u00b7' : ''} {c.facility}
                  {c.facilityLocation && <span className="text-gray-400"> \u2014 {c.facilityLocation}</span>}
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
