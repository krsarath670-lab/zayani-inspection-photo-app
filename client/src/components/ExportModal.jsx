import React, { useState } from 'react';
import { 
  FileArchive, 
  Download, 
  X, 
  Building2, 
  CheckCircle2, 
  Layers, 
  Filter 
} from 'lucide-react';
import { apiRequest, downloadBlob } from '../api';
import { generateClientZip } from '../offlineDb';

export default function ExportModal({ building, isOpen, onClose }) {
  const [systemType, setSystemType] = useState('all');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState('all');
  const [exporting, setExporting] = useState(false);

  if (!isOpen || !building) return null;

  const floors = building.floors || [];

  const handleExport = async () => {
    setExporting(true);
    let filename = `ZAYANI-Building-${building.building_number}`;
    if (systemType !== 'all') filename += `-${systemType.replace(/\s+/g, '-')}`;
    if (selectedFloor !== 'all') filename += `-${selectedFloor.replace(/\s+/g, '-')}`;
    if (selectedEquipment !== 'all') filename += `-${selectedEquipment.replace(/\s+/g, '-')}`;
    filename += '.zip';

    try {
      // 1. Try server endpoint
      const params = new URLSearchParams();
      if (systemType !== 'all') params.append('system_type', systemType);
      if (selectedFloor !== 'all') params.append('floor_name', selectedFloor);
      if (selectedEquipment !== 'all') params.append('equipment_type', selectedEquipment);

      let blob = null;
      try {
        blob = await apiRequest(`/buildings/${building.id}/export?${params.toString()}`);
      } catch (netErr) {
        console.warn('Server offline, generating ZIP client-side from local IndexedDB:', netErr);
      }

      // 2. Fallback to client-side JSZip if server is offline (e.g. laptop switched off)
      if (!blob || !(blob instanceof Blob)) {
        blob = await generateClientZip({
          buildingId: building.id,
          buildingNumber: building.building_number,
          systemType,
          floorName: selectedFloor
        });
      }

      downloadBlob(blob, filename);
      onClose();
    } catch (e) {
      alert('Export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden my-8">
        
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <FileArchive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight uppercase">EXPORT BUILDING PHOTOS</h2>
              <p className="text-xs text-indigo-300">Download auto-organized ZIP package</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Building {building.building_number} ({building.location})</span>
            </div>
            <p className="text-[11px] text-indigo-800">
              The exported ZIP file preserves the exact folder structure (System → Floors/Flats → Equipment → Photos). Works offline on mobile!
            </p>
          </div>

          {/* Export Scope Selectors */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Export Scope (System)</label>
              <select
                value={systemType}
                onChange={(e) => setSystemType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
              >
                <option value="all">Entire Building (Fire Alarm + Fire Fighting)</option>
                <option value="Fire Alarm">Fire Alarm Only</option>
                <option value="Fire Fighting">Fire Fighting Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Filter Floor (Optional)</label>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
              >
                <option value="all">All Floors & Areas</option>
                {floors.map((f) => (
                  <option key={f.id || f.floor_name} value={f.floor_name}>{f.floor_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Filter Equipment (Optional)</label>
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
              >
                <option value="all">All Equipment Types</option>
                <option value="Detector">Detector</option>
                <option value="Break Glass">Break Glass</option>
                <option value="Panel">Panel</option>
                <option value="Extinguisher">Extinguisher</option>
                <option value="Fire Hose Reel">Fire Hose Reel</option>
                <option value="Wet Riser">Wet Riser</option>
                <option value="Exit Light">Exit Light</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Generating ZIP...' : 'Download ZIP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
