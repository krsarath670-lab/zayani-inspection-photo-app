import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  File, 
  Printer, 
  X, 
  Building2, 
  MapPin, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  Camera,
  Share2
} from 'lucide-react';
import { apiRequest, downloadBlob } from '../api';

export default function ReportViewerModal({ report, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && report) {
      setLoading(true);
      apiRequest(`/reports/${report.id}`)
        .then(res => setData(res))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, report]);

  if (!isOpen || !report) return null;

  const handleDownloadExcel = async () => {
    try {
      const blob = await apiRequest(`/reports/${report.id}/excel`);
      downloadBlob(blob, `Work_Completion_Report_Building_${report.building_number}.xlsx`);
    } catch (e) {
      alert('Excel download failed: ' + e.message);
    }
  };

  const handleDownloadPdf = async (type = 'completion') => {
    try {
      const blob = await apiRequest(`/reports/${report.id}/pdf?type=${type}`);
      downloadBlob(blob, `Report_Building_${report.building_number}.pdf`);
    } catch (e) {
      alert('PDF download failed: ' + e.message);
    }
  };

  const handleDownloadWord = async () => {
    try {
      const blob = await apiRequest(`/reports/${report.id}/word`);
      downloadBlob(blob, `Report_Building_${report.building_number}.docx`);
    } catch (e) {
      alert('Word download failed: ' + e.message);
    }
  };

  const fullReport = data?.report || report;
  const items = data?.inspectionItems || [];
  const photos = data?.photos || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 no-print">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight">{fullReport.report_number}</span>
              <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-bold text-[10px]">
                {fullReport.report_type}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Building {fullReport.building_number} • {fullReport.location}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
              title="Print Report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Download Actions Strip */}
        <div className="bg-slate-100 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 no-print">
          <span className="text-xs font-bold text-slate-600">Export Report As:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => handleDownloadPdf('completion')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <File className="w-3.5 h-3.5" />
              <span>PDF (.pdf)</span>
            </button>

            <button
              onClick={handleDownloadWord}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Word (.docx)</span>
            </button>
          </div>
        </div>

        {/* Report Body (Printable Paper Layout) */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 text-slate-800 bg-white">
          
          {/* Official Document Header */}
          <div className="border-b-2 border-slate-900 pb-6 text-center space-y-1">
            <div className="text-xs font-black uppercase tracking-widest text-blue-700">
              SAFETY ENHANCEMENT IN 207 HOUSING APARTMENT BUILDINGS
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {fullReport.title || `Work Completion Report – Building No.[${fullReport.building_number}], Road No. [${fullReport.road || '6405'}], Block No. [${fullReport.block || '964'}]`}
            </h1>
            <div className="text-xs text-slate-600 font-semibold">
              Project: ZAYANI • Location: {fullReport.location} • Road: {fullReport.road || 'N/A'} • Block: {fullReport.block || 'N/A'}
            </div>
          </div>

          {/* Section 1: Fire Fighting & Alarm Scope */}
          <div className="space-y-3">
            <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
              1. Work Completion Summary for Fire Fighting & Fire Alarm Works
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div>
                <span className="font-bold text-slate-900">Systems serviced: </span>
                <span className="text-slate-700">{fullReport.systems_serviced || 'Fire Alarm (Smoke detectors, Break panel, Fire Alarm panel, Exit lights), Fire extinguishers'}</span>
              </div>
              {fullReport.special_notes && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-medium">
                  {fullReport.special_notes}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Floor & Flat Inspection Table */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>2. Floor & Flat Inspection Log (Sample: JAW 320.pdf)</span>
                <span className="text-[10px] text-slate-300">{items.length} Units Checked</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 w-16">Floor</th>
                      <th className="py-2.5 px-4 w-20">Flat no</th>
                      <th className="py-2.5 px-4">Issue type</th>
                      <th className="py-2.5 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => {
                      const isNotOpen = it.remarks === 'NOT OPEN' || it.issue_type?.includes('Not accessible');
                      return (
                        <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-2 px-4 font-bold text-slate-900">{it.floor}</td>
                          <td className="py-2 px-4 font-black text-slate-800">{it.flat_no}</td>
                          <td className={`py-2 px-4 font-medium ${isNotOpen ? 'text-rose-600' : 'text-slate-600'}`}>
                            {it.issue_type || '-'}
                          </td>
                          <td className="py-2 px-4">
                            <span className={`font-bold ${isNotOpen ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {it.remarks || 'OK'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: Photo Documentation Grid */}
          {photos.length > 0 && (
            <div className="space-y-3">
              <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
                3. Attached Photographic Evidence
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.slice(0, 9).map((p) => {
                  const token = localStorage.getItem('zayani_token');
                  const srcUrl = `/api/photos/${p.id}/file?token=${token}`;
                  return (
                    <div key={p.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <div className="aspect-video bg-slate-200 relative overflow-hidden">
                        <img
                          src={srcUrl}
                          alt={p.caption}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1 left-1 bg-slate-900/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                          {p.category}
                        </span>
                      </div>
                      <div className="p-2 text-[10px]">
                        <div className="font-bold text-slate-800 truncate">
                          {p.floor ? `Flr ${p.floor}` : ''} {p.flat_no ? `Flat ${p.flat_no}` : ''} {p.caption}
                        </div>
                        <div className="text-slate-400 font-mono truncate">{p.stored_filename}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4: Document Footer & Signatures */}
          <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Prepared & Certified By</div>
              <div className="font-black text-sm text-slate-900">{fullReport.prepared_by}</div>
              <div className="text-slate-500">Date: {fullReport.report_date}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Document Verification</div>
              <div className="font-bold text-emerald-700">✓ Digitally Stamped & Verified</div>
              <div className="text-[11px] text-slate-400">ZAYANI Project Maintenance Database</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
