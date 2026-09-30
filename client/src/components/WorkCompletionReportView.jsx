import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Camera, 
  Plus, 
  CheckCircle2, 
  Eye, 
  Trash2, 
  Upload, 
  X,
  FileText,
  Building2,
  Maximize2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { apiRequest } from '../api';
import { saveOfflinePhoto } from '../offlineDb';

export default function WorkCompletionReportView({
  building,
  floors = [],
  areas = [],
  photos = [],
  onRefreshPhotos,
  onOpenPhotoLightbox
}) {
  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'fa' | 'ff' | 'elevator'
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const reportRef = useRef(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Group photos into sections
  const faPhotos = photos.filter(p => 
    p.system_type === 'Fire Alarm' || 
    (p.category || '').toLowerCase().includes('alarm') ||
    (p.category || '').toLowerCase().includes('smoke') ||
    (p.category || '').toLowerCase().includes('heat') ||
    (p.category || '').toLowerCase().includes('panel') ||
    (p.category || '').toLowerCase().includes('break') ||
    (p.category || '').toLowerCase().includes('mcp')
  );

  const ffPhotos = photos.filter(p => 
    p.system_type === 'Fire Fighting' || 
    (p.category || '').toLowerCase().includes('fighting') ||
    (p.category || '').toLowerCase().includes('extinguisher') ||
    (p.category || '').toLowerCase().includes('hose') ||
    (p.category || '').toLowerCase().includes('valve') ||
    (p.category || '').toLowerCase().includes('exit')
  );

  const elevatorPhotos = photos.filter(p => 
    (p.caption || '').toLowerCase().includes('lift') ||
    (p.caption || '').toLowerCase().includes('elevator') ||
    (p.area_name || '').toLowerCase().includes('lift') ||
    (p.area_name || '').toLowerCase().includes('elevator')
  );

  // Helper to generate the exact sticker text matching user's Excel format
  const generateStickerText = (photo) => {
    const loc = building.location || 'Building';
    const bldNo = building.building_number || '320';
    
    let floorTag = '';
    if (photo.floor_name || photo.floor) {
      const f = String(photo.floor_name || photo.floor).trim();
      floorTag = f.toLowerCase().includes('g') || f.toLowerCase().includes('ground') ? 'g/f' : `floor ${f.replace(/[^0-9]/g, '') || f}`;
    }

    let flatTag = '';
    if (photo.flat_no || photo.flat_number) {
      flatTag = `flat ${photo.flat_no || photo.flat_number}`;
    }

    let eqTag = (photo.equipment_type || photo.category || 'testing').toLowerCase();
    if (!eqTag.includes('testing') && !eqTag.includes('panel')) {
      eqTag += ' testing';
    }

    let areaTag = photo.area_name ? photo.area_name.toLowerCase() : '';

    const parts = [loc, `building no ${bldNo}`];
    if (floorTag) parts.push(floorTag);
    if (flatTag) parts.push(flatTag);
    if (areaTag && !parts.some(p => p.includes(areaTag))) parts.push(areaTag);
    if (eqTag) parts.push(eqTag);

    return parts.join(' ');
  };

  // Direct 1-tap snap into section
  const handleTriggerSectionUpload = (systemType, defaultEquipment = 'Smoke Detector', isCamera = false) => {
    setUploadingSlot({
      systemType,
      equipmentType: defaultEquipment,
      floorName: 'Floor 1',
      locationType: systemType === 'Fire Alarm' ? 'FLAT' : 'FLOOR'
    });

    if (isCamera && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadingSlot) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('building_id', building.id);
        formData.append('system_type', uploadingSlot.systemType);
        formData.append('equipment_type', uploadingSlot.equipmentType);
        formData.append('location_type', uploadingSlot.locationType);
        formData.append('floor_name', uploadingSlot.floorName);
        formData.append('caption', `${building.location} building no ${building.building_number} ${uploadingSlot.systemType} testing`);

        try {
          await apiRequest('/photos', {
            method: 'POST',
            body: formData
          });
        } catch (netErr) {
          console.warn('Network offline, saving photo locally:', netErr);
          await saveOfflinePhoto({
            building_id: building.id,
            building_number: building.building_number,
            system_type: uploadingSlot.systemType,
            equipment_type: uploadingSlot.equipmentType,
            location_type: uploadingSlot.locationType,
            floor_name: uploadingSlot.floorName,
            caption: `${building.location} building no ${building.building_number} ${uploadingSlot.systemType} testing`,
            file: file,
            original_filename: file.name
          });
        }
      }

      if (onRefreshPhotos) await onRefreshPhotos();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadingSlot(null);
      if (e.target) e.target.value = '';
    }
  };

  // Export to Excel Workbook (.xlsx) matching exact report structure
  const handleExportXlsx = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Work Completion Summary
      const summaryData = [
        ['', '', '', '', 'Safety Enhancement in 207 Housing Apartment Buildings'],
        ['', '', '', '', `Work Completion Report – Building No.[${building.building_number}], Road No. [${building.road || '6405'}], Block No. [${building.block || '964'}]`],
        [],
        ['Work Completion Summary for Fire Alarm Works'],
        ['', 'Systems serviced: Fire Alarm (Smoke detectors, Break panel, Fire Alarm panel, Exit lights), Fire extinguishers'],
        [],
        ['Photo Reference ID', 'Floor', 'Flat / Location', 'Equipment / Service Type', 'Sticker Label Text', 'Filename', 'Upload Date'],
        ...photos.map((p, idx) => [
          p.id || `PHT-${idx+1}`,
          p.floor_name || p.floor || '-',
          p.flat_no || p.area_name || '-',
          p.equipment_type || p.category || p.system_type || 'Testing',
          generateStickerText(p),
          p.original_filename || p.filename || '-',
          p.created_at || new Date().toISOString()
        ]),
        [],
        ['Work Completion Summary for Fire Fighting Works'],
        ['', 'NOTE: There is no Fire Hose Reel in this building'],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 28 }, { wch: 45 }, { wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Work Completion');

      // Sheet 2: Flat Inspection Checklist
      const flatData = [
        [`${building.location} Building No:${building.building_number}`],
        [`Road-${building.road || '6405'}   Block-${building.block || '964'}    ${building.location}`],
        ['Floor', 'Flat no', 'Issue type', 'Remarks'],
      ];

      floors.forEach(f => {
        (f.flats || []).forEach(fl => {
          flatData.push([f.floor_number || f.name, fl.flat_number, '', 'OK']);
        });
      });

      const wsFlats = XLSX.utils.aoa_to_sheet(flatData);
      wsFlats['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 35 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsFlats, 'Flat Inspection');

      XLSX.writeFile(wb, `Work_Completion_Report_Building_${building.building_number}.xlsx`);
    } catch (e) {
      alert('Error exporting Excel: ' + e.message);
    }
  };

  // Export Printable PDF / Print
  const handlePrintOrPdf = async () => {
    if (!reportRef.current) return;
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Work_Completion_Report_Building_${building.building_number}.pdf`);
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File / Camera Inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Top Action & Format Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 uppercase tracking-wider">
              Exact Excel Template
            </span>
            <span className="text-xs text-blue-300 font-bold">3-Column Grid with Auto Stickers</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Official Work Completion Report Sheet
          </h2>
          <p className="text-xs text-slate-300">
            Photos automatically format with angled official stickers and align into 3 columns per row.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Section Filter */}
          <div className="bg-slate-800 p-1 rounded-2xl border border-slate-700 flex items-center">
            <button
              onClick={() => setActiveSection('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSection === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              All Sections
            </button>
            <button
              onClick={() => setActiveSection('fa')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSection === 'fa' ? 'bg-red-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              🚨 Fire Alarm ({faPhotos.length})
            </button>
            <button
              onClick={() => setActiveSection('ff')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSection === 'ff' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              🧯 Fire Fighting ({ffPhotos.length})
            </button>
          </div>

          {/* Export Excel */}
          <button
            onClick={handleExportXlsx}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer border border-emerald-400/30"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>EXPORT EXCEL (.XLSX)</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={handlePrintOrPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer border border-indigo-400/30"
          >
            {isExportingPdf ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>PRINT / PDF</span>
          </button>
        </div>
      </div>

      {/* THE OFFICIAL EXCEL WORK COMPLETION SHEET CANVAS */}
      <div 
        ref={reportRef}
        className="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl p-6 sm:p-10 max-w-5xl mx-auto text-slate-900"
      >
        {/* Ministry & Company Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4 gap-4">
          {/* Company Logo / Details */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-blue-900 text-white font-black rounded-xl flex items-center justify-center text-xs shadow text-center p-1 leading-tight">
              ZAYANI TRADING
            </div>
            <div>
              <div className="text-xs font-black uppercase text-blue-950 tracking-wider">
                شركة الزياني للتجارة والمقاولات ش.ش.و
              </div>
              <div className="text-[11px] font-bold text-slate-700">
                ZAYANI TRADING & CONTRACTING W.L.L.
              </div>
              <div className="text-[10px] text-slate-500">
                P.O. BOX 2666, MANAMA, KINGDOM OF BAHRAIN
              </div>
            </div>
          </div>

          {/* Kingdom / Ministry Logo */}
          <div className="text-right">
            <div className="text-xs font-black text-rose-800 uppercase tracking-wider">
              مملكة البحرين - وزارة الإسكان والتخطيط العمراني
            </div>
            <div className="text-[11px] font-bold text-slate-800">
              Ministry of Housing and Urban Planning
            </div>
            <div className="text-[10px] text-slate-500">
              Kingdom of Bahrain
            </div>
          </div>
        </div>

        {/* Project Titles */}
        <div className="text-center my-4 space-y-1">
          <h1 className="text-base sm:text-lg font-black text-blue-900 uppercase tracking-wide">
            Safety Enhancement in 207 Housing Apartment Buildings
          </h1>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-800 bg-slate-100 py-1.5 px-4 rounded-xl border border-slate-200 inline-block">
            Work Completion Report – Building No. [{building.building_number}], Road No. [{building.road || '6405'}], Block No. [{building.block || '964'}]
          </h2>
        </div>

        {/* SECTION 1: FIRE ALARM WORKS */}
        {(activeSection === 'all' || activeSection === 'fa') && (
          <div className="mt-8">
            {/* Section Banner */}
            <div className="bg-slate-800 text-white px-4 py-2 rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-blue-200">
                  Work Completion Summary for Fire Alarm works
                </h3>
                <p className="text-[11px] text-slate-300">
                  Systems serviced: Fire Alarm (Smoke detectors, Break panel, Fire Alarm panel, Exit lights), Fire extinguishers
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTriggerSectionUpload('Fire Alarm', 'Smoke Detector', true)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Snap photo for Fire Alarm"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Snap FA Photo</span>
                </button>
              </div>
            </div>

            {/* Strict 3-Column Photo Grid */}
            <div className="border-2 border-slate-800 border-t-0 p-4 bg-slate-50/50">
              {faPhotos.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl bg-white p-6">
                  <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">No Fire Alarm photos added yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Photos you snap will automatically adjust into this 3-column sheet with stickers.
                  </p>
                  <button
                    onClick={() => handleTriggerSectionUpload('Fire Alarm', 'Smoke Detector', true)}
                    className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                  >
                    + Snap First Fire Alarm Photo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {faPhotos.map((photo, idx) => (
                    <div 
                      key={photo.id || idx}
                      className="group relative bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-300 flex flex-col aspect-[3/4]"
                    >
                      {/* Photo Image */}
                      <img
                        src={photo.thumbnail_url || photo.url || (photo.data ? URL.createObjectURL(photo.data) : '')}
                        alt="Fire Alarm Inspection"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onClick={() => {
                          if (onOpenPhotoLightbox) onOpenPhotoLightbox(photo);
                        }}
                      />

                      {/* Angled White Sticker Overlay (Matches User's Excel Format Exactly) */}
                      <div className="absolute bottom-4 left-3 right-3 pointer-events-none">
                        <div className="bg-white/95 backdrop-blur-xs text-slate-900 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-xl border border-slate-200/90 leading-tight transform -rotate-1 text-center capitalize">
                          {photo.caption || generateStickerText(photo)}
                        </div>
                      </div>

                      {/* Top Action Overlay */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl">
                        <button
                          onClick={() => {
                            if (onOpenPhotoLightbox) onOpenPhotoLightbox(photo);
                          }}
                          className="p-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 cursor-pointer"
                          title="View Full Size"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: FIRE FIGHTING WORKS */}
        {(activeSection === 'all' || activeSection === 'ff') && (
          <div className="mt-8">
            {/* Section Banner */}
            <div className="bg-blue-950 text-white px-4 py-2 rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-cyan-200">
                  Work Completion Summary for Fire Fighting Works
                </h3>
                <p className="text-[11px] text-slate-300">
                  NOTE: There is no Fire Hose Reel in this building • Fire Extinguishers & Exit Lights Serviced
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTriggerSectionUpload('Fire Fighting', 'Fire Extinguisher', true)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Snap photo for Fire Fighting"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Snap FF Photo</span>
                </button>
              </div>
            </div>

            {/* Strict 3-Column Photo Grid */}
            <div className="border-2 border-blue-950 border-t-0 p-4 bg-slate-50/50">
              {ffPhotos.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl bg-white p-6">
                  <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">No Fire Fighting photos added yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Snap Extinguisher, Exit light, or Landing valve photos to automatically place here.
                  </p>
                  <button
                    onClick={() => handleTriggerSectionUpload('Fire Fighting', 'Fire Extinguisher', true)}
                    className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                  >
                    + Snap First Fire Fighting Photo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {ffPhotos.map((photo, idx) => (
                    <div 
                      key={photo.id || idx}
                      className="group relative bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-300 flex flex-col aspect-[3/4]"
                    >
                      {/* Photo Image */}
                      <img
                        src={photo.thumbnail_url || photo.url || (photo.data ? URL.createObjectURL(photo.data) : '')}
                        alt="Fire Fighting Inspection"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onClick={() => {
                          if (onOpenPhotoLightbox) onOpenPhotoLightbox(photo);
                        }}
                      />

                      {/* Angled White Sticker Overlay */}
                      <div className="absolute bottom-4 left-3 right-3 pointer-events-none">
                        <div className="bg-white/95 backdrop-blur-xs text-slate-900 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-xl border border-slate-200/90 leading-tight transform -rotate-1 text-center capitalize">
                          {photo.caption || generateStickerText(photo)}
                        </div>
                      </div>

                      {/* Top Action Overlay */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl">
                        <button
                          onClick={() => {
                            if (onOpenPhotoLightbox) onOpenPhotoLightbox(photo);
                          }}
                          className="p-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 cursor-pointer"
                          title="View Full Size"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 3: ELEVATOR / COMMON AREA SUMMARY */}
        {(activeSection === 'all' || activeSection === 'elevator') && elevatorPhotos.length > 0 && (
          <div className="mt-8">
            <div className="bg-slate-700 text-white px-4 py-2 rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-200">
                  Work Completion Summary for Elevator & Lift Lobby
                </h3>
              </div>
            </div>

            <div className="border-2 border-slate-700 border-t-0 p-4 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {elevatorPhotos.map((photo, idx) => (
                  <div 
                    key={photo.id || idx}
                    className="group relative bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-300 flex flex-col aspect-[3/4]"
                  >
                    <img
                      src={photo.thumbnail_url || photo.url || (photo.data ? URL.createObjectURL(photo.data) : '')}
                      alt="Elevator Inspection"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    <div className="absolute bottom-4 left-3 right-3 pointer-events-none">
                      <div className="bg-white/95 backdrop-blur-xs text-slate-900 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-xl border border-slate-200/90 leading-tight transform -rotate-1 text-center capitalize">
                        {photo.caption || generateStickerText(photo)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Signatures */}
        <div className="mt-12 pt-6 border-t-2 border-slate-900 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs">
          <div>
            <div className="font-bold text-slate-500">Site Engineer / Inspector:</div>
            <div className="h-12 border-b border-slate-400 mt-2 flex items-end justify-center font-bold text-slate-800 pb-1">
              Sarath KR
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">ZAYANI TRADING & CONTRACTING</div>
          </div>

          <div>
            <div className="font-bold text-slate-500">Technician Signature:</div>
            <div className="h-12 border-b border-slate-400 mt-2 flex items-end justify-center font-bold text-slate-800 pb-1">
              Verified & Tested
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Safety Compliance</div>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <div className="font-bold text-slate-500">Ministry Quality Inspector:</div>
            <div className="h-12 border-b border-slate-400 mt-2 flex items-end justify-center font-bold text-slate-800 pb-1">
              Approved
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Ministry of Housing & Urban Planning</div>
          </div>
        </div>
      </div>

      {/* Uploading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold text-slate-800">Applying sticker and adjusting into Excel sheet...</span>
          </div>
        </div>
      )}
    </div>
  );
}
