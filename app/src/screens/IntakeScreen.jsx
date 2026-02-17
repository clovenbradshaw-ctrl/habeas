import { useState, useMemo } from 'react';
import { useApp, SCREENS } from '../context/AppContext';
import { buildCascadeFromFacility } from '../lib/seedData';

const STEPS = [
  { num: 1, label: 'Client Info' },
  { num: 2, label: 'Detention Details' },
  { num: 3, label: 'Assign Documents' },
];

export default function IntakeScreen() {
  const { state, navigate, createCase, openCase, showToast } = useApp();

  const [step, setStep] = useState(1);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [countryId, setCountryId] = useState('');
  const [aNumber, setANumber] = useState('');
  const [facilitySearch, setFacilitySearch] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [statuteId, setStatuteId] = useState('');
  const [attorneyId, setAttorneyId] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState(new Set());

  const refData = state.refData || {};
  const facilities = refData.facility || [];
  const countries = refData.country || [];
  const attorneys = refData.attorney || [];
  const statutes = refData.detention_statute || [];

  // Cascade from facility
  const cascade = useMemo(() => {
    if (!facilityId) return null;
    return buildCascadeFromFacility(facilityId, {
      facilities: refData.facility || [],
      fieldOffices: refData.field_office || [],
      wardens: refData.warden || [],
      courts: refData.court || [],
      officials: refData.official || [],
      attorneys: refData.attorney || [],
    });
  }, [facilityId, refData]);

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    if (!facilitySearch.trim()) return facilities;
    const q = facilitySearch.toLowerCase();
    return facilities.filter(f => f.name.toLowerCase().includes(q) || f.location?.toLowerCase().includes(q));
  }, [facilities, facilitySearch]);

  // Suggested templates based on statute
  const suggestedTemplates = useMemo(() => {
    return state.templates.map(t => ({
      ...t,
      suggested: true, // In a full impl, this would be based on statute mapping
    }));
  }, [state.templates, statuteId]);

  // Initialize selected templates with first 4 on mount
  useMemo(() => {
    if (selectedTemplates.size === 0 && suggestedTemplates.length > 0) {
      setSelectedTemplates(new Set(suggestedTemplates.slice(0, 4).map(t => t.id)));
    }
  }, [suggestedTemplates]);

  const step1Valid = lastName.trim() && firstName.trim();
  const step2Valid = facilityId;

  // Determine circuit from cascade
  function getCircuit() {
    const court = cascade?.suggestedCourts?.[0];
    if (!court) return 'Unknown';
    const d = court.district.toLowerCase();
    if (d.includes('virginia') || d.includes('carolina') || d.includes('maryland')) return '4th Cir.';
    if (d.includes('georgia') || d.includes('florida') || d.includes('alabama')) return '11th Cir.';
    if (d.includes('arizona') || d.includes('california') || d.includes('washington') || d.includes('oregon') || d.includes('nevada') || d.includes('hawaii') || d.includes('alaska') || d.includes('idaho') || d.includes('montana')) return '9th Cir.';
    if (d.includes('texas')) return '5th Cir.';
    if (d.includes('pennsylvania') || d.includes('new jersey') || d.includes('delaware')) return '3rd Cir.';
    if (d.includes('ohio') || d.includes('michigan') || d.includes('kentucky') || d.includes('tennessee')) return '6th Cir.';
    return 'Unknown';
  }

  async function handleCreate() {
    if (!step1Valid) return;
    const petitionerName = `${lastName.trim()}, ${firstName.trim()}`;
    const facility = facilities.find(f => f.id === facilityId);
    const court = cascade?.suggestedCourts?.[0];
    const statute = statutes.find(s => s.id === statuteId);

    // Build documents from selected templates
    const documents = [];
    for (const tplId of selectedTemplates) {
      const tpl = state.templates.find(t => t.id === tplId);
      if (tpl) {
        documents.push({
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          templateId: tpl.id,
          name: tpl.name,
          status: 'empty',
          variableOverrides: {},
        });
      }
    }

    const id = await createCase({
      petitionerName,
      stage: 'Intake',
      circuit: getCircuit(),
      facility: facility?.name || 'Unknown',
      facilityId: facilityId || undefined,
      facilityLocation: facility?.location || '',
      courtId: court?.id || undefined,
      countryId: countryId || undefined,
      detentionStatuteId: statuteId || undefined,
      leadAttorneyId: attorneyId || undefined,
      chargeIds: [],
      variables: {
        PETITIONER_NAME: petitionerName,
        ...(statute ? { DETENTION_STATUTE: statute.section } : {}),
      },
      documents,
    });
    showToast('Case created');
    openCase(id);
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-7 py-4 flex items-center gap-3.5 flex-wrap">
        <button onClick={() => navigate(SCREENS.CASES)} className="text-[0.78rem] text-gray-400 hover:text-blue-500 cursor-pointer">
          &larr; My Cases
        </button>
        <span className="text-[1.1rem] font-bold">New Case Intake</span>
        <div className="flex-1" />
        <button
          onClick={() => navigate(SCREENS.CASES)}
          className="text-[0.8rem] font-semibold px-3 py-[5px] rounded-md border border-gray-200 text-gray-500 hover:border-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!step1Valid}
          className="text-[0.8rem] font-semibold px-4 py-[5px] rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
        >
          Create & Open &rarr;
        </button>
      </div>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-200 px-7 flex items-center overflow-x-auto">
        {STEPS.map((s) => (
          <div
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`flex items-center gap-2 px-4 py-3 text-[0.72rem] font-medium whitespace-nowrap cursor-pointer relative ${
              step === s.num
                ? 'text-blue-500 font-semibold'
                : step > s.num
                  ? 'text-green-600'
                  : 'text-gray-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              step === s.num ? 'bg-blue-500 shadow-[0_0_0_3px_#edf2fc]' :
              step > s.num ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            {s.num}. {s.label}
            {s.num < STEPS.length && <span className="ml-2 text-gray-300 text-base">&rsaquo;</span>}
          </div>
        ))}
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] w-full mx-auto p-7">

          {/* Step 1: Client Info */}
          {step === 1 && (
            <div className="bg-white border border-gray-200 rounded-[14px] p-6 mb-4">
              <div className="text-[0.9rem] font-semibold mb-1">Client Information</div>
              <div className="text-[0.75rem] text-gray-400 mb-4">Basic petitioner details. Required fields marked with *.</div>
              <div className="grid grid-cols-2 gap-3.5">
                <FormField label="Last Name *" value={lastName} onChange={setLastName} placeholder="e.g. Garcia" autoFocus />
                <FormField label="First Name *" value={firstName} onChange={setFirstName} placeholder="e.g. Maria" />
                <div className="flex flex-col gap-1">
                  <label className="text-[0.72rem] font-semibold text-gray-500">Country of Origin</label>
                  <select
                    value={countryId}
                    onChange={(e) => setCountryId(e.target.value)}
                    className="px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
                    style={{ fontFamily: 'inherit' }}
                  >
                    <option value="">Select country...</option>
                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <FormField label="A-Number" value={aNumber} onChange={setANumber} placeholder="A# xxx-xxx-xxx" />
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={() => setStep(2)} disabled={!step1Valid} className="text-[0.8rem] font-semibold px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40">
                  Next: Detention Details &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Detention Details */}
          {step === 2 && (
            <div className="bg-white border border-gray-200 rounded-[14px] p-6 mb-4">
              <div className="text-[0.9rem] font-semibold mb-1">Detention Facility</div>
              <div className="text-[0.75rem] text-gray-400 mb-4">Selecting a facility auto-populates warden, court, and jurisdiction details.</div>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[0.72rem] font-semibold text-gray-500">Search Facility *</label>
                  {facilities.length > 0 ? (
                    <div className="relative">
                      <input
                        value={facilitySearch}
                        onChange={(e) => { setFacilitySearch(e.target.value); setFacilityId(''); }}
                        placeholder="Start typing facility name\u2026"
                        className="w-full px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
                        style={{ fontFamily: 'inherit' }}
                      />
                      {facilitySearch && !facilityId && (
                        <div className="absolute z-10 left-0 right-0 top-full mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-lg">
                          {filteredFacilities.map(f => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => { setFacilityId(f.id); setFacilitySearch(f.name); }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0"
                            >
                              <span className="font-semibold text-gray-800">{f.name}</span>
                              <span className="text-gray-400 ml-2">{f.location}</span>
                            </button>
                          ))}
                          {filteredFacilities.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">No matching facilities</div>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      value={facilitySearch}
                      onChange={(e) => setFacilitySearch(e.target.value)}
                      placeholder="Facility name"
                      className="px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
                      style={{ fontFamily: 'inherit' }}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[0.72rem] font-semibold text-gray-500">Detention Statute</label>
                  <select
                    value={statuteId}
                    onChange={(e) => setStatuteId(e.target.value)}
                    className="px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
                    style={{ fontFamily: 'inherit' }}
                  >
                    <option value="">Select statute...</option>
                    {statutes.map(s => <option key={s.id} value={s.id}>{s.section} &mdash; {s.shortName}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[0.72rem] font-semibold text-gray-500">Lead Attorney</label>
                  <select
                    value={attorneyId}
                    onChange={(e) => setAttorneyId(e.target.value)}
                    className="px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
                    style={{ fontFamily: 'inherit' }}
                  >
                    <option value="">Select attorney...</option>
                    {attorneys.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Cascade preview */}
              {cascade && (
                <div className="bg-blue-50 border border-blue-200 rounded-[10px] px-[18px] py-4 mt-3">
                  <div className="text-[0.65rem] font-bold uppercase tracking-[0.06em] text-blue-600 mb-2.5">
                    Auto-populated from {facilities.find(f => f.id === facilityId)?.name || 'facility'}
                  </div>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
                    {cascade.warden && (
                      <CascadeItem label="Warden" value={`${cascade.warden.title || ''} ${cascade.warden.name}`} />
                    )}
                    {cascade.facility?.location && (
                      <CascadeItem label="Location" value={cascade.facility.location} />
                    )}
                    {cascade.fieldOffice && (
                      <CascadeItem label="Field Office" value={cascade.fieldOffice.name} />
                    )}
                    {cascade.variables?.FOD_NAME && (
                      <CascadeItem label="FOD" value={cascade.variables.FOD_NAME} />
                    )}
                    {cascade.variables?.DISTRICT_FULL && (
                      <CascadeItem label="Court" value={cascade.variables.DISTRICT_FULL} />
                    )}
                    {cascade.variables?.AG_NAME && (
                      <CascadeItem label="AG" value={cascade.variables.AG_NAME} />
                    )}
                    {cascade.variables?.ICE_DIRECTOR && (
                      <CascadeItem label="ICE Dir." value={cascade.variables.ICE_DIRECTOR} />
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-4">
                <button onClick={() => setStep(1)} className="text-[0.8rem] font-semibold px-4 py-2 rounded-md border border-gray-200 text-gray-500 hover:border-gray-400">
                  &larr; Back
                </button>
                <button onClick={() => setStep(3)} className="text-[0.8rem] font-semibold px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600">
                  Next: Assign Documents &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Assign Documents */}
          {step === 3 && (
            <div className="bg-white border border-gray-200 rounded-[14px] p-6 mb-4">
              <div className="text-[0.9rem] font-semibold mb-1">Suggested Documents</div>
              <div className="text-[0.75rem] text-gray-400 mb-4">
                {statuteId
                  ? `Based on detention statute, we recommend these templates. You can add or remove later.`
                  : `Select document templates for this case. You can add or remove later.`}
              </div>
              <div className="flex flex-col gap-2">
                {suggestedTemplates.map((t) => {
                  const checked = selectedTemplates.has(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-md cursor-pointer transition-all ${
                        checked ? 'bg-blue-50 border-blue-200' : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(selectedTemplates);
                          if (checked) next.delete(t.id); else next.add(t.id);
                          setSelectedTemplates(next);
                        }}
                      />
                      <div>
                        <div className="text-[0.82rem] font-medium">{t.name}</div>
                        <div className="text-[0.7rem] text-gray-400">
                          {t.category} &middot; {t.sections?.length || 0} sections &middot; {t.variables?.length || 0} variables
                        </div>
                      </div>
                    </label>
                  );
                })}
                {suggestedTemplates.length === 0 && (
                  <div className="text-[0.82rem] text-gray-400 text-center py-4">No templates available. Create templates first.</div>
                )}
              </div>
              <div className="flex justify-between mt-4">
                <button onClick={() => setStep(2)} className="text-[0.8rem] font-semibold px-4 py-2 rounded-md border border-gray-200 text-gray-500 hover:border-gray-400">
                  &larr; Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!step1Valid}
                  className="text-[0.8rem] font-semibold px-5 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
                >
                  Create & Open &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, autoFocus }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[0.72rem] font-semibold text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="px-3 py-[9px] border border-gray-200 rounded-md text-[0.82rem] bg-white outline-none focus:border-blue-300"
        style={{ fontFamily: 'inherit' }}
      />
    </div>
  );
}

function CascadeItem({ label, value }) {
  return (
    <div className="flex justify-between text-[0.72rem]">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
