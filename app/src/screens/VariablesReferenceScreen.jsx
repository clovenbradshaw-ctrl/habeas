import { useState, useMemo } from 'react';
import { VARIABLE_GROUPS } from '../lib/seedData';

const VAR_META = {
  // Petitioner
  PETITIONER_NAME: { label: 'Full Name', desc: "Client's full legal name", type: 'text' },
  PETITIONER_COUNTRY: { label: 'Country', desc: 'Country of origin (short name)', type: 'select', auto: 'country' },
  PETITIONER_COUNTRY_FORMAL: { label: 'Country (Formal)', desc: 'Formal country name (e.g. "the Republic of Honduras")', type: 'text', auto: 'country' },
  PETITIONER_DEMONYM: { label: 'Demonym', desc: 'Country demonym (e.g. "Honduran")', type: 'text', auto: 'country' },
  ENTRY_DATE: { label: 'Entry Date', desc: 'Date client entered the United States', type: 'date' },
  YEARS_RESIDENCE: { label: 'Residence Years', desc: 'Years of residence in the US', type: 'number' },
  APPREHENSION_LOCATION: { label: 'Apprehension Location', desc: 'Location where client was apprehended', type: 'text' },
  APPREHENSION_DATE: { label: 'Apprehension Date', desc: 'Date of apprehension', type: 'date' },
  CRIMINAL_HISTORY: { label: 'Criminal History', desc: 'Criminal history summary', type: 'text' },
  COMMUNITY_TIES: { label: 'Community Ties', desc: 'Description of community ties and connections', type: 'textarea' },

  // Detention
  DETENTION_FACILITY: { label: 'Facility Name', desc: 'Detention facility name', type: 'text', auto: 'cascade' },
  FACILITY_LOCATION: { label: 'Facility Location', desc: 'Facility city/state', type: 'text', auto: 'cascade' },
  FACILITY_OPERATOR: { label: 'Facility Operator', desc: 'Private operator name', type: 'text', auto: 'cascade' },
  WARDEN_NAME: { label: 'Warden Name', desc: "Current warden's full name", type: 'text', auto: 'cascade' },
  WARDEN_TITLE: { label: 'Warden Title', desc: "Warden's title", type: 'text', auto: 'cascade' },
  DETENTION_DAYS: { label: 'Days Detained', desc: 'Total days detained (used in conditional logic)', type: 'number' },
  DETENTION_STATUTE: { label: 'Detention Statute', desc: 'INA statute section', type: 'text' },

  // Court
  DISTRICT_FULL: { label: 'District', desc: 'Full district name', type: 'text', auto: 'cascade' },
  DIVISION: { label: 'Division', desc: 'Court division', type: 'text', auto: 'cascade' },
  COURT_LOCATION: { label: 'Court Location', desc: 'Court city/state', type: 'text', auto: 'cascade' },
  COURT_ADDRESS: { label: 'Court Address', desc: 'Full court street address', type: 'text', auto: 'cascade' },
  CASE_NUMBER: { label: 'Case Number', desc: 'Federal case number', type: 'text' },
  JUDGE_NAME: { label: 'Judge Name', desc: "Assigned judge's full name", type: 'text', auto: 'cascade' },
  JUDGE_TITLE: { label: 'Judge Title', desc: "Judge's title", type: 'text', auto: 'cascade' },
  JUDGE_CODE: { label: 'Judge Code', desc: 'Judge initials/code', type: 'text', auto: 'cascade' },
  FILING_DATE: { label: 'Filing Date', desc: 'Document filing date', type: 'date' },

  // Officials
  FOD_NAME: { label: 'Field Office Director', desc: 'ICE Field Office Director name', type: 'text', auto: 'cascade' },
  FIELD_OFFICE: { label: 'Field Office', desc: 'Field Office name', type: 'text', auto: 'cascade' },
  FIELD_OFFICE_ADDRESS: { label: 'Field Office Address', desc: 'Field Office street address', type: 'text', auto: 'cascade' },
  ICE_DIRECTOR: { label: 'ICE Director', desc: 'ICE Director name (prefixed with "Acting" if applicable)', type: 'text', auto: 'cascade' },
  ICE_DIRECTOR_ACTING: { label: 'ICE Director Acting', desc: 'Whether ICE Director is acting ("yes" or "no")', type: 'text', auto: 'cascade' },
  DHS_SECRETARY: { label: 'DHS Secretary', desc: 'DHS Secretary name (prefixed with "Acting" if applicable)', type: 'text', auto: 'cascade' },
  AG_NAME: { label: 'Attorney General', desc: 'Attorney General name (prefixed with "Acting" if applicable)', type: 'text', auto: 'cascade' },

  // Attorneys
  ATTORNEY_1_NAME: { label: 'Lead Attorney Name', desc: 'Lead attorney full name', type: 'text', auto: 'attorney' },
  ATTORNEY_1_BAR: { label: 'Lead Attorney Bar #', desc: 'Lead attorney bar number', type: 'text', auto: 'attorney' },
  ATTORNEY_1_FIRM: { label: 'Lead Attorney Firm', desc: 'Lead attorney firm name', type: 'text', auto: 'attorney' },
  ATTORNEY_1_ADDR: { label: 'Lead Attorney Address', desc: 'Lead attorney firm address', type: 'text', auto: 'attorney' },
  ATTORNEY_1_PHONE: { label: 'Lead Attorney Phone', desc: 'Lead attorney phone number', type: 'tel', auto: 'attorney' },
  ATTORNEY_1_EMAIL: { label: 'Lead Attorney Email', desc: 'Lead attorney email address', type: 'email', auto: 'attorney' },
  ATTORNEY_2_NAME: { label: '2nd Attorney Name', desc: 'Second attorney full name', type: 'text', auto: 'attorney' },
  ATTORNEY_2_BAR: { label: '2nd Attorney Bar #', desc: 'Second attorney bar number', type: 'text', auto: 'attorney' },
  ATTORNEY_2_FIRM: { label: '2nd Attorney Firm', desc: 'Second attorney firm name', type: 'text', auto: 'attorney' },
  ATTORNEY_2_ADDR: { label: '2nd Attorney Address', desc: 'Second attorney firm address', type: 'text', auto: 'attorney' },
  ATTORNEY_2_PHONE: { label: '2nd Attorney Phone', desc: 'Second attorney phone number', type: 'tel', auto: 'attorney' },
  ATTORNEY_2_EMAIL: { label: '2nd Attorney Email', desc: 'Second attorney email address', type: 'email', auto: 'attorney' },

  // Opposing Counsel
  AUSA_NAME: { label: 'AUSA Name', desc: 'Assistant US Attorney name', type: 'text' },
  AUSA_OFFICE: { label: 'AUSA Office', desc: 'AUSA office name', type: 'text' },
  AUSA_PHONE: { label: 'AUSA Phone', desc: 'AUSA phone number', type: 'tel' },
  AUSA_EMAIL: { label: 'AUSA Email', desc: 'AUSA email address', type: 'email' },
};

