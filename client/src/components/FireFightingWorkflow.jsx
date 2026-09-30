import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Camera, 
  Upload, 
  X, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  Layers, 
  Car, 
  Sparkles, 
  Check,
  Zap
} from 'lucide-react';
import { apiRequest, compressImage } from '../api';
import { saveOfflinePhoto } from '../offlineDb';

export default function FireFightingWorkflow({ isOpen, building, onClose, onPhotoSaved }) {
  if (!isOpen || !building) return null;

  const [locationMode, setLocationMode] = useState('Floor'); // 'Floor' | 'Area'
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState('Extinguisher');
  const [description, setDescription] = useState('Extinguisher checked OK');

  // Photo state
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const floors = building.floors || [];
  const areas = building.areas || [];

  useEffect(() => {
    if (floors.length > 0 && !selectedFloor) {
      setSelectedFloor(floors[0]);
    }
    if (areas.length > 0 && !selectedArea) {
      setSelectedArea(areas[0]);
    }
  }, [building]);

  const equipmentList = [
    { id: 'Extinguisher', label: 'Fire Extinguisher', icon: '🧯' },
    { id: 'Fire Hose Reel', label: 'Fire Hose Reel', icon: '🚒' },
    { id: 'Wet Riser', label: 'Wet / Dry Riser Valve', icon: '🚰' },
    { id: 'Exit Light', label: 'Exit Light', icon: '🟢' },
    { id: 'Other', label: 'Breaching Inlet / Other', icon: '➕' }
  ];

  const quickStatusChips = [
    { label: '✅ Checked OK', text: `${selectedEquipment} checked OK` },
    { label: '🟢 Pressure in Green', text: `${selectedEquipment} pressure gauge in green zone` },
    { label: '🏷️ Serviced & Tagged', text: `${selectedEquipment} serviced and inspection tag updated` },
    { label: '🔋 Exit Light On Battery', text: `Exit light illuminated and tested on emergency battery backup` },
    { label: '🔴 Missing / Replace', text: `${selectedEquipment} missing / needs immediate replacement` }
  ];

  const handlePhotosSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const compressedList = [];
      const previews = [];

      for (const f of files) {
        const compressed = await compressImage(f, 1920, 0.85).catch(() => f);
        compressedList.push(compressed);
        previews.push(URL.createObjectURL(compressed));
      }

      setPhotoFiles(compressedList);
      setPreviewUrls(previews);
      setSuccessMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePhoto = async () => {
    if (photoFiles.length === 0 && previewUrls.length === 0) {
      alert('Please snap or choose a photo first.');
      return;
    }

    setUploading(true);
    setSuccessMessage('');

    try {
      const isArea = locationMode === 'Area';
      const floorName = !isArea ? (selectedFloor?.floor_name || 'Floor 1') : '';
      const areaName = isArea ? (selectedArea?.area_name || 'Parking B1') : '';

      let savedCount = 0;
      let lastSavedName = '';

      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const previewUrl = previewUrls[i];

        // 1. Try server API
        let serverPhoto = null;
        try {
          const fd = new FormData();
          fd.append('building_id', building.id);
          fd.append('system_type', 'Fire Fighting');
          fd.append('location_type', isArea ? 'Areas' : 'Floors');
          if (!isArea && selectedFloor) {
            fd.append('floor_id', selectedFloor.id);
            fd.append('floor_name', floorName);
          }
          if (isArea && selectedArea) {
            fd.append('area_id', selectedArea.id);
            fd.append('area_name', areaName);
          }
          fd.append('equipment_type', selectedEquipment);
          fd.append('description', description);
          fd.append('photos', file);

          const res = await apiRequest('/photos/upload', {
            method: 'POST',
            body: fd
          });
          serverPhoto = res.photos?.[0] || res.photo;
        } catch (netErr) {
          console.warn('Saving offline:', netErr);
        }

        // 2. Save offline in IndexedDB
        const offlineRecord = await saveOfflinePhoto({
          buildingId: building.id,
          buildingNumber: building.building_number,
          systemType: 'Fire Fighting',
          locationType: isArea ? 'Areas' : 'Floors',
          floorId: !isArea ? (selectedFloor?.id || null) : null,
          floorName: floorName,
          areaId: isArea ? (selectedArea?.id || null) : null,
          areaName: areaName,
          flatId: null,
          flatNumber: null, // Strictly NO flats
          equipmentType: selectedEquipment,
          description: description,
          file: file,
          previewUrl: previewUrl,
          uploadedBy: 'Inspector'
        });

        lastSavedName = serverPhoto?.storedFilename || offlineRecord.stored_filename;
        savedCount++;
      }

      setSuccessMessage(`✓ Saved ${savedCount} photo(s) (${lastSavedName})`);
      setPhotoFiles([]);
      setPreviewUrls([]);
      if (onPhotoSaved) onPhotoSaved();
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-lg">
              🧯
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-100 flex items-center gap-1.5">
                <span>Bld {building.building_number}</span>
                <span>•</span>
                <span className="truncate max-w-[160px]">{building.location}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">Fire Fighting Photo</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Note: NO FLATS */}
          <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
            <span>Organized by Floor or Parking Area (No Flats needed).</span>
          </div>

          {/* 1. Location Mode Toggle & Chips */}
          <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => setLocationMode('Floor')}
                className={`py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  locationMode === 'Floor' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Floor / Staircase</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationMode('Area')}
                className={`py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  locationMode === 'Area' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Parking / Lobby</span>
              </button>
            </div>

            {/* Location selector chips */}
            {locationMode === 'Floor' ? (
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Select Floor:</div>
                <div className="flex flex-wrap gap-1.5">
                  {floors.map((flr) => {
                    const isSelected = selectedFloor?.id === flr.id;
                    return (
                      <button
                        key={flr.id || flr.floor_name}
                        type="button"
                        onClick={() => setSelectedFloor(flr)}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {flr.floor_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Select Parking / Area:</div>
                {areas.length === 0 ? (
                  <div className="p-2 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-500 text-center">
                    No parking areas defined for this building.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {areas.map((area) => {
                      const isSelected = selectedArea?.id === area.id;
                      return (
                        <button
                          key={area.id || area.area_name}
                          type="button"
                          onClick={() => setSelectedArea(area)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition ${
                            isSelected
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {area.area_name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Equipment Picker */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-1.5">Select Equipment:</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {equipmentList.map((eq) => {
                const isSelected = selectedEquipment === eq.id;
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => {
                      setSelectedEquipment(eq.id);
                      setDescription(eq.id === 'Exit Light' ? 'Exit light illuminated on battery backup' : `${eq.id} checked OK`);
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md font-bold scale-[1.02]'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">{eq.icon}</span>
                    <span className="text-xs font-semibold leading-tight">{eq.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. EASY 1-TAP CAMERA CAPTURE BOX */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-1.5">Photo:</div>

            {previewUrls.length > 0 ? (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-4/3 max-h-56 flex items-center justify-center">
                  <img src={previewUrls[0]} alt="Captured" className="max-h-56 w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFiles([]);
                      setPreviewUrls([]);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 text-white hover:bg-rose-600 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {previewUrls.length > 1 && (
                  <div className="text-xs text-slate-500 font-bold text-center">
                    {previewUrls.length} photos ready to save together
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {/* Giant Camera Button */}
                <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-rose-400 bg-rose-50 hover:bg-rose-100 cursor-pointer transition text-center shadow-xs active:scale-95 group">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-110 transition">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-rose-950 uppercase tracking-wide">OPEN CAMERA</span>
                  <span className="text-[10px] text-rose-700 font-semibold mt-0.5">Take photo now</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotosSelected}
                    className="hidden"
                  />
                </label>

                {/* Gallery Picker (Multi-select enabled) */}
                <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition text-center shadow-xs active:scale-95 group">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-110 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">FROM GALLERY</span>
                  <span className="text-[10px] text-slate-500 font-semibold mt-0.5">Pick 1 or multiple</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotosSelected}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* 4. Quick 1-Tap Status Chips */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-1.5">Result (1-Tap):</div>
            <div className="flex flex-wrap gap-1.5">
              {quickStatusChips.map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDescription(chip.text)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    description === chip.text
                      ? 'bg-rose-100 border-rose-400 text-rose-900 shadow-xs'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Custom description..."
              className="w-full mt-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
            />
          </div>

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSavePhoto}
            disabled={uploading || previewUrls.length === 0}
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>SAVE PHOTO</span>
          </button>
        </div>
      </div>
    </div>
  );
}
