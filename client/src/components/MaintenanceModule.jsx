import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Building2, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Filter, 
  FileText, 
  Camera, 
  X, 
  User,
  ArrowRight
} from 'lucide-react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';

export default function MaintenanceModule({ 
  onSelectBuilding, 
  onOpenReportModal, 
  onOpenNewReport,
  isNewModalOpen, 
  onCloseNewModal,
  preselectedBuilding 
}) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form State
  const [formData, setFormData] = useState({
    building_id: preselectedBuilding?.id || '',
    maintenance_date: new Date().toISOString().slice(0, 10),
    maintenance_type: 'Periodic Maintenance',
    system_area: 'Fire Alarm & Fire Fighting',
    description: '',
    findings: '',
    action_taken: '',
    remarks: '',
    technician_name: 'Kiran & Majeed',
    engineer_name: user?.name || 'Sarath KR',
    status: 'Completed'
  });
  const [nextNumber, setNextNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await apiRequest(`/maintenance?${params.toString()}`);
      setJobs(res.jobs || []);
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

  const fetchNextNumber = async () => {
    try {
      const res = await apiRequest('/maintenance/next-number');
      setNextNumber(res.nextNumber);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchBuildings();
  }, [search, statusFilter]);

  useEffect(() => {
    if (isNewModalOpen) {
      fetchNextNumber();
      if (preselectedBuilding) {
        setFormData(prev => ({ ...prev, building_id: preselectedBuilding.id }));
      }
    }
  }, [isNewModalOpen, preselectedBuilding]);

  const selectedBuildingData = buildings.find(b => b.id === formData.building_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.building_id) {
      setFormError('Please select a building.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await apiRequest('/maintenance', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      onCloseNewModal();
      setFormData({
        building_id: '',
        maintenance_date: new Date().toISOString().slice(0, 10),
        maintenance_type: 'Periodic Maintenance',
        system_area: 'Fire Alarm & Fire Fighting',
        description: '',
        findings: '',
        action_taken: '',
        remarks: '',
        technician_name: 'Kiran & Majeed',
        engineer_name: user?.name || 'Sarath KR',
        status: 'Completed'
      });
      fetchJobs();
    } catch (err) {
      setFormError(err.message || 'Failed to create maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">MAINTENANCE WORK</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ZAYANI Project Maintenance Logs & Field Servicing
          </p>
        </div>

        <button
          onClick={() => {
            fetchNextNumber();
            onCloseNewModal(false); // trigger open
          }}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ NEW MAINTENANCE</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Maintenance No, Building No, Location, Description..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
          />
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('Completed')}
            className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'Completed' ? 'bg-white text-emerald-700 font-bold shadow-sm' : 'text-slate-600'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter('In Progress')}
            className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'In Progress' ? 'bg-white text-amber-700 font-bold shadow-sm' : 'text-slate-600'
            }`}
          >
            In Progress
          </button>
        </div>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading Maintenance Records...
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No maintenance jobs found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-amber-400 transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{job.maintenance_number}</span>
                    <button
                      onClick={() => onSelectBuilding({ id: job.building_id, building_number: job.building_number, location: job.location })}
                      className="px-2.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-full font-bold text-xs transition cursor-pointer"
                    >
                      Building {job.building_number} ({job.location})
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>Date: <b className="text-slate-700">{job.maintenance_date}</b></span>
                    <span>•</span>
                    <span>Type: <b className="text-slate-700">{job.maintenance_type}</b></span>
                    <span>•</span>
                    <span>Area: <b className="text-slate-700">{job.system_area}</b></span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase self-start sm:self-auto ${
                  job.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {job.status}
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold block mb-1">Description</span>
                  <p className="text-slate-800">{job.description || '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold block mb-1">Findings</span>
                  <p className="text-slate-800">{job.findings || '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold block mb-1">Action Taken</span>
                  <p className="text-slate-800">{job.action_taken || '-'}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span>Tech: <b className="text-slate-700">{job.technician_name || '-'}</b></span>
                  <span>Eng: <b className="text-slate-700">{job.engineer_name || '-'}</b></span>
                  <span>Photos: <b className="text-indigo-600">{job.photo_count || 0}</b></span>
                </div>

                <button
                  onClick={() => onOpenNewReport({ id: job.building_id, building_number: job.building_number, location: job.location, road: job.road, block: job.block }, job)}
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Create Official Report</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* + NEW MAINTENANCE MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">CREATE MAINTENANCE JOB</h3>
                  <p className="text-[11px] text-amber-400 font-mono">
                    Auto Generated No: {nextNumber || 'ZAY-MNT-2026-XXX'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onCloseNewModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Step 1: Select Building Number -> Auto-display Location (No manual re-typing!) */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1">
                    Select Building Number <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    value={formData.building_id}
                    onChange={(e) => setFormData({ ...formData, building_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">-- Choose ZAYANI Building --</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        Building {b.building_number} — {b.location} (Road: {b.road || 'N/A'}, Block: {b.block || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-populated Location Banner */}
                {selectedBuildingData && (
                  <div className="p-3 bg-white rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-800">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                      <div>
                        <b>Location:</b> <span className="text-blue-700 font-bold">{selectedBuildingData.location}</span>
                        <div className="text-[11px] text-slate-500">
                          Road: {selectedBuildingData.road || 'N/A'} • Block: {selectedBuildingData.block || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                      Auto-Populated
                    </span>
                  </div>
                )}
              </div>

              {/* Maintenance Date & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Maintenance Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.maintenance_date}
                    onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Maintenance Type
                  </label>
                  <select
                    value={formData.maintenance_type}
                    onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Safety Enhancement">Safety Enhancement (207 Housing)</option>
                    <option value="Periodic Maintenance">Periodic Maintenance</option>
                    <option value="Corrective Repair">Corrective Repair</option>
                    <option value="Emergency Callout">Emergency Callout</option>
                    <option value="Annual Inspection">Annual Inspection</option>
                  </select>
                </div>
              </div>

              {/* System/Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  System / Area
                </label>
                <select
                  value={formData.system_area}
                  onChange={(e) => setFormData({ ...formData, system_area: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                >
                  <option value="Fire Alarm & Fire Fighting">Fire Alarm & Fire Fighting</option>
                  <option value="Fire Alarm System Only">Fire Alarm System Only</option>
                  <option value="Fire Extinguishers & Fighting">Fire Extinguishers & Fighting</option>
                  <option value="Elevator Fire Interface">Elevator Fire Interface</option>
                  <option value="Common Area Safety">Common Area Safety</option>
                  <option value="Complete Building">Complete Building</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description of Maintenance Work
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Safety Enhancement in 207 Housing Apartment Buildings - Fire Alarm & Fighting servicing"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none resize-none"
                />
              </div>

              {/* Findings & Action Taken */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Findings
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Systems serviced: Fire Alarm, Panel, Exit lights, Fire extinguishers. Note: No hose reel."
                    value={formData.findings}
                    onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Action Taken
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Completed inspection of all detectors and control panels across 4 floors."
                    value={formData.action_taken}
                    onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none resize-none"
                  />
                </div>
              </div>

              {/* Tech, Engineer, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Technician(s)
                  </label>
                  <input
                    type="text"
                    value={formData.technician_name}
                    onChange={(e) => setFormData({ ...formData, technician_name: e.target.value })}
                    placeholder="e.g. Kiran & Majeed"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Responsible Engineer
                  </label>
                  <input
                    type="text"
                    value={formData.engineer_name}
                    onChange={(e) => setFormData({ ...formData, engineer_name: e.target.value })}
                    placeholder="e.g. Sarath KR"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : '+ Save Maintenance Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