const TYPE_BADGES = {
  text: { label: 'text', color: 'bg-gray-100 text-gray-600' },
  textarea: { label: 'textarea', color: 'bg-gray-100 text-gray-600' },
  number: { label: 'number', color: 'bg-blue-50 text-blue-600' },
  date: { label: 'date', color: 'bg-purple-50 text-purple-600' },
  select: { label: 'select', color: 'bg-indigo-50 text-indigo-600' },
  tel: { label: 'tel', color: 'bg-teal-50 text-teal-700' },
  email: { label: 'email', color: 'bg-teal-50 text-teal-700' },
};

const AUTO_BADGES = {
  cascade: { label: 'facility cascade', color: 'bg-green-50 text-green-700 border-green-200' },
  country: { label: 'country select', color: 'bg-green-50 text-green-700 border-green-200' },
  attorney: { label: 'attorney select', color: 'bg-green-50 text-green-700 border-green-200' },
};

export default function VariablesReferenceScreen() {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(VARIABLE_GROUPS.map(g => g.name)));

  const totalVars = VARIABLE_GROUPS.reduce((sum, g) => sum + g.variables.length, 0);
  const autoVars = Object.values(VAR_META).filter(m => m.auto).length;

  const filtered = useMemo(() => {
    if (!search.trim()) return VARIABLE_GROUPS;
    const q = search.toLowerCase();
    return VARIABLE_GROUPS.map(g => ({
      ...g,
      variables: g.variables.filter(v => {
        const meta = VAR_META[v];
        return v.toLowerCase().includes(q) ||
          (meta?.label || '').toLowerCase().includes(q) ||
          (meta?.desc || '').toLowerCase().includes(q);
      }),
    })).filter(g => g.variables.length > 0);
  }, [search]);

  function toggleGroup(name) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[1.2rem] font-bold text-gray-900">Variables Reference</h2>
          <p className="text-[0.82rem] text-gray-500 mt-0.5">
            {totalVars} variables across {VARIABLE_GROUPS.length} groups &middot; {autoVars} auto-populated
          </p>
        </div>
      </div>

      {/* Search + legend */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search variables..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-[7px] rounded-lg border border-gray-200 bg-white text-[0.82rem] placeholder:text-gray-400 focus:outline-none focus:border-blue-300 transition-colors"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div className="flex items-center gap-2 text-[0.72rem] text-gray-400">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Auto-populated</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Manual entry</span>
        </div>
      </div>

      {/* Syntax hint */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <span className="text-[0.82rem] text-gray-500 mt-[1px]">
          <svg className="w-4 h-4 inline -mt-0.5 mr-1 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Use <code className="font-mono text-[0.78rem] bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded text-yellow-800">{'{{VARIABLE_NAME}}'}</code> in template sections.
          Variables are replaced with case values at render time. Conditional sections can reference numeric variables with operators like <code className="font-mono text-[0.78rem] bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded text-gray-700">DETENTION_DAYS &gt; 180</code>.
        </span>
      </div>

      {/* Variable groups */}
      <div className="space-y-3">
        {filtered.map(group => {
          const expanded = expandedGroups.has(group.name);
          const autoCount = group.variables.filter(v => VAR_META[v]?.auto).length;

          return (
            <div key={group.name} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.name)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span className="text-[0.85rem] font-semibold text-gray-800">{group.name}</span>
                <span className="text-[0.72rem] text-gray-400 font-medium">{group.variables.length} variables</span>
                {autoCount > 0 && (
                  <span className="text-[0.68rem] bg-green-50 text-green-600 border border-green-200 px-1.5 py-[1px] rounded-full font-medium">
                    {autoCount} auto
                  </span>
                )}
              </button>

              {/* Variable rows */}
              {expanded && (
                <div className="border-t border-gray-100">
                  {/* Table header */}
                  <div className="grid grid-cols-[220px_100px_1fr_140px] gap-3 px-4 py-2 bg-gray-50/60 border-b border-gray-100">
                    <span className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-gray-400">Variable</span>
                    <span className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-gray-400">Type</span>
                    <span className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-gray-400">Description</span>
                    <span className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-gray-400">Population</span>
                  </div>

                  {group.variables.map(v => {
                    const meta = VAR_META[v] || { label: v, desc: '', type: 'text' };
                    const typeBadge = TYPE_BADGES[meta.type] || TYPE_BADGES.text;
                    const autoBadge = meta.auto ? AUTO_BADGES[meta.auto] : null;

                    return (
                      <div key={v} className="grid grid-cols-[220px_100px_1fr_140px] gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/40 transition-colors items-center">
                        {/* Variable name */}
                        <div>
                          <code className="font-mono text-[0.76rem] bg-yellow-50 border border-yellow-200 rounded px-1.5 py-[2px] text-yellow-800">
                            {v}
                          </code>
                        </div>

                        {/* Type badge */}
                        <div>
                          <span className={`text-[0.68rem] font-medium px-1.5 py-[1px] rounded ${typeBadge.color}`}>
                            {typeBadge.label}
                          </span>
                        </div>

                        {/* Description */}
                        <div className="text-[0.8rem] text-gray-600">{meta.desc}</div>

                        {/* Auto-population */}
                        <div>
                          {autoBadge ? (
                            <span className={`text-[0.68rem] font-medium px-1.5 py-[1px] rounded border ${autoBadge.color}`}>
                              {autoBadge.label}
                            </span>
                          ) : (
                            <span className="text-[0.72rem] text-gray-400">manual</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && search.trim() && (
        <div className="text-center py-8 text-[0.85rem] text-gray-400">
          No variables matching "{search}"
        </div>
      )}
    </div>
  );
}
