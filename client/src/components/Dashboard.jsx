import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Wrench, 
  ClipboardCheck, 
  FileText, 
  Camera, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  File, 
  Eye,
  Inbox
} from 'lucide-react';
import { apiRequest } from '../api';

export default function Dashboard({ 
  onSelectBuilding, 
  onOpenAddBuilding, 
  onOpenNewMaintenance, 
  onOpenNewInspection, 
  onOpenNewReport,
  onOpenReportModal,
  setActiveTab
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/dashboard');
      setData(res);
    } catch (e) {
      console.error('Failed to fetch dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading ZAYANI Dashboard...</p>
        </div>
      </div>
    );
  }

  const { stats, recentBuildings, recentReports, recentPhotos } = data || {
    stats: {},
    recentBuildings: [],
    recentReports: [],
    recentPhotos: []
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Quick Action Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-6 pointer-events-none">
          <Building2 className="w-96 h-96 -mr-20 -mt-10" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-blue-400/30">
            <span>Project: ZAYANI</span>
            <span>•</span>
            <span>207 Housing Buildings</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2">
            ZAYANI Maintenance Hub
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            Building-centric fire & safety management, automated photo cataloging, and official Word/Excel/PDF completion reports.
          </p>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={onOpenAddBuilding}
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Building</span>
            </button>

            <button
              onClick={onOpenNewMaintenance}
              className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>+ New Maintenance</span>
            </button>

            <button
              onClick={onOpenNewInspection}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>+ New Inspection</span>
            </button>

            <button
              onClick={onOpenNewReport}
              className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>+ New Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Review Queue Alert if unassigned photos exist */}
      {stats.reviewQueueCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 shrink-0">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-900">
                {stats.reviewQueueCount} Unassigned Photo(s) in Import Queue
              </div>
              <div className="text-xs text-amber-700">
                Imported photos from batch archives awaiting building assignment.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('import-review')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer shrink-0"
          >
            Review & Assign
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Buildings */}
        <div 
          onClick={() => setActiveTab('buildings')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Buildings</span>
            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.totalBuildings || 0}</div>
          <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{stats.activeBuildings || 0} Active Project Buildings</span>
          </div>
        </div>

        {/* Maintenance Jobs */}
        <div 
          onClick={() => setActiveTab('maintenance')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Maintenance Jobs</span>
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.completedMaintenance || 0}</div>
          <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{stats.pendingMaintenance || 0} In-Progress / Pending</span>
          </div>
        </div>

        {/* Reports Created */}
        <div 
          onClick={() => setActiveTab('reports')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-purple-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Official Reports</span>
            <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.reportsCreated || 0}</div>
          <div className="text-xs text-purple-600 font-semibold mt-1 flex items-center gap-1">
            <span>Work Completion & Inspection</span>
          </div>
        </div>

        {/* Photos Cataloged */}
        <div 
          onClick={() => setActiveTab('photos')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Photos Cataloged</span>
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
              <Camera className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.totalPhotos || 0}</div>
          <div className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1">
            <span>Auto-organized by Building</span>
          </div>
        </div>
      </div>

      {/* Main Content Sections: Recent Buildings & Recent Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Buildings Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Recent ZAYANI Buildings</h2>
              <p className="text-xs text-slate-500">Quick access to building history and reports</p>
            </div>
            <button
              onClick={() => setActiveTab('buildings')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Buildings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {recentBuildings.map((bld) => (
              <div
                key={bld.id}
                onClick={() => onSelectBuilding(bld)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 transition cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-600">ZAYANI PROJECT</div>
                      <div className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition">
                        Building {bld.building_number}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase">
                      {bld.status}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-slate-700 mb-1">
                    {bld.location}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mb-3">
                    <span>Road: {bld.road || 'N/A'}</span>
                    <span>•</span>
                    <span>Block: {bld.block || 'N/A'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                    <b>{bld.maintenance_count || 0}</b> Jobs
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-indigo-500" />
                    <b>{bld.photo_count || 0}</b> Photos
                  </span>
                  <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Recent Reports */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Recent Reports</h2>
              <p className="text-xs text-slate-500">Official exported documentation</p>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {recentReports.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No reports generated yet</div>
            ) : (
              recentReports.map((rpt) => (
                <div key={rpt.id} className="p-3.5 hover:bg-slate-50 transition flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded border border-blue-200">
                        B-{rpt.building_number}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {rpt.report_number}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium truncate">{rpt.location}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {rpt.report_date} • {rpt.prepared_by}
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenReportModal(rpt)}
                    className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-xl transition cursor-pointer shrink-0 shadow-sm"
                    title="View / Download Report"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Recent Photos Grid */}
      {recentPhotos && recentPhotos.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Recent Photo Feed</h2>
              <p className="text-xs text-slate-500">Auto-cataloged field documentation</p>
            </div>
            <button
              onClick={() => setActiveTab('photos')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Open Photo Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {recentPhotos.map((photo) => {
              const token = localStorage.getItem('zayani_token');
              const srcUrl = `/api/photos/${photo.id}/file?token=${token}`;
              return (
                <div 
                  key={photo.id}
                  onClick={() => setActiveTab('photos')}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer group"
                >
                  <div className="aspect-square bg-slate-100 relative overflow-hidden">
                    <img 
                      src={srcUrl} 
                      alt={photo.caption || photo.stored_filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      loading="lazy"
                    />
                    <div className="absolute top-1 left-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                      B-{photo.building_number}
                    </div>
                  </div>
                  <div className="p-1.5">
                    <div className="text-[10px] font-bold text-slate-800 truncate">{photo.category}</div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {photo.floor ? `Flr ${photo.floor}` : ''} {photo.flat_no ? `Flat ${photo.flat_no}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
