import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  FileText, 
  X, 
  ArrowRight,
  Filter,
  Check,
  Edit2,
  FileSpreadsheet
} from 'lucide-react';
import { apiRequest, downloadBlob } from '../api';
import { useAuth } from '../context/AuthContext';

export default function InspectionModule({ 
  onSelectBuilding, 
  isNewModalOpen, 
  onCloseNewModal, 
  preselectedBuilding 
}) {
  const { user } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInsp, setSelectedInsp] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingItem, setSavingItem] = useState(null);

  // New Inspection Modal state
  const [formData, setFormData] = useState({
    building_id: preselectedBuilding?.id || '',
    inspection_date: new Date().toISOString().slice(0, 10),
    inspector_name: user?.name || 'Sarath KR',
    remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/inspections');
      setInspections(res.inspections || []);
      if (res.inspections && res.inspections.length > 0 && !selectedInsp) {
        loadInspectionDetail(res.inspections[0].id);
      }
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

  const loadInspectionDetail = async (inspId) => {
    try {
      setLoadingItems(true);
      const res = await apiRequest(`/inspections/${inspId}`);
      setSelectedInsp(res.inspection);
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchInspections();
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (isNewModalOpen && preselectedBuilding) {
      setFormData(prev => ({ ...prev, building_id: preselectedBuilding.id }));
    }
  }, [isNewModalOpen, preselectedBuilding]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.building_id) {
      setFormError('Please select a building.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await apiRequest('/inspections', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      onCloseNewModal();
      setFormData({
        building_id: '',
        inspection_date: new Date().toISOString().slice(0, 10),
        inspector_name: user?.name || 'Sarath KR',
        remarks: ''
      });
      fetchInspections();
      if (res.inspection) {
        loadInspectionDetail(res.inspection.id);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateItemStatus = async (item, newStatus, customRemark = null, customIssue = null) => {
    setSavingItem(item.id);
    try {
      const isNotOpen = newStatus === 'Not Open' || newStatus === 'Not Accessible';
      const updated = {
        ...item,
        inspection_status: newStatus,
        remarks: customRemark !== null ? customRemark : (isNotOpen ? 'NOT OPEN' : 'OK'),
        issue_type: customIssue !== null ? customIssue : (isNotOpen ? 'Not accessible during inspection' : '')
      };

      await apiRequest(`/inspections/item/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated)
      });

      setItems(items.map(it => it.id === item.id ? updated : it));
    } catch (e) {
      alert('Failed to update status: ' + e.message);
    } finally {
      setSavingItem(null);
    }
  };

  const handleMarkAllFloorOk = async (floor) => {
    const floorItems = items.filter(it => it.floor === floor);
    const updatedPayload = floorItems.map(it => ({
      ...it,
      inspection_status: 'OK',
      remarks: 'OK',
      issue_type: ''
    }));

    try {
      await apiRequest(`/inspections/${selectedInsp.id}/items`, {
        method: 'PUT',
        body: JSON.stringify({ items: updatedPayload })
      });
      loadInspectionDetail(selectedInsp.id);
    } catch (e) {
      alert('Batch update failed: ' + e.message);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedInsp) return;
    try {
      const reports = await apiRequest(`/reports?building_id=${selectedInsp.building_id}`);
      const rptId = reports.reports?.[0]?.id || selectedInsp.id;
      const blob = await apiRequest(`/reports/${rptId}/pdf?type=inspection`);
      downloadBlob(blob, `Inspection_Report_Building_${selectedInsp.building_number}.pdf`);
    } catch (e) {
      alert('PDF generation failed: ' + e.message);
    }
  };

  // Group items by floor
  const floorGroups = items.reduce((acc, it) => {
    if (!acc[it.floor]) acc[it.floor] = [];
    acc[it.floor].push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">FLOOR / FLAT INSPECTION</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ZAYANI Building Flat Inspection Matrix (Floors & Flats Access Tracking)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedInsp && (
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF (JAW 320)</span>
            </button>
          )}

          <button
            onClick={() => onCloseNewModal(false)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ NEW INSPECTION</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Inspection Selector Left, Matrix Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Col: Inspections List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Select Inspection
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading list...</div>
            ) : inspections.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No inspections found</div>
            ) : (
              inspections.map((insp) => {
                const isSelected = selectedInsp?.id === insp.id;
                return (
                  <button
                    key={insp.id}
                    onClick={() => loadInspectionDetail(insp.id)}
                    className={`w-full p-3.5 text-left transition cursor-pointer flex flex-col gap-1 ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900">{insp.inspection_number}</span>
                      <span className="text-[10px] text-slate-400">{insp.inspection_date}</span>
                    </div>
                    <div className="text-xs font-bold text-blue-700 truncate">
                      Building {insp.building_number} ({insp.location})
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between mt-1">
                      <span>Total: <b>{insp.total_items || 16}</b> Flats</span>
                      <span className="text-rose-600 font-bold">{insp.issues_count || 0} Not Open</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right 3 Cols: Inspection Matrix */}
        <div className="lg:col-span-3 space-y-4">
          {loadingItems ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading Flat Matrix...
            </div>
          ) : !selectedInsp ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Select an inspection on the left to view floor and flat details.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Box mirroring JAW 320.pdf */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    {selectedInsp.location} Building No:{selectedInsp.building_number}
                  </div>
                  <div className="text-xs text-slate-300 font-medium mt-0.5">
                    Road-{selectedInsp.road || '6405'}   Block-{selectedInsp.block || '964'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <div className="text-slate-400 font-semibold">Inspector</div>
                    <div className="font-bold text-white">{selectedInsp.inspector_name || 'Sarath KR'}</div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
                    {selectedInsp.status}
                  </span>
                </div>
              </div>

              {/* Floor by Floor Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-200">
                {Object.keys(floorGroups).map((floor) => (
                  <div key={floor} className="p-4 space-y-3">
                    <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2 font-black text-slate-900 text-xs uppercase">
                        <span className="w-6 h-6 bg-slate-800 text-white rounded-lg flex items-center justify-center text-xs">
                          {floor}
                        </span>
                        <span>Floor {floor} Flats</span>
                      </div>

                      <button
                        onClick={() => handleMarkAllFloorOk(floor)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        ✓ Mark All Floor {floor} OK
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
                          <tr>
                            <th className="py-2 px-3 w-16">Floor</th>
                            <th className="py-2 px-3 w-20">Flat no</th>
                            <th className="py-2 px-3">Issue type</th>
                            <th className="py-2 px-3">Remarks</th>
                            <th className="py-2 px-3 text-right">Quick Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {floorGroups[floor].map((item) => {
                            const isNotOpen = item.remarks === 'NOT OPEN' || item.issue_type?.includes('Not accessible');
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/80 transition">
                                <td className="py-2.5 px-3 font-bold text-slate-700">{item.floor}</td>
                                <td className="py-2.5 px-3 font-black text-slate-900">{item.flat_no}</td>
                                <td className={`py-2.5 px-3 font-medium ${isNotOpen ? 'text-rose-600' : 'text-slate-600'}`}>
                                  {item.issue_type || '-'}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isNotOpen ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}>
                                    {item.remarks || 'OK'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleUpdateItemStatus(item, 'OK')}
                                      disabled={savingItem === item.id}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        !isNotOpen ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-emerald-100 text-slate-600'
                                      }`}
                                    >
                                      OK
                                    </button>
                                    <button
                                      onClick={() => handleUpdateItemStatus(item, 'Not Open')}
                                      disabled={savingItem === item.id}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        isNotOpen ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-rose-100 text-slate-600'
                                      }`}
                                    >
                                      NOT OPEN
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* + NEW INSPECTION MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">NEW BUILDING INSPECTION</h3>
                  <p className="text-[11px] text-slate-400">Auto-seeds floors & flat numbers</p>
                </div>
              </div>
              <button onClick={onCloseNewModal} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Building <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={formData.building_id}
                  onChange={(e) => setFormData({ ...formData, building_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="">-- Choose Building --</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      Building {b.building_number} — {b.location} ({b.total_floors || 4} Floors, { (b.total_floors || 4) * (b.flats_per_floor || 4) } Flats)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.inspection_date}
                    onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Inspector Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.inspector_name}
                    onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Routine fire alarm & smoke detector inspection"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCloseNewModal}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : '+ Create Inspection Matrix'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
