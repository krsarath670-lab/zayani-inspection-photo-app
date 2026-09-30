import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  MapPin, 
  Camera, 
  Layers, 
  Home, 
  Car, 
  Flame, 
  ShieldAlert, 
  Download, 
  Calendar, 
  ChevronRight,
  Sparkles,
  RefreshCw,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { apiRequest } from '../api';
import { getOfflineBuildings, clearAllOfflineBuildings, deleteOfflineBuilding } from '../offlineDb';

export default function BuildingsList({ 
  onSelectBuilding, 
  onOpenAddBuilding, 
  onStartFireAlarm, 
  onStartFireFighting, 
  onOpenExportModal 
}) {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (filterStatus !== 'all') params.append('status', filterStatus);

      let list = [];
      try {
        const res = await apiRequest(`/buildings?${params.toString()}`);
        list = res.buildings || [];
      } catch (err) {
        console.warn('Network offline, loading buildings from local IndexedDB:', err);
      }

      if (!list || list.length === 0) {
        const offlineList = await getOfflineBuildings();
        list = offlineList;
        if (search.trim()) {
          const s = search.toLowerCase();
          list = list.filter(b => (b.building_number && b.building_number.toLowerCase().includes(s)) || (b.location && b.location.toLowerCase().includes(s)));
        }
      }

      setBuildings(list);
    } catch (e) {
      console.error('Failed to load buildings:', e);
      const fallback = await getOfflineBuildings();
      setBuildings(fallback || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBuildings();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, filterStatus]);

  const handleDeleteBuilding = async (bld, e) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete Building ${bld.building_number} (${bld.location}) and all its photos?`)) {
      return;
    }

    try {
      try {
        await apiRequest(`/buildings/${bld.id}`, { method: 'DELETE' });
      } catch (err) {}
      await deleteOfflineBuilding(bld.id);
      fetchBuildings();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('WARNING: Are you sure you want to DELETE ALL BUILDINGS and start completely fresh? This cannot be undone.')) {
      return;
    }

    try {
      try {
        await apiRequest('/buildings', { method: 'DELETE' });
      } catch (err) {}
      await clearAllOfflineBuildings();
      fetchBuildings();
      alert('All buildings deleted successfully. You can now add your own buildings.');
    } catch (err) {
      alert('Clear all failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Action */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                ZAYANI Project
              </span>
              <span className="text-xs text-slate-500 font-medium">Safety Enhancement 207 Buildings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5 flex items-center gap-2.5">
              <Building2 className="w-8 h-8 text-blue-600" />
              Buildings
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Add and manage your ZAYANI buildings, capture Fire Alarm & Fire Fighting inspection photos, and export organized ZIP archives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {buildings.length > 0 && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition-all active:scale-[0.98]"
                title="Delete all buildings to start clean"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">DELETE ALL</span>
              </button>
            )}

            <button
              onClick={onOpenAddBuilding}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] w-full md:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>+ NEW BUILDING</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Building Number, Location, Road, or Block..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded bg-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setFilterStatus(filterStatus === 'all' ? 'active' : 'all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                filterStatus === 'active'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filterStatus === 'active' ? 'Active Only' : 'All Statuses'}
            </button>

            <button
              onClick={fetchBuildings}
              title="Refresh Buildings"
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Buildings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-16 bg-slate-50 rounded-xl" />
              <div className="h-10 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : buildings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">No Buildings in System</h3>
          <p className="text-sm text-slate-600 mt-2 mb-6">
            All previous sample buildings have been cleared. Click below to add your first ZAYANI building with its custom floors, flats, and parking areas.
          </p>
          <button
            onClick={onOpenAddBuilding}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            + ADD YOUR FIRST BUILDING
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {buildings.map((b) => {
            const lastDate = b.last_photo_date 
              ? new Date(b.last_photo_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'No photos yet';

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group hover:border-blue-300"
              >
                {/* Top Building Badge / Banner */}
                <div className="p-5 pb-4 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-900 text-white shadow-sm">
                          Building {b.building_number}
                        </span>
                        {b.building_name && (
                          <span className="text-xs font-semibold text-slate-600 truncate max-w-[140px]">
                            {b.building_name}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-start gap-1.5 text-slate-700">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span className="text-sm font-semibold leading-tight text-slate-900">
                          {b.location}
                        </span>
                      </div>
                      {(b.road || b.block) && (
                        <div className="mt-1 pl-5 text-xs text-slate-500">
                          {b.road ? `Road ${b.road}` : ''} {b.road && b.block ? '• ' : ''} {b.block ? `Block ${b.block}` : ''}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleDeleteBuilding(b, e)}
                        title="Delete this building and its photos"
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Structural & Photo Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <div className="p-1">
                      <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        <span>Floors</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{b.floor_count || (b.floors ? b.floors.length : 0)}</p>
                    </div>

                    <div className="p-1 border-x border-slate-200">
                      <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
                        <Home className="w-3.5 h-3.5 text-purple-500" />
                        <span>Flats</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{b.flat_count || (b.floors ? b.floors.flatMap(f => f.flats || []).length : 0)}</p>
                    </div>

                    <div className="p-1">
                      <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
                        <Camera className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Photos</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{b.photo_count || 0}</p>
                    </div>
                  </div>

                  {/* Photo Breakdown / Last Date */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] font-medium">
                        <ShieldAlert className="w-3 h-3" /> FA: {b.fa_photo_count || 0}
                      </span>
                      <span className="flex items-center gap-1 text-red-700 bg-red-50 px-1.5 py-0.5 rounded text-[11px] font-medium">
                        <Flame className="w-3 h-3" /> FF: {b.ff_photo_count || 0}
                      </span>
                    </div>

                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {lastDate}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2">
                  {/* Two Main Quick Photo Workflow Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onStartFireAlarm) onStartFireAlarm(b);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer"
                      title="Take Fire Alarm Photos"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      FIRE ALARM
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onStartFireFighting) onStartFireFighting(b);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer"
                      title="Take Fire Fighting Photos (Floors/Areas - No Flats)"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      FIRE FIGHTING
                    </button>
                  </div>

                  {/* Open Full Building View & Export */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onSelectBuilding(b)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Excel Sheet & Photos</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenExportModal) onOpenExportModal(b);
                      }}
                      title="Download Building ZIP"
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
