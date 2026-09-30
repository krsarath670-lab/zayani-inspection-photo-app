import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  ArrowLeft, 
  Download, 
  Camera, 
  Layers, 
  Home, 
  Car, 
  History, 
  Filter, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  FileArchive,
  Eye,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { apiRequest } from '../api';
import ExcelInspectionSheet from './ExcelInspectionSheet';
import WorkCompletionReportView from './WorkCompletionReportView';

export default function BuildingView({ 
  buildingId, 
  onBack, 
  onStartFireAlarm, 
  onStartFireFighting, 
  onOpenExportModal 
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState('completion_report'); // 'completion_report' | 'sheet' | 'gallery' | 'structure'

  // Gallery Filters
  const [filterSystem, setFilterSystem] = useState('all'); // 'all' | 'Fire Alarm' | 'Fire Fighting'
  const [filterFloor, setFilterFloor] = useState('all');
  const [filterEquipment, setFilterEquipment] = useState('all');

  // Photo viewer lightbox
  const [activePhoto, setActivePhoto] = useState(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      let res = null;
      try {
        res = await apiRequest(`/buildings/${buildingId}`);
      } catch (err) {
        console.warn('Network offline, loading building details from IndexedDB:', err);
      }

      if (!res || !res.building) {
        res = await getOfflineBuildingDetail(buildingId);
      }

      setData(res);
    } catch (e) {
      console.error(e);
      const fallback = await getOfflineBuildingDetail(buildingId);
      setData(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [buildingId]);

  const handleDeleteThisBuilding = async () => {
    if (!data?.building) return;
    if (!confirm(`Are you sure you want to delete Building ${data.building.building_number} (${data.building.location}) and all its photos?`)) {
      return;
    }

    try {
      try {
        await apiRequest(`/buildings/${data.building.id}`, { method: 'DELETE' });
      } catch (err) {}
      await deleteOfflineBuilding(data.building.id);
      onBack();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      await apiRequest(`/photos/${photoId}`, { method: 'DELETE' });
      setActivePhoto(null);
      fetchDetail();
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading Building Data...</p>
        </div>
      </div>
    );
  }

  const { building, floors = [], areas = [], photos = [] } = data;

  const totalFlats = floors.reduce((acc, f) => acc + (f.flats ? f.flats.length : 0), 0);
  const faPhotosCount = photos.filter(p => p.system_type === 'Fire Alarm').length;
  const ffPhotosCount = photos.filter(p => p.system_type === 'Fire Fighting').length;

  const filteredPhotos = photos.filter(p => {
    if (filterSystem !== 'all' && p.system_type !== filterSystem) return false;
    if (filterFloor !== 'all' && p.floor_name !== filterFloor && p.area_name !== filterFloor) return false;
    if (filterEquipment !== 'all' && p.equipment_type !== filterEquipment) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Buildings</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteThisBuilding}
            className="px-3.5 py-2.5 bg-rose-100 hover:bg-rose-600 hover:text-white text-rose-800 border border-rose-300 font-bold rounded-2xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Delete this building and its photos"
          >
            <Trash2 className="w-4 h-4 text-rose-600 group-hover:text-white" />
            <span>🗑️ Delete Building</span>
          </button>

          <button
            onClick={() => onOpenExportModal(building)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer"
          >
            <FileArchive className="w-4 h-4" />
            <span>EXPORT BUILDING ZIP</span>
          </button>
        </div>
      </div>

      {/* Building Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-blue-400/30">
              <Building2 className="w-3.5 h-3.5" />
              <span>ZAYANI PROJECT</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              BUILDING {building.building_number}
            </h1>
            <div className="text-base sm:text-lg font-bold text-blue-300 mt-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Location: {building.location}</span>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-4 mt-2 font-medium">
              <span>Road: <b className="text-white">{building.road || 'N/A'}</b></span>
              <span>•</span>
              <span>Block: <b className="text-white">{building.block || 'N/A'}</b></span>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 text-right space-y-0.5">
              <div className="text-xs font-bold text-slate-300">
                {floors.length} Floors • {totalFlats} Flats • {areas.length} Areas
              </div>
              <div className="text-sm font-black text-white">
                {photos.length} Total Inspection Photos
              </div>
              <div className="text-[11px] text-slate-400">
                FA: <b className="text-red-400">{faPhotosCount}</b> | FF: <b className="text-blue-400">{ffPhotosCount}</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TWO MAIN SYSTEM BIG BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* FIRE ALARM BUTTON */}
        <button
          onClick={onStartFireAlarm}
          className="p-6 bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-3xl shadow-xl shadow-red-600/20 active:scale-[0.98] transition flex items-center justify-between group cursor-pointer border border-red-500/30"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition">
              🔔
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold uppercase tracking-wider text-red-200">SYSTEM 1</div>
              <div className="text-2xl font-black text-white">FIRE ALARM</div>
              <div className="text-xs text-red-100 mt-0.5">Flats & Floor / Common Areas</div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-white">{faPhotosCount}</span>
            <div className="text-[10px] text-red-200 font-bold uppercase">Photos</div>
          </div>
        </button>

        {/* FIRE FIGHTING BUTTON */}
        <button
          onClick={onStartFireFighting}
          className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-3xl shadow-xl shadow-blue-600/20 active:scale-[0.98] transition flex items-center justify-between group cursor-pointer border border-blue-500/30"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition">
              🧯
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">SYSTEM 2</div>
              <div className="text-2xl font-black text-white">FIRE FIGHTING</div>
              <div className="text-xs text-blue-100 mt-0.5">Floors, Parking & Risers (No Flats)</div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-white">{ffPhotosCount}</span>
            <div className="text-[10px] text-blue-200 font-bold uppercase">Photos</div>
          </div>
        </button>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-1">
        <button
          onClick={() => setViewTab('completion_report')}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            viewTab === 'completion_report' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
          <span>📋 WORK COMPLETION EXCEL</span>
        </button>

        <button
          onClick={() => setViewTab('sheet')}
          className={`flex-1 min-w-[130px] py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            viewTab === 'sheet' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-300" />
          <span>📊 MATRIX SHEET</span>
        </button>

        <button
          onClick={() => setViewTab('gallery')}
          className={`flex-1 min-w-[110px] py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            viewTab === 'gallery' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>GALLERY ({photos.length})</span>
        </button>

        <button
          onClick={() => setViewTab('structure')}
          className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            viewTab === 'structure' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>STRUCTURE</span>
        </button>
      </div>

      {/* TAB 0: OFFICIAL WORK COMPLETION EXCEL REPORT */}
      {viewTab === 'completion_report' && (
        <WorkCompletionReportView
          building={building}
          floors={floors}
          areas={areas}
          photos={photos}
          onRefreshPhotos={fetchDetail}
          onOpenPhotoLightbox={(photo) => setActivePhoto(photo)}
        />
      )}

      {/* TAB 1: EXCEL MATRIX SPREADSHEET VIEW */}
      {viewTab === 'sheet' && (
        <ExcelInspectionSheet
          building={building}
          floors={floors}
          areas={areas}
          photos={photos}
          onRefreshPhotos={fetchDetail}
          onOpenPhotoLightbox={(photo) => setActivePhoto(photo)}
        />
      )}

      {/* TAB 1: PHOTO GALLERY */}
      {viewTab === 'gallery' && (
        <div className="space-y-4">
          {/* Gallery Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2.5 items-center">
            {/* System Filter */}
            <select
              value={filterSystem}
              onChange={(e) => setFilterSystem(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
            >
              <option value="all">All Systems ({photos.length})</option>
              <option value="Fire Alarm">Fire Alarm ({faPhotosCount})</option>
              <option value="Fire Fighting">Fire Fighting ({ffPhotosCount})</option>
            </select>

            {/* Floor / Area Filter */}
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
            >
              <option value="all">All Floors & Areas</option>
              {floors.map(f => <option key={f.id} value={f.floor_name}>{f.floor_name}</option>)}
              {areas.map(a => <option key={a.id} value={a.area_name}>{a.area_name}</option>)}
            </select>

            {/* Equipment Filter */}
            <select
              value={filterEquipment}
              onChange={(e) => setFilterEquipment(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
            >
              <option value="all">All Equipment</option>
              <option value="Detector">Detector</option>
              <option value="Break Glass">Break Glass</option>
              <option value="Panel">Panel</option>
              <option value="Extinguisher">Extinguisher</option>
              <option value="Fire Hose Reel">Fire Hose Reel</option>
              <option value="Wet Riser">Wet Riser</option>
              <option value="Exit Light">Exit Light</option>
            </select>

            <span className="text-xs text-slate-400 ml-auto font-semibold">
              Showing {filteredPhotos.length} photo(s)
            </span>
          </div>

          {/* Photo Grid */}
          {filteredPhotos.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <Camera className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Photos Found</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Select Fire Alarm or Fire Fighting above to capture inspection photos for this building.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredPhotos.map((p) => {
                const token = localStorage.getItem('zayani_token');
                const srcUrl = p.data_url || `/api/photos/${p.id}/file?token=${token}`;
                const isFA = p.system_type === 'Fire Alarm';

                return (
                  <div
                    key={p.id}
                    onClick={() => setActivePhoto(p)}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-500 transition cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="aspect-square bg-slate-100 relative overflow-hidden">
                      <img
                        src={srcUrl}
                        alt={p.stored_filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        loading="lazy"
                      />
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black text-white backdrop-blur-sm ${
                        isFA ? 'bg-red-600/90' : 'bg-blue-600/90'
                      }`}>
                        {p.system_type}
                      </span>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold text-white bg-slate-900/80 backdrop-blur-sm">
                        {p.equipment_type}
                      </span>
                    </div>

                    <div className="p-2.5 space-y-1">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {p.floor_name} {p.flat_number ? `• Flat ${p.flat_number}` : ''} {p.area_name ? `• ${p.area_name}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {p.description || p.stored_filename}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono truncate pt-1 border-t border-slate-100">
                        {p.stored_filename}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FLOORS & FLATS STRUCTURE */}
      {viewTab === 'structure' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Configured Floors & Flats ({floors.length} Floors, {totalFlats} Flats)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {floors.map((flr) => (
                <div key={flr.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between font-black text-xs text-slate-900">
                    <span>{flr.floor_name}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {flr.has_flats ? `${flr.flats?.length || 0} Flats` : 'Common / Floor'}
                    </span>
                  </div>

                  {flr.has_flats && flr.flats && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {flr.flats.map((flat, fIdx) => (
                        <span key={fIdx} className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-lg">
                          Flat {flat.flat_number}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Parking Areas */}
            {areas.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase">Parking & Common Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {areas.map(a => (
                    <span key={a.id} className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold">
                      🚗 {a.area_name} ({a.area_type})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HISTORY */}
      {viewTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Chronological Photo Inspection History
          </h3>

          <div className="divide-y divide-slate-100">
            {photos.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] text-white ${p.system_type === 'Fire Alarm' ? 'bg-red-600' : 'bg-blue-600'}`}>
                      {p.system_type}
                    </span>
                    <span>{p.equipment_type}</span>
                    <span className="text-slate-500 font-normal">
                      ({p.floor_name} {p.flat_number ? `• Flat ${p.flat_number}` : ''} {p.area_name ? `• ${p.area_name}` : ''})
                    </span>
                  </div>
                  <div className="text-slate-600 mt-0.5">{p.description}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.stored_filename}</div>
                </div>

                <div className="text-right text-[10px] text-slate-400 shrink-0">
                  <div>{p.created_at}</div>
                  <div className="font-semibold text-slate-600">{p.uploaded_by}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col my-8">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-blue-400 uppercase">
                  Building {building.building_number} • {activePhoto.system_type}
                </div>
                <div className="text-xs text-slate-300 font-mono mt-0.5">
                  {activePhoto.stored_filename}
                </div>
              </div>
              <button onClick={() => setActivePhoto(null)} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 bg-black flex items-center justify-center max-h-[55vh]">
              <img
                src={activePhoto.data_url || `/api/photos/${activePhoto.id}/file?token=${localStorage.getItem('zayani_token')}`}
                alt={activePhoto.description}
                className="max-h-[50vh] max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="p-5 space-y-3 bg-slate-900 border-t border-slate-800 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-white">
                    {activePhoto.equipment_type} — {activePhoto.floor_name} {activePhoto.flat_number ? `Flat ${activePhoto.flat_number}` : ''} {activePhoto.area_name ? activePhoto.area_name : ''}
                  </div>
                  <p className="text-slate-300 mt-1 font-medium">{activePhoto.description || 'No description entered.'}</p>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Uploaded by {activePhoto.uploaded_by} on {activePhoto.created_at}
                  </div>
                </div>

                <button
                  onClick={() => handleDeletePhoto(activePhoto.id)}
                  className="px-3 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
