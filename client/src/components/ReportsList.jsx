import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  FileSpreadsheet, 
  FileCode, 
  File, 
  Building2, 
  Calendar, 
  User, 
  CheckCircle2, 
  X,
  Filter
} from 'lucide-react';
import { apiRequest, downloadBlob } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ReportsList({ 
  onSelectBuilding, 
  onOpenReportModal, 
  isNewModalOpen, 
  onCloseNewModal, 
  preselectedBuilding, 
  preselectedJob 
}) {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [maintenanceJobs, setMaintenanceJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Form State
  const [formData, setFormData] = useState({
    building_id: preselectedBuilding?.id || '',
    maintenance_id: preselectedJob?.id || '',
    report_type: 'Work Completion Report',
    report_date: new Date().toISOString().slice(0, 10),
    title: '',
    summary: '',
    systems_serviced: 'Fire Alarm (Smoke detectors, Break panel, Fire Alarm panel, Exit lights), Fire extinguishers',
    special_notes: 'NOTE: There is no Fire Hose Reel in this building',
    status: 'Final'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('report_type', typeFilter);
      const res = await apiRequest(`/reports?${params.toString()}`);
      setReports(res.reports || []);
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
    fetchReports();
    fetchBuildings();
  }, [typeFilter]);

  useEffect(() => {
    if (formData.building_id) {
      apiRequest(`/maintenance?building_id=${formData.building_id}`).then(res => {
        setMaintenanceJobs(res.jobs || []);
      });
    }
  }, [formData.building_id]);

  useEffect(() => {
    if (isNewModalOpen) {
      if (preselectedBuilding) {
        setFormData(prev => ({ ...prev, building_id: preselectedBuilding.id }));
      }
      if (preselectedJob) {
        setFormData(prev => ({ 
          ...prev, 
          maintenance_id: preselectedJob.id,
          title: `Work Completion Report – Building No.[${preselectedBuilding?.building_number || ''}], Road No. [${preselectedBuilding?.road || ''}], Block No. [${preselectedBuilding?.block || ''}]`
        }));
      }
    }
  }, [isNewModalOpen, preselectedBuilding, preselectedJob]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.building_id) {
      setFormError('Please select a building.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      onCloseNewModal();
      fetchReports();
      if (res.report) {
        onOpenReportModal(res.report);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadExcel = async (report) => {
    try {
      const blob = await apiRequest(`/reports/${report.id}/excel`);
      downloadBlob(blob, `Work_Completion_Report_Building_${report.building_number}.xlsx`);
    } catch (e) {
      alert('Excel download failed: ' + e.message);
    }
  };

  const handleDownloadPdf = async (report, type = 'completion') => {
    try {
      const blob = await apiRequest(`/reports/${report.id}/pdf?type=${type}`);
      downloadBlob(blob, `Report_Building_${report.building_number}.pdf`);
    } catch (e) {
      alert('PDF download failed: ' + e.message);
    }
  };

  const handleDownloadWord = async (report) => {
    try {
      const blob = await apiRequest(`/reports/${report.id}/word`);
      downloadBlob(blob, `Report_Building_${report.building_number}.docx`);
    } catch (e) {
      alert('Word download failed: ' + e.message);
    }
  };

  const selectedBuildingData = buildings.find(b => b.id === formData.building_id);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">REPORTS & DOCUMENTATION</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ZAYANI Official Multi-Format Reports (Excel .xlsx, PDF .pdf, Word .docx)
          </p>
        </div>

        <button
          onClick={() => onCloseNewModal(false)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ NEW REPORT</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs w-full sm:w-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            All Reports
          </button>
          <button
            onClick={() => setTypeFilter('Work Completion Report')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              typeFilter === 'Work Completion Report' ? 'bg-white text-purple-700 font-bold shadow-sm' : 'text-slate-600'
            }`}
          >
            Work Completion
          </button>
          <button
            onClick={() => setTypeFilter('Inspection Report')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              typeFilter === 'Inspection Report' ? 'bg-white text-emerald-700 font-bold shadow-sm' : 'text-slate-600'
            }`}
          >
            Inspection Reports
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <b>{reports.length}</b> generated report(s)
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No reports generated yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((rpt) => (
            <div
              key={rpt.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{rpt.report_number}</span>
                    <button
                      onClick={() => onSelectBuilding({ id: rpt.building_id, building_number: rpt.building_number, location: rpt.location })}
                      className="px-2.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-full font-bold text-xs transition cursor-pointer"
                    >
                      Building {rpt.building_number} ({rpt.location})
                    </button>
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{rpt.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                    <span>Date: <b>{rpt.report_date}</b></span>
                    <span>•</span>
                    <span>Prepared By: <b className="text-slate-700">{rpt.prepared_by}</b></span>
                  </div>
                </div>

                {/* Direct 1-Click Export Buttons */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    onClick={() => onOpenReportModal(rpt)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Preview Full Report"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => handleDownloadExcel(rpt)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-emerald-200"
                    title="Export Excel .xlsx"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPdf(rpt, 'completion')}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-rose-200"
                    title="Export PDF"
                  >
                    <File className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={() => handleDownloadWord(rpt)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-blue-200"
                    title="Export Word .docx"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Word</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                <div><b className="text-slate-800">Summary:</b> {rpt.summary}</div>
                <div><b className="text-slate-800">Systems Serviced:</b> {rpt.systems_serviced || 'Fire Alarm & Fire Fighting'}</div>
                {rpt.special_notes && (
                  <div><b className="text-slate-800">Special Notes:</b> {rpt.special_notes}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* + NEW REPORT MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">GENERATE OFFICIAL REPORT</h3>
                  <p className="text-[11px] text-purple-300">
                    Prepared By automatically captured as: <b>{user?.name}</b>
                  </p>
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

              {/* Building Selector */}
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
                      Building {b.building_number} — {b.location} (Road: {b.road || 'N/A'}, Block: {b.block || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Report Type & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Report Type
                  </label>
                  <select
                    value={formData.report_type}
                    onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Work Completion Report">Work Completion Report (207 Housing)</option>
                    <option value="Inspection Report">Floor / Flat Inspection Report</option>
                    <option value="Maintenance Report">General Maintenance Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Report Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.report_date}
                    onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              {/* Associated Maintenance Job (Optional) */}
              {maintenanceJobs.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Link to Maintenance Job (Optional)
                  </label>
                  <select
                    value={formData.maintenance_id}
                    onChange={(e) => setFormData({ ...formData, maintenance_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="">-- Select Maintenance Job --</option>
                    {maintenanceJobs.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.maintenance_number} — {m.maintenance_type} ({m.maintenance_date})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Systems Serviced */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Systems Serviced
                </label>
                <input
                  type="text"
                  value={formData.systems_serviced}
                  onChange={(e) => setFormData({ ...formData, systems_serviced: e.target.value })}
                  placeholder="e.g. Fire Alarm (Smoke detectors, Break panel, Fire Alarm panel, Exit lights), Fire extinguishers"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              {/* Special Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Special Notes / Remarks
                </label>
                <input
                  type="text"
                  value={formData.special_notes}
                  onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                  placeholder="e.g. NOTE: There is no Fire Hose Reel in this building"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
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
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : '+ Generate Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
