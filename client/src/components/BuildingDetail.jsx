import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Wrench, 
  FileText, 
  Camera, 
  ClipboardCheck, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  ArrowLeft, 
  Download, 
  Eye, 
  Clock, 
  Upload, 
  FileSpreadsheet, 
  FileCode, 
  File, 
  ShieldCheck, 
  Sparkles,
  Phone,
  User,
  Trash2,
  Calendar,
  Layers
} from 'lucide-react';
import { apiRequest, downloadBlob } from '../api';

export default function BuildingDetail({ 
  buildingId, 
  onBack, 
  onOpenNewMaintenance, 
  onOpenNewInspection, 
  onOpenNewReport,
  onOpenReportModal,
  onOpenPhotoViewer
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, maintenance, reports, photos, inspection, work-completion, history
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoCategory, setPhotoCategory] = useState('Inspection');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/buildings/${buildingId}`);
      setData(res);
    } catch (e) {
      console.error('Failed to load building detail:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buildingId) {
      fetchDetail();
    }
  }, [buildingId]);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      const systemType = photoCategory === 'Fire Fighting' ? 'Fire Fighting' : 'Fire Alarm';
      const equipmentType = systemType === 'Fire Fighting' ? 'Extinguisher' : 'Detector';

      formData.append('building_id', data.building.id);
      formData.append('system_type', systemType);
      formData.append('category', photoCategory);
      formData.append('equipment_type', equipmentType);
      files.forEach((file) => {
        formData.append('photos', file);
      });

      await apiRequest('/photos/upload', {
        method: 'POST',
        body: formData
      });

      fetchDetail();
      alert(`Successfully uploaded ${files.length} photo(s) to Building ${data.building.building_number}!`);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleDownloadExcel = async (reportId, buildingNo) => {
    try {
      const blob = await apiRequest(`/reports/${reportId}/excel`);
      downloadBlob(blob, `Work_Completion_Report_Building_${buildingNo}.xlsx`);
    } catch (e) {
      alert('Excel download failed: ' + e.message);
    }
  };

  const handleDownloadPdf = async (reportId, buildingNo, type = 'completion') => {
    try {
      const blob = await apiRequest(`/reports/${reportId}/pdf?type=${type}`);
      downloadBlob(blob, `Report_Building_${buildingNo}.pdf`);
    } catch (e) {
      alert('PDF download failed: ' + e.message);
    }
  };

  const handleDownloadWord = async (reportId, buildingNo) => {
    try {
      const blob = await apiRequest(`/reports/${reportId}/word`);
      downloadBlob(blob, `Report_Building_${buildingNo}.docx`);
    } catch (e) {
      alert('Word download failed: ' + e.message);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading Building Details...</p>
        </div>
      </div>
    );
  }

  const { building, maintenanceJobs = [], reports = [], inspections = [], photos = [] } = data;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'maintenance', label: `Maintenance (${maintenanceJobs.length})`, icon: Wrench },
    { id: 'reports', label: `Reports (${reports.length})`, icon: FileText },
    { id: 'photos', label: `Photos (${photos.length})`, icon: Camera },
    { id: 'inspection', label: `Inspection (${inspections.length})`, icon: ClipboardCheck },
    { id: 'work-completion', label: 'Work Completion', icon: ShieldCheck },
    { id: 'history', label: 'History', icon: History }
  ];

  // Latest inspection items
  const latestInspection = inspections[0];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">All Buildings</span>
          </button>
          
          <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <span>ZAYANI</span>
            <span>/</span>
            <span className="font-bold text-slate-900">Building {building.building_number}</span>
          </div>
        </div>

        {/* Quick Action Buttons for this Building */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenNewMaintenance(building)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>+ Maintenance</span>
          </button>
          <button
            onClick={() => onOpenNewInspection(building)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>+ Inspection</span>
          </button>
          <button
            onClick={() => onOpenNewReport(building)}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>+ Report</span>
          </button>
        </div>
      </div>

      {/* Building Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-blue-400/30">
                <Building2 className="w-3.5 h-3.5" />
                <span>ZAYANI PROJECT</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Building {building.building_number}
              </h1>
              <div className="text-lg font-bold text-blue-300 mt-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{building.location}</span>
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-4 mt-2 font-medium">
                <span>Road: <b className="text-white">{building.road || 'N/A'}</b></span>
                <span>•</span>
                <span>Block: <b className="text-white">{building.block || 'N/A'}</b></span>
                <span>•</span>
                <span>Type: <b className="text-white">{building.building_type || '207 Housing'}</b></span>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                building.status === 'active' 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                  : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}>
                ● {building.status}
              </span>
              <div className="text-xs text-slate-400 font-medium">
                Floors: <b className="text-white">{building.total_floors || 4}</b> | Flats/Floor: <b className="text-white">{building.flats_per_floor || 4}</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-200">
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overview KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Maintenance Jobs</div>
                <div className="text-3xl font-black text-amber-600">{building.maintenance_count || 0}</div>
                <div className="text-xs text-slate-400 mt-1">Last: {building.last_maintenance_date || 'N/A'}</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Official Reports</div>
                <div className="text-3xl font-black text-purple-600">{building.report_count || 0}</div>
                <div className="text-xs text-slate-400 mt-1">Ready for Excel & PDF</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cataloged Photos</div>
                <div className="text-3xl font-black text-indigo-600">{building.photo_count || 0}</div>
                <div className="text-xs text-slate-400 mt-1">Auto-organized</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Open Issues / Not Open</div>
                <div className={`text-3xl font-black ${building.open_issues_count > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {building.open_issues_count || 0}
                </div>
                <div className="text-xs text-slate-400 mt-1">Flats pending access</div>
              </div>
            </div>

            {/* Building Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Building Metadata & Contact Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-semibold block mb-1">Primary Identification</span>
                  <div className="text-sm font-black text-slate-900">
                    Building No: {building.building_number} ({building.location})
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-semibold block mb-1">Address Details</span>
                  <div className="font-bold text-slate-800">
                    Road: {building.road || 'N/A'} | Block: {building.block || 'N/A'}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-semibold block mb-1">Building Contact</span>
                  <div className="font-bold text-slate-800">
                    {building.contact_person || 'Supervisor JAW'}
                  </div>
                  <div className="text-slate-500 mt-0.5">{building.contact_number || '+973 3900 XXXX'}</div>
                </div>
              </div>

              {building.remarks && (
                <div className="mt-4 p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900">
                  <b className="font-bold">Project Remarks:</b> {building.remarks}
                </div>
              )}
            </div>

            {/* Latest Activity Snapshot */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latest Maintenance Job */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-600" />
                    <span>Latest Maintenance Job</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('maintenance')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                {maintenanceJobs.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">No maintenance jobs recorded yet</div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900">{maintenanceJobs[0].maintenance_number}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                        {maintenanceJobs[0].status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700">{maintenanceJobs[0].description}</div>
                    <div className="text-[11px] text-slate-500">
                      Findings: {maintenanceJobs[0].findings || 'None noted'}
                    </div>
                    <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span>Date: {maintenanceJobs[0].maintenance_date}</span>
                      <span>Engineer: {maintenanceJobs[0].engineer_name || 'Sarath KR'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Latest Inspection Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    <span>Floor / Flat Inspection Status</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('inspection')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Open Matrix
                  </button>
                </div>

                {inspections.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">No inspection records yet</div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900">{inspections[0].inspection_number}</span>
                      <span className="text-xs text-slate-500">{inspections[0].inspection_date}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
                      <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg border border-emerald-200">
                        {inspections[0].ok_items || 0} Flats OK
                      </div>
                      <div className="bg-rose-50 text-rose-700 p-2 rounded-lg border border-rose-200">
                        {inspections[0].not_ok_items || 0} Not Accessible / Issues
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Inspector: <b>{inspections[0].inspector_name || 'Sarath KR'}</b>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. MAINTENANCE TAB */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Maintenance History</h3>
              <button
                onClick={() => onOpenNewMaintenance(building)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Maintenance Job</span>
              </button>
            </div>

            {maintenanceJobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No maintenance jobs recorded for this building.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {maintenanceJobs.map((job) => (
                  <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">{job.maintenance_number}</span>
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px]">
                            {job.maintenance_type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          Date: <b>{job.maintenance_date}</b> • Area: <b>{job.system_area}</b>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase self-start sm:self-auto">
                        {job.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-500 font-bold block mb-1">Description</span>
                        <p className="text-slate-800">{job.description || '-'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-500 font-bold block mb-1">Findings</span>
                        <p className="text-slate-800">{job.findings || '-'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-500 font-bold block mb-1">Action Taken</span>
                        <p className="text-slate-800">{job.action_taken || '-'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <div>
                        Technician: <b className="text-slate-700">{job.technician_name || '-'}</b> | Engineer: <b className="text-slate-700">{job.engineer_name || '-'}</b>
                      </div>
                      <button
                        onClick={() => onOpenNewReport(building, job)}
                        className="px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded-lg font-bold transition cursor-pointer text-xs flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Generate Report</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Building Reports & Official Exports</h3>
              <button
                onClick={() => onOpenNewReport(building)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Report</span>
              </button>
            </div>

            {reports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No reports generated for this building yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((rpt) => (
                  <div key={rpt.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">{rpt.report_number}</span>
                          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full font-bold text-[10px]">
                            {rpt.report_type}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-700 mt-1">{rpt.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Prepared By: <b>{rpt.prepared_by}</b> • Date: <b>{rpt.report_date}</b>
                        </div>
                      </div>

                      {/* Export Action Buttons */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <button
                          onClick={() => onOpenReportModal(rpt)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Preview Report"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        <button
                          onClick={() => handleDownloadExcel(rpt.id, building.building_number)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-emerald-200"
                          title="Download Official Excel Report"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Excel (.xlsx)</span>
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(rpt.id, building.building_number, 'completion')}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-rose-200"
                          title="Download PDF Completion Report"
                        >
                          <File className="w-3.5 h-3.5" />
                          <span>PDF (.pdf)</span>
                        </button>

                        <button
                          onClick={() => handleDownloadWord(rpt.id, building.building_number)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-blue-200"
                          title="Download Word Report"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>Word (.docx)</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                      <div><b className="text-slate-800">Systems Serviced:</b> {rpt.systems_serviced || 'Fire Alarm & Fire Fighting'}</div>
                      {rpt.special_notes && (
                        <div><b className="text-slate-800">Special Notes:</b> {rpt.special_notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. PHOTOS TAB */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Building {building.building_number} Photo Hub ({photos.length} photos)
                </h3>
                <p className="text-xs text-slate-500">
                  Auto-organized into <code className="text-blue-600 font-mono">ZAYANI/Building-{building.building_number}/2026/Photos</code>
                </p>
              </div>

              {/* Upload Controls */}
              <div className="flex items-center gap-2">
                <select
                  value={photoCategory}
                  onChange={(e) => setPhotoCategory(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="Inspection">Category: Inspection</option>
                  <option value="Before">Category: Before</option>
                  <option value="During">Category: During</option>
                  <option value="After">Category: After</option>
                  <option value="Fire Alarm">Category: Fire Alarm</option>
                  <option value="Fire Fighting">Category: Fire Fighting</option>
                  <option value="Common Area">Category: Common Area</option>
                  <option value="Flats">Category: Flats</option>
                  <option value="Elevator">Category: Elevator</option>
                </select>

                <label className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingPhotos ? 'Uploading...' : '+ Upload / Camera'}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhotos}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {photos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Camera className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No photos cataloged for Building {building.building_number} yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {photos.map((p) => {
                  const token = localStorage.getItem('zayani_token');
                  const srcUrl = `/api/photos/${p.id}/file?token=${token}`;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onOpenPhotoViewer(p, photos)}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="aspect-square bg-slate-100 relative overflow-hidden">
                        <img
                          src={srcUrl}
                          alt={p.caption || p.stored_filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          loading="lazy"
                        />
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-900/80 text-white text-[9px] font-bold rounded backdrop-blur-sm">
                          {p.category}
                        </span>
                      </div>

                      <div className="p-2 space-y-0.5">
                        <div className="text-[11px] font-bold text-slate-800 truncate">
                          {p.floor ? `Floor ${p.floor}` : ''} {p.flat_no ? `Flat ${p.flat_no}` : ''}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate" title={p.stored_filename}>
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

        {/* 5. INSPECTION TAB (FLAT / FLOOR MATRIX) */}
        {activeTab === 'inspection' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Floor / Flat Inspection Matrix</h3>
                <p className="text-xs text-slate-500">
                  Matches format of official <code className="text-blue-600 font-mono">JAW 320.pdf</code> report
                </p>
              </div>

              <div className="flex items-center gap-2">
                {reports.length > 0 && (
                  <button
                    onClick={() => handleDownloadPdf(reports[0].id, building.building_number, 'inspection')}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JAW 320.pdf</span>
                  </button>
                )}

                <button
                  onClick={() => onOpenNewInspection(building)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ New Inspection</span>
                </button>
              </div>
            </div>

            {inspections.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No inspection records found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inspections.map((insp) => (
                  <InspectionViewDetail key={insp.id} inspectionId={insp.id} building={building} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. WORK COMPLETION TAB */}
        {activeTab === 'work-completion' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-200 pb-4 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">
                ZAYANI 207 HOUSING PROJECT
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Safety Enhancement in 207 Housing Apartment Buildings
              </h2>
              <div className="text-sm font-bold text-slate-700 mt-1">
                Work Completion Report – Building No.[{building.building_number}], Road No. [{building.road || 'N/A'}], Block No. [{building.block || 'N/A'}]
              </div>
            </div>

            {/* Section 1 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Work Completion Summary for Fire Fighting Works
              </h4>
              <p className="text-xs text-slate-700">
                <b>Systems serviced:</b> Fire Alarm (Smoke detectors, Break panel, Fire Alarm panel, Exit lights), Fire extinguishers
              </p>
              <p className="text-xs text-slate-500 italic">
                {building.building_number === '320' ? 'NOTE: There is no Fire Hose Reel in this building.' : 'Certified fire protection measures completed.'}
              </p>
            </div>

            {/* Section 2 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Work Completion Summary for Fire Alarm Works
              </h4>
              <p className="text-xs text-slate-700">
                All smoke detectors, heat sensors, manual call points and audible beacons inspected across floors 1 to {building.total_floors || 4}.
              </p>
            </div>

            {/* Section 3 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Work Completion Summary for Elevator & Interfaces
              </h4>
              <p className="text-xs text-slate-700">
                Elevator shaft fire interface recall signals verified and operating as per safety standards.
              </p>
            </div>

            {/* Signatures */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-slate-500">Prepared By:</span> <b className="text-slate-800">{reports[0]?.prepared_by || 'Sarath KR (Site Engineer)'}</b>
              </div>
              <div>
                <span className="text-slate-500">Date:</span> <b className="text-slate-800">{reports[0]?.report_date || '2026-02-09'}</b>
              </div>
              <button
                onClick={() => handleDownloadExcel(reports[0]?.id || 'rpt-2026-320-001', building.building_number)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel Report</span>
              </button>
            </div>
          </div>
        )}

        {/* 7. HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Chronological Building Timeline</span>
            </h3>

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
              {/* Combine reports and maintenance into a unified timeline */}
              {[...reports.map(r => ({ ...r, eventType: 'report', date: r.report_date })), 
                ...maintenanceJobs.map(m => ({ ...m, eventType: 'maintenance', date: m.maintenance_date }))]
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                .map((item, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow ${
                      item.eventType === 'report' ? 'bg-purple-600' : 'bg-amber-600'
                    }`} />
                    
                    <div className="text-xs font-bold text-slate-500">{item.date}</div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      {item.eventType === 'report' ? `Report: ${item.report_number}` : `Maintenance Job: ${item.maintenance_number}`}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {item.title || item.description}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Sub-component for interactive floor & flat matrix
function InspectionViewDetail({ inspectionId, building }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/inspections/${inspectionId}`);
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [inspectionId]);

  const handleToggleStatus = async (item, newStatus) => {
    setUpdating(true);
    try {
      const isNotOpen = newStatus === 'Not Open' || newStatus === 'Not Accessible';
      const updated = {
        ...item,
        inspection_status: newStatus,
        remarks: isNotOpen ? 'NOT OPEN' : 'OK',
        issue_type: isNotOpen ? 'Not accessible during inspection' : ''
      };

      await apiRequest(`/inspections/item/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated)
      });

      setItems(items.map(it => it.id === item.id ? updated : it));
    } catch (e) {
      alert('Update failed: ' + e.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-4 text-xs text-slate-500">Loading inspection table...</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-blue-400 uppercase">
            {building.location} Building No:{building.building_number}
          </div>
          <div className="text-xs text-slate-300">
            Road-{building.road || 'N/A'} • Block-{building.block || 'N/A'}
          </div>
        </div>
        <div className="text-xs text-slate-400">
          Inspection Items: <b className="text-white">{items.length} Flats</b>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-2.5 w-16">Floor</th>
              <th className="px-4 py-2.5 w-20">Flat no</th>
              <th className="px-4 py-2.5">Issue type</th>
              <th className="px-4 py-2.5">Remarks</th>
              <th className="px-4 py-2.5 text-right">Quick Toggle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => {
              const isNotOpen = item.remarks === 'NOT OPEN' || item.issue_type?.includes('Not accessible');
              return (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-4 py-2 font-bold text-slate-900">{item.floor}</td>
                  <td className="px-4 py-2 font-black text-slate-800">{item.flat_no}</td>
                  <td className={`px-4 py-2 font-medium ${isNotOpen ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
                    {item.issue_type || '-'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isNotOpen ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {item.remarks || 'OK'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(item, 'OK')}
                        disabled={updating}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          !isNotOpen ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100'
                        }`}
                      >
                        OK
                      </button>
                      <button
                        onClick={() => handleToggleStatus(item, 'Not Open')}
                        disabled={updating}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          isNotOpen ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-rose-100'
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
  );
}
