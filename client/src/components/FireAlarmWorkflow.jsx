import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Camera, 
  Upload, 
  X, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  Layers, 
  Home, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles, 
  RotateCcw, 
  Check,
  Zap,
  Plus
} from 'lucide-react';
import { apiRequest, compressImage } from '../api';
import { saveOfflinePhoto } from '../offlineDb';

export default function FireAlarmWorkflow({ isOpen, building, onClose, onPhotoSaved }) {
  if (!isOpen || !building) return null;

  const [locationType, setLocationType] = useState('Flats'); // 'Flats' | 'Floors'
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState('Detector');
  const [description, setDescription] = useState('Detector tested OK');

  // Photo state
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const floors = building.floors || [];
  const floorsWithFlats = floors.filter(f => f.has_flats && f.flats && f.flats.length > 0);
  const currentFloorData = floors.find(f => f.id === selectedFloor?.id) || (locationType === 'Flats' ? (floorsWithFlats[0] || floors[0]) : floors[0]);
  const flatsForCurrentFloor = currentFloorData?.flats || [];

  useEffect(() => {
    if (floors.length > 0 && !selectedFloor) {
      const first = locationType === 'Flats' ? (floorsWithFlats[0] || floors[0]) : floors[0];
      setSelectedFloor(first);
      if (first?.flats?.length > 0) {
        setSelectedFlat(first.flats[0]);
      }
    }
  }, [building, locationType]);

  useEffect(() => {
    if (currentFloorData?.flats?.length > 0) {
      setSelectedFlat(currentFloorData.flats[0]);
    } else {
      setSelectedFlat(null);
    }
  }, [selectedFloor]);

  const equipmentList = [
    { id: 'Detector', label: 'Smoke / Heat Detector', icon: '🔔' },
    { id: 'Break Glass', label: 'Break Glass (MCP)', icon: '🔴' },
    { id: 'Panel', label: 'Fire Alarm Panel', icon: '🎛️' },
    { id: 'Other', label: 'Sounder / Other', icon: '➕' }
  ];

  const quickStatusChips = [
    { label: '✅ Tested OK', text: `${selectedEquipment} tested OK` },
    { label: '🔴 Needs Replace', text: `${selectedEquipment} faulty / requires replacement` },
    { label: '🔒 Not Open / Inaccessible', text: `${selectedEquipment} not accessible / Flat NOT OPEN` },
    { label: '⚡ Replaced New', text: `${selectedEquipment} replaced with new unit` }
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

  const handleSavePhoto = async (advanceNext = false) => {
    if (photoFiles.length === 0 && previewUrls.length === 0) {
      alert('Please snap or choose a photo first.');
      return;
    }

    setUploading(true);
    setSuccessMessage('');

    try {
      const floorName = currentFloorData?.floor_name || 'Floor 1';
      const flatNum = locationType === 'Flats' ? (selectedFlat?.flat_number || '') : '';

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
          fd.append('system_type', 'Fire Alarm');
          fd.append('location_type', locationType);
          fd.append('floor_id', currentFloorData?.id || '');
          fd.append('floor_name', floorName);
          if (locationType === 'Flats' && selectedFlat) {
            fd.append('flat_id', selectedFlat.id);
            fd.append('flat_number', flatNum);
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
          systemType: 'Fire Alarm',
          locationType: locationType,
          floorId: currentFloorData?.id || null,
          floorName: floorName,
          flatId: selectedFlat?.id || null,
          flatNumber: flatNum,
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

      if (advanceNext && locationType === 'Flats' && selectedFlat) {
        handleNextFlat();
      }
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleNextFlat = () => {
    if (!selectedFlat || flatsForCurrentFloor.length === 0) return;
    const currentIdx = flatsForCurrentFloor.findIndex(fl => fl.id === selectedFlat.id || fl.flat_number === selectedFlat.flat_number);
    if (currentIdx !== -1 && currentIdx < flatsForCurrentFloor.length - 1) {
      setSelectedFlat(flatsForCurrentFloor[currentIdx + 1]);
    } else {
      const currentFloorIdx = floorsWithFlats.findIndex(f => f.id === currentFloorData?.id);
      if (currentFloorIdx !== -1 && currentFloorIdx < floorsWithFlats.length - 1) {
        const nextFlr = floorsWithFlats[currentFloorIdx + 1];
        setSelectedFloor(nextFlr);
        setSelectedFlat(nextFlr.flats[0]);
      } else {
        alert('You have reached the last flat.');
      }
    }
    setPhotoFiles([]);
    setPreviewUrls([]);
    setSuccessMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh]">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-lg">
              🚨
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-100 flex items-center gap-1.5">
                <span>Bld {building.building_number}</span>
                <span>•</span>
                <span className="truncate max-w-[160px]">{building.location}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">Fire Alarm Photo</h2>
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
          
          {/* 1. Quick Location Picker */}
          <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            {/* Flats vs Floors Toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => setLocationType('Flats')}
                className={`py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  locationType === 'Flats' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Flats (Apartments)</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationType('Floors')}
                className={`py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  locationType === 'Floors' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Floor Common Area</span>
              </button>
            </div>

            {/* Floor Chips */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Select Floor:</div>
              <div className="flex flex-wrap gap-1.5">
                {(locationType === 'Flats' ? (floorsWithFlats.length > 0 ? floorsWithFlats : floors) : floors).map((flr) => {
                  const isSelected = currentFloorData?.id === flr.id;
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

            {/* Flat Chips (Flats mode) */}
            {locationType === 'Flats' && (
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase mb-1">
                  <span>Select Flat:</span>
                  {selectedFlat && (
                    <button
                      type="button"
                      onClick={handleNextFlat}
                      className="text-amber-600 hover:text-amber-700 font-bold inline-flex items-center gap-1"
                    >
                      <span>Next Flat ⏭️</span>
                    </button>
                  )}
                </div>

                {flatsForCurrentFloor.length === 0 ? (
                  <div className="p-2 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-500 text-center">
                    No flats on this floor.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {flatsForCurrentFloor.map((flat) => {
                      const isSelected = selectedFlat?.id === flat.id || selectedFlat?.flat_number === flat.flat_number;
                      return (
                        <button
                          key={flat.id || flat.flat_number}
                          type="button"
                          onClick={() => setSelectedFlat(flat)}
                          className={`py-1.5 px-1 rounded-xl text-xs font-extrabold border transition text-center ${
                            isSelected
                              ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-105'
                              : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          Flat {flat.flat_number}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Equipment Buttons */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-1.5">Select Equipment:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {equipmentList.map((eq) => {
                const isSelected = selectedEquipment === eq.id;
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => {
                      setSelectedEquipment(eq.id);
                      setDescription(`${eq.id} tested OK`);
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md font-bold scale-[1.02]'
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
                <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 hover:bg-amber-100 cursor-pointer transition text-center shadow-xs active:scale-95 group">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-110 transition">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-amber-950 uppercase tracking-wide">OPEN CAMERA</span>
                  <span className="text-[10px] text-amber-700 font-semibold mt-0.5">Take photo now</span>
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

          {/* 4. Quick 1-Tap Status Chips (No typing needed) */}
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
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
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

          <div className="flex items-center gap-2">
            {locationType === 'Flats' && selectedFlat && (
              <button
                type="button"
                onClick={() => handleSavePhoto(true)}
                disabled={uploading || previewUrls.length === 0}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                title="Save photo and jump directly to the next flat"
              >
                <Zap className="w-4 h-4" />
                <span>SAVE & NEXT FLAT ⏭️</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSavePhoto(false)}
              disabled={uploading || previewUrls.length === 0}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
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
    </div>
  );
}
