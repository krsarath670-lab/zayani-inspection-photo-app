import React, { useState } from 'react';
import { 
  FolderArchive, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Inbox, 
  FileText,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { apiRequest } from '../api';

export default function FolderImportModal({ isOpen, onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a ZIP file to import.');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('zipFile', file);

      const res = await apiRequest('/photos/import-zip', {
        method: 'POST',
        body: formData
      });

      setResult(res.results);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-8">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FolderArchive className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">IMPORT BUILDING PHOTO ARCHIVE</h3>
              <p className="text-[11px] text-indigo-300">Auto-detects Building Number from folder hierarchy</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <span>Folder Structure Recognition Rules:</span>
                </div>
                <p className="text-[11px] text-blue-800">
                  The importer parses folder patterns like <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">JAW/320/FIRE ALARM/FLATS/FLAT 11/...</code> or <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">Lawzi/1000/FIRE FIGHTING/...</code> and maps photos directly to the building.
                </p>
                <p className="text-[11px] text-blue-800 font-semibold">
                  ⚠️ Unrecognized folders will be safely placed in the <b>Import Review Queue</b>. Never wrongly assigned!
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select ZIP Archive
                </label>
                <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition">
                  <FolderArchive className="w-10 h-10 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">
                    {file ? file.name : 'Choose a ZIP Archive file'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ZIP containing photos organized in building folders
                  </span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Scanning & Organizing...</span>
                    </div>
                  ) : (
                    <span>Start Automatic Import</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Import Completed Successfully!</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Files</div>
                    <div className="text-lg font-black text-slate-900">{result.totalFiles}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-emerald-700 font-semibold uppercase">Auto Assigned</div>
                    <div className="text-lg font-black text-emerald-700">{result.assignedCount}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-amber-700 font-semibold uppercase">Review Queue</div>
                    <div className="text-lg font-black text-amber-700">{result.reviewQueueCount}</div>
                  </div>
                </div>
              </div>

              {result.reviewQueueCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <b>Note:</b> {result.reviewQueueCount} file(s) had ambiguous building numbers and were placed in the Review Queue.
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
