import React, { useState } from 'react';
import { Building2, X, Plus, Trash2, MapPin, Layers, Home, Car } from 'lucide-react';
import { apiRequest } from '../api';

export default function NewBuildingModal({ isOpen, onClose, onBuildingCreated }) {
  const [formData, setFormData] = useState({
    building_number: '',
    building_name: '',
    location: '',
    road: '',
    block: '',
    address: '',
    remarks: ''
  });

  const [floors, setFloors] = useState([
    { floor_name: 'Ground Floor', has_flats: false, flats: [] },
    { floor_name: 'Floor 1', has_flats: true, flats: ['11', '12', '13', '14'] },
    { floor_name: 'Floor 2', has_flats: true, flats: ['21', '22', '23', '24'] },
    { floor_name: 'Floor 3', has_flats: true, flats: ['31', '32', '33', '34'] },
    { floor_name: 'Floor 4', has_flats: true, flats: ['41', '42', '43', '44'] },
    { floor_name: 'Roof', has_flats: false, flats: [] }
  ]);

  const [areas, setAreas] = useState([
    { area_name: 'Parking B1', area_type: 'Parking' },
    { area_name: 'Main Lobby', area_type: 'Lobby' },
    { area_name: 'Common Area', area_type: 'Common Area' }
  ]);

  const [newFloorName, setNewFloorName] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddFloor = () => {
    if (!newFloorName.trim()) return;
    setFloors([...floors, { floor_name: newFloorName.trim(), has_flats: true, flats: [] }]);
    setNewFloorName('');
  };

  const handleRemoveFloor = (index) => {
    setFloors(floors.filter((_, i) => i !== index));
  };

  const handleToggleHasFlats = (index) => {
    const updated = [...floors];
    updated[index].has_flats = !updated[index].has_flats;
    setFloors(updated);
  };

  const handleAddFlatToFloor = (floorIndex, flatNum) => {
    if (!flatNum || !flatNum.trim()) return;
    const updated = [...floors];
    if (!updated[floorIndex].flats) updated[floorIndex].flats = [];
    updated[floorIndex].flats.push(flatNum.trim());
    setFloors(updated);
  };

  const handleRemoveFlat = (floorIndex, flatIndex) => {
    const updated = [...floors];
    updated[floorIndex].flats.splice(flatIndex, 1);
    setFloors(updated);
  };

  const handleAddArea = () => {
    if (!newAreaName.trim()) return;
    setAreas([...areas, { area_name: newAreaName.trim(), area_type: 'Parking' }]);
    setNewAreaName('');
  };

  const handleRemoveArea = (index) => {
    setAreas(areas.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.building_number || !formData.location) {
      setError('Building Number and Location are required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...formData,
        floors,
        areas
      };

      const res = await apiRequest('/buildings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      onClose();
      if (onBuildingCreated) onBuildingCreated(res.building);
    } catch (err) {
      setError(err.message || 'Failed to create building');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">NEW ZAYANI BUILDING</h2>
              <p className="text-xs text-blue-300">Configure Building, Actual Floors, Flats & Parking Areas</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 1. Basic Building Info */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Building Identification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Building Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 320, 312, 1000"
                  value={formData.building_number}
                  onChange={(e) => setFormData({ ...formData, building_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Location <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Khalifa City / JAW, Lawzi"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Road (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 6405"
                  value={formData.road}
                  onChange={(e) => setFormData({ ...formData, road: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Block (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 964"
                  value={formData.block}
                  onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Building Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Building 320 - Khalifa City"
                value={formData.building_name}
                onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          {/* 2. Floors & Flats Configuration */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Floors & Flats Configuration ({floors.length} Floors)</span>
              </div>
            </div>

            {/* List of configured floors */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {floors.map((flr, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">{flr.floor_name}</span>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1 font-bold text-[11px] text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={flr.has_flats}
                          onChange={() => handleToggleHasFlats(idx)}
                          className="rounded text-blue-600"
                        />
                        <span>Has Flats?</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveFloor(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {flr.has_flats && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-200">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {flr.flats && flr.flats.map((flatNum, fIdx) => (
                          <span
                            key={fIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-lg"
                          >
                            Flat {flatNum}
                            <button
                              type="button"
                              onClick={() => handleRemoveFlat(idx, fIdx)}
                              className="text-blue-600 hover:text-rose-600 ml-0.5"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Quick Add Flat Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Add Flat (e.g. 21)"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddFlatToFloor(idx, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] outline-none w-32"
                        />
                        <span className="text-[10px] text-slate-400">Press Enter to add</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Custom Floor Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Floor Name (e.g. Basement, Floor 5, Roof)"
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddFloor}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
              >
                + ADD FLOOR
              </button>
            </div>
          </div>

          {/* 3. Parking & Other Areas */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-blue-600" />
              <span>3. Parking & Other Areas (No Flats Needed)</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {areas.map((a, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl"
                >
                  <Car className="w-3.5 h-3.5 text-slate-500" />
                  <span>{a.area_name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveArea(idx)}
                    className="text-slate-400 hover:text-rose-600 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Area Name (e.g. Parking B2, External Car Park, Roof Deck)"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddArea}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
              >
                + ADD AREA
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Creating...' : '+ Create Building'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
