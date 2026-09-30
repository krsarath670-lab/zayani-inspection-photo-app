import React, { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  Building2, 
  Wrench, 
  FileText, 
  ClipboardCheck, 
  Camera, 
  ArrowRight,
  MapPin
} from 'lucide-react';
import { apiRequest } from '../api';

export default function GlobalSearchModal({ 
  isOpen, 
  onClose, 
  onSelectBuilding, 
  onOpenReportModal, 
  setActiveTab 
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle modal
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiRequest(`/search?q=${encodeURIComponent(query.trim())}`);
        setResults(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const hasResults = results && (
    results.buildings?.length > 0 ||
    results.maintenance?.length > 0 ||
    results.reports?.length > 0 ||
    results.flats?.length > 0 ||
    results.photos?.length > 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/80 backdrop-blur-sm p-4 pt-12 sm:pt-20 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Building No, Location, Flat 11, NOT OPEN, Maintenance No, Engineer..."
            className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 bg-slate-200 text-[10px] text-slate-600 font-bold rounded">ESC</kbd>
        </div>

        {/* Results Container */}
        <div className="p-4 overflow-y-auto space-y-4">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Searching ZAYANI database...
            </div>
          ) : !query.trim() ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Type anything to search across Buildings, Maintenance Jobs, Reports, Flats, and Photos.
            </div>
          ) : !hasResults ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No results found matching "<b>{query}</b>".
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Buildings Results */}
              {results.buildings?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Buildings ({results.buildings.length})</span>
                  </div>
                  <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                    {results.buildings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          onSelectBuilding(b);
                          onClose();
                        }}
                        className="p-3 hover:bg-blue-50 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-black text-slate-900">Building {b.building_number}</div>
                          <div className="text-[11px] text-slate-600">{b.location} (Road: {b.road || '-'}, Block: {b.block || '-'})</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Maintenance Results */}
              {results.maintenance?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    <span>Maintenance Jobs ({results.maintenance.length})</span>
                  </div>
                  <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                    {results.maintenance.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          onSelectBuilding({ id: m.building_id, building_number: m.building_number, location: m.location });
                          onClose();
                        }}
                        className="p-3 hover:bg-amber-50 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-black text-slate-900">{m.maintenance_number} — Building {m.building_number}</div>
                          <div className="text-[11px] text-slate-600 truncate">{m.description || m.findings}</div>
                          <div className="text-[10px] text-slate-400">{m.maintenance_date} • Tech: {m.technician_name}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-amber-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reports Results */}
              {results.reports?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    <span>Reports ({results.reports.length})</span>
                  </div>
                  <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                    {results.reports.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => {
                          onOpenReportModal(r);
                          onClose();
                        }}
                        className="p-3 hover:bg-purple-50 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-black text-slate-900">{r.report_number} — Building {r.building_number}</div>
                          <div className="text-[11px] text-slate-600 truncate">{r.title}</div>
                          <div className="text-[10px] text-slate-400">{r.report_date} • {r.prepared_by}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-purple-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flat Inspection Items Results */}
              {results.flats?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Floor / Flat Units ({results.flats.length})</span>
                  </div>
                  <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                    {results.flats.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          onSelectBuilding({ id: f.building_id, building_number: f.building_number, location: f.location });
                          onClose();
                        }}
                        className="p-3 hover:bg-emerald-50 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-black text-slate-900">
                            Building {f.building_number} • Floor {f.floor} • Flat {f.flat_no}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Status: <b className={f.remarks === 'NOT OPEN' ? 'text-rose-600' : 'text-emerald-700'}>{f.remarks || f.inspection_status}</b> {f.issue_type ? `(${f.issue_type})` : ''}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
