import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Building2, 
  Check, 
  Trash2, 
  Eye, 
  X, 
  AlertCircle,
  Tag,
  ArrowRight
} from 'lucide-react';
import { apiRequest } from '../api';

export default function ImportReviewQueue({ onSelectBuilding }) {
  const [items, setItems] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [assignData, setAssignData] = useState({
    building_id: '',
    category: 'Inspection',
    caption: ''
  });

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/import-review');
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const res = await apiRequest('/buildings');
      setBuildings(res.buildings || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchBuildings();
  }, []);

  const handleAssign = async (itemId) => {
    if (!assignData.building_id) {
      alert('Please select a building to assign this photo.');
      return;
    }

    try {
      await apiRequest(`/import-review/${itemId}/assign`, {
        method: 'POST',
        body: JSON.stringify(assignData)
      });
      setAssigningId(null);
      fetchQueue();
      alert('Photo successfully assigned!');
    } catch (e) {
      alert('Assignment failed: ' + e.message);
    }
  };

  const handleDiscard = async (itemId) => {
    if (!confirm('Discard this photo from the review queue?')) return;
    try {
      await apiRequest(`/import-review/${itemId}`, { method: 'DELETE' });
      fetchQueue();
    } catch (e) {
      alert('Failed to discard: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">IMPORT REVIEW QUEUE</h1>
          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
            {items.length} Pending
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Review imported photos that require manual building confirmation to ensure 100% data integrity.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading review queue...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">Review Queue is Clean!</h3>
          <p className="text-xs text-slate-500 mt-1">
            All uploaded and imported photos are properly assigned to their corresponding ZAYANI buildings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const token = localStorage.getItem('zayani_token');
            const previewUrl = `/api/import-review/${item.id}/file?token=${token}`;
            const isAssigning = assigningId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video bg-slate-100 relative overflow-hidden">
                    <img
                      src={previewUrl}
                      alt={item.original_filename}
                      className="w-full h-full object-cover"
                    />
                    {item.detected_building_candidate && (
                      <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                        Suggested B-{item.detected_building_candidate}
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="text-xs font-bold text-slate-900 truncate" title={item.original_filename}>
                      {item.original_filename}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                      Path: {item.original_folder_path || '-'}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  {isAssigning ? (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Select Building</label>
                        <select
                          value={assignData.building_id}
                          onChange={(e) => setAssignData({ ...assignData, building_id: e.target.value })}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                        >
                          <option value="">-- Choose Building --</option>
                          {buildings.map((b) => (
                            <option key={b.id} value={b.id}>
                              Building {b.building_number} ({b.location})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => setAssigningId(null)}
                          className="px-2.5 py-1 text-slate-600 rounded text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAssign(item.id)}
                          className="px-3 py-1 bg-blue-600 text-white font-bold rounded text-xs shadow"
                        >
                          Confirm & Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleDiscard(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Discard"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setAssigningId(item.id);
                          // Pre-match candidate if exists
                          const matched = buildings.find(b => b.building_number === item.detected_building_candidate);
                          setAssignData({
                            building_id: matched?.id || '',
                            category: item.suggested_category || 'Inspection',
                            caption: `Imported photo from ${item.original_filename}`
                          });
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <span>Assign to Building</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
