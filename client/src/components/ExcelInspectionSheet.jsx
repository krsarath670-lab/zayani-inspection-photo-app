import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Camera, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Trash2, 
  X, 
  Upload, 
  Sparkles,
  Flame,
  ShieldCheck,
  RotateCw,
  Search,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiRequest } from '../api';
import { saveOfflinePhoto, getOfflineBuildingDetail } from '../offlineDb';

export default function ExcelInspectionSheet({ 
  building, 
  floors = [], 
  areas = [], 
  photos = [], 
  onRefreshPhotos,
  onOpenPhotoLightbox
}) {
  const [activeSystem, setActiveSystem] = useState('Fire Alarm'); // 'Fire Alarm' | 'Fire Fighting' | 'Master'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'completed' | 'pending'
  const [uploadingCell, setUploadingCell] = useState(null); // { floor, flat, area, equipment, system }
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewCellPhotos, setPreviewCellPhotos] = useState(null); // { title, photos: [] }

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Equipment column definitions for each system
  const fireAlarmColumns = [
    { id: 'Smoke Detector', label: 'Smoke Detector', icon: '💨', short: 'Smoke' },
    { id: 'Heat Detector', label: 'Heat Detector', icon: '🔥', short: 'Heat' },
    { id: 'MCP Break Glass', label: 'Manual Call Point (MCP)', icon: '🚨', short: 'MCP' },
    { id: 'Bell / Sounder', label: 'Sounder / Bell', icon: '🔔', short: 'Sounder' },
    { id: 'DB / Panel', label: 'DB / Panel / Wiring', icon: '⚡', short: 'Panel' },
    { id: 'General / Flat Overview', label: 'Overview Photo', icon: '📸', short: 'Overview' },
  ];

  const fireFightingColumns = [
    { id: 'Fire Extinguisher', label: 'Fire Extinguisher (DCP/CO2)', icon: '🧯', short: 'Extinguisher' },
    { id: 'Fire Hose Reel', label: 'Fire Hose Reel (FHR)', icon: '🌀', short: 'Hose Reel' },
    { id: 'Landing Valve / Breeching', label: 'Landing Valve / Breeching', icon: '🚰', short: 'Landing Valve' },
    { id: 'Zone Control Valve', label: 'Zone Control Valve (ZCV)', icon: '⚙️', short: 'Zone Valve' },
    { id: 'Pump / Riser Room', label: 'Pump / Riser Room', icon: '🏢', short: 'Riser Room' },
    { id: 'General Overview', label: 'Area Overview Photo', icon: '📸', short: 'Overview' },
  ];

  const activeColumns = activeSystem === 'Fire Alarm' ? fireAlarmColumns : fireFightingColumns;

  // Build spreadsheet rows based on active system
  // Fire Alarm: Flat-based rows for each floor
  // Fire Fighting: Floor & Area-based rows
  const buildRows = () => {
    const rows = [];
    let rowIndex = 1;

    if (activeSystem === 'Fire Alarm') {
      floors.forEach((floor) => {
        const floorFlats = floor.flats && floor.flats.length > 0 
          ? floor.flats 
          : [{ flat_number: `Floor ${floor.floor_number} Common` }];

        floorFlats.forEach((flat) => {
          rows.push({
            id: `FA-${floor.id || floor.floor_number}-${flat.id || flat.flat_number}`,
            index: rowIndex++,
            floorName: floor.name || `Floor ${floor.floor_number}`,
            floorNumber: floor.floor_number,
            flatNumber: flat.flat_number,
            locationLabel: `${floor.name || `Floor ${floor.floor_number}`} - Flat ${flat.flat_number}`,
            system: 'Fire Alarm',
            floorObj: floor,
            flatObj: flat
          });
        });
      });

      // If no floors defined yet, add fallback rows
      if (rows.length === 0) {
        for (let f = 1; f <= 3; f++) {
          for (let fl = 1; fl <= 4; fl++) {
            const flatNo = `${f}${fl}`;
            rows.push({
              id: `FA-F${f}-FL${flatNo}`,
              index: rowIndex++,
              floorName: `Floor ${f}`,
              floorNumber: f,
              flatNumber: flatNo,
              locationLabel: `Floor ${f} - Flat ${flatNo}`,
              system: 'Fire Alarm'
            });
          }
        }
      }
    } else {
      // Fire Fighting: Floors + Common Areas + Parking
      floors.forEach((floor) => {
        rows.push({
          id: `FF-Floor-${floor.id || floor.floor_number}`,
          index: rowIndex++,
          floorName: floor.name || `Floor ${floor.floor_number}`,
          floorNumber: floor.floor_number,
          flatNumber: '-',
          locationLabel: `${floor.name || `Floor ${floor.floor_number}`} (Common Lobby & Corridor)`,
          system: 'Fire Fighting',
          floorObj: floor
        });
      });

      areas.forEach((area) => {
        rows.push({
          id: `FF-Area-${area.id || area.name}`,
          index: rowIndex++,
          floorName: area.type || 'Common Area',
          floorNumber: '-',
          flatNumber: '-',
          locationLabel: area.name,
          system: 'Fire Fighting',
          areaObj: area
        });
      });

      // If no areas/floors, add default floors & parking
      if (rows.length === 0) {
        ['Ground Floor / Parking', 'Floor 1', 'Floor 2', 'Floor 3', 'Roof / Pump Area'].forEach((loc, idx) => {
          rows.push({
            id: `FF-DEF-${idx}`,
            index: rowIndex++,
            floorName: loc,
            floorNumber: idx,
            flatNumber: '-',
            locationLabel: loc,
            system: 'Fire Fighting'
          });
        });
      }
    }

    return rows;
  };

  const allRows = buildRows();

  // Map photos to row + column
  const getCellPhotos = (row, equipmentId) => {
    return photos.filter(p => {
      // Must match system
      if (p.system_type && p.system_type !== row.system) return false;

      // Match equipment
      const eqMatches = (p.equipment_type || '').toLowerCase() === equipmentId.toLowerCase() ||
                        (p.category || '').toLowerCase() === equipmentId.toLowerCase();
      if (!eqMatches) return false;

      // Match location
      if (row.system === 'Fire Alarm') {
        const pFloor = String(p.floor_name || p.floor || '').toLowerCase();
        const rFloor = String(row.floorName || '').toLowerCase();
        const pFlat = String(p.flat_no || p.flat_number || '').toLowerCase();
        const rFlat = String(row.flatNumber || '').toLowerCase();

        const floorMatches = pFloor.includes(rFloor) || rFloor.includes(pFloor) || pFloor === String(row.floorNumber);
        const flatMatches = pFlat === rFlat || pFlat.includes(rFlat);
        return floorMatches && flatMatches;
      } else {
        const pLoc = String(p.floor_name || p.area_name || p.floor || '').toLowerCase();
        const rLoc = String(row.locationLabel || row.floorName || '').toLowerCase();
        return pLoc.includes(rLoc) || rLoc.includes(pLoc) || pLoc === String(row.floorNumber);
      }
    });
  };

  // Filter rows
  const filteredRows = allRows.filter(row => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = row.locationLabel.toLowerCase().includes(q) ||
                            String(row.floorName).toLowerCase().includes(q) ||
                            String(row.flatNumber).toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (statusFilter !== 'all') {
      let hasAnyPhoto = false;
      for (const col of activeColumns) {
        if (getCellPhotos(row, col.id).length > 0) {
          hasAnyPhoto = true;
          break;
        }
      }
      if (statusFilter === 'completed' && !hasAnyPhoto) return false;
      if (statusFilter === 'pending' && hasAnyPhoto) return false;
    }

    return true;
  });

  // Calculate statistics
  const totalSlots = allRows.length * activeColumns.length;
  let filledSlots = 0;
  allRows.forEach(row => {
    activeColumns.forEach(col => {
      if (getCellPhotos(row, col.id).length > 0) {
        filledSlots++;
      }
    });
  });
  const completionPercentage = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  // Handle direct photo snapping into exact cell
  const handleTriggerCellUpload = (row, col, isCamera = false) => {
    setUploadingCell({
      row,
      col,
      floor: row.floorName,
      flat: row.flatNumber !== '-' ? row.flatNumber : null,
      area: row.system === 'Fire Fighting' ? row.locationLabel : null,
      equipment: col.id,
      system: row.system
    });

    if (isCamera && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadingCell) return;

    setIsProcessing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('building_id', building.id);
        formData.append('system_type', uploadingCell.system);
        formData.append('equipment_type', uploadingCell.equipment);
        formData.append('location_type', uploadingCell.system === 'Fire Alarm' ? 'FLAT' : 'FLOOR');
        formData.append('floor_name', uploadingCell.floor || '');
        if (uploadingCell.flat) formData.append('flat_no', uploadingCell.flat);
        if (uploadingCell.area) formData.append('area_name', uploadingCell.area);
        formData.append('caption', `${uploadingCell.system} - ${uploadingCell.equipment} at ${uploadingCell.flat ? `Flat ${uploadingCell.flat}` : uploadingCell.floor}`);

        try {
          await apiRequest('/photos', {
            method: 'POST',
            body: formData
          });
        } catch (netErr) {
          console.warn('Network upload failed, saving offline:', netErr);
          await saveOfflinePhoto({
            building_id: building.id,
            building_number: building.building_number,
            system_type: uploadingCell.system,
            equipment_type: uploadingCell.equipment,
            location_type: uploadingCell.system === 'Fire Alarm' ? 'FLAT' : 'FLOOR',
            floor_name: uploadingCell.floor || '',
            flat_no: uploadingCell.flat || '',
            area_name: uploadingCell.area || '',
            caption: `${uploadingCell.system} - ${uploadingCell.equipment}`,
            file: file,
            original_filename: file.name,
            mime_type: file.type || 'image/jpeg'
          });
        }
      }

      if (onRefreshPhotos) {
        await onRefreshPhotos();
      }
    } catch (err) {
      alert('Error uploading photo: ' + err.message);
    } finally {
      setIsProcessing(false);
      setUploadingCell(null);
      if (e.target) e.target.value = '';
    }
  };

  // Export current Excel Sheet matrix to real .xlsx file
  const handleExportExcelSpreadsheet = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Matrix Checklist
      const matrixData = [];
      matrixData.push([`ZAYANI SAFETY ENHANCEMENT - BUILDING ${building.building_number} INSPECTION SHEET`]);
      matrixData.push([`Location: ${building.location}`, `Road: ${building.road || '-'}`, `Block: ${building.block || '-'}`]);
      matrixData.push([`System: ${activeSystem}`, `Export Date: ${new Date().toLocaleString()}`, `Completion: ${completionPercentage}%`]);
      matrixData.push([]); // blank row

      // Headers
      const headers = ['#', 'Floor', activeSystem === 'Fire Alarm' ? 'Flat No' : 'Area / Location'];
      activeColumns.forEach(col => headers.push(col.label));
      headers.push('Status', 'Photos Count');
      matrixData.push(headers);

      // Rows
      allRows.forEach((row) => {
        const rowValues = [
          row.index,
          row.floorName,
          activeSystem === 'Fire Alarm' ? row.flatNumber : row.locationLabel
        ];

        let rowPhotoCount = 0;
        activeColumns.forEach(col => {
          const cellPhotos = getCellPhotos(row, col.id);
          rowPhotoCount += cellPhotos.length;
          if (cellPhotos.length > 0) {
            rowValues.push(`✅ YES (${cellPhotos.length} Photo${cellPhotos.length > 1 ? 's' : ''})`);
          } else {
            rowValues.push('❌ PENDING');
          }
        });

        rowValues.push(rowPhotoCount > 0 ? 'INSPECTED' : 'PENDING');
        rowValues.push(rowPhotoCount);
        matrixData.push(rowValues);
      });

      const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);

      // Set column widths
      wsMatrix['!cols'] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 26 },
        ...activeColumns.map(() => ({ wch: 22 })),
        { wch: 14 },
        { wch: 14 }
      ];

      XLSX.utils.book_append_sheet(wb, wsMatrix, `${activeSystem} Matrix`);

      // Sheet 2: Photos Detailed Manifest
      const photosData = [
        ['Photo ID', 'System', 'Floor', 'Flat / Area', 'Equipment Category', 'Filename', 'Upload Date', 'Status'],
        ...photos.map(p => [
          p.id,
          p.system_type || '-',
          p.floor_name || p.floor || '-',
          p.flat_no || p.area_name || '-',
          p.equipment_type || p.category || '-',
          p.original_filename || p.filename || '-',
          p.created_at || new Date().toISOString(),
          'OK'
        ])
      ];
      const wsPhotos = XLSX.utils.aoa_to_sheet(photosData);
      wsPhotos['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 22 }, { wch: 30 }, { wch: 20 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsPhotos, 'Photos Manifest');

      const fileName = `ZAYANI_B${building.building_number}_${activeSystem.replace(/\s+/g, '_')}_Inspection_Sheet.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      alert('Error generating Excel file: ' + err.message);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Hidden File Inputs for Cell Camera & Upload */}
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

      {/* Spreadsheet Header Toolbar */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>BUILDING {building.building_number} INSPECTION SPREADSHEET</span>
                <span className="text-xs bg-emerald-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase">
                  Excel Live Grid
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Photos automatically slot into their exact Floor, Flat, and Equipment cells.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* System Toggle Pills */}
          <div className="bg-slate-800 p-1 rounded-2xl border border-slate-700 flex items-center">
            <button
              onClick={() => setActiveSystem('Fire Alarm')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSystem === 'Fire Alarm'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🚨 Fire Alarm</span>
            </button>
            <button
              onClick={() => setActiveSystem('Fire Fighting')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSystem === 'Fire Fighting'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🧯 Fire Fighting</span>
            </button>
          </div>

          {/* Export Real Excel Sheet (.xlsx) */}
          <button
            onClick={handleExportExcelSpreadsheet}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer border border-emerald-400/30"
            title="Download formatted Excel Spreadsheet (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD EXCEL (.XLSX)</span>
          </button>
        </div>
      </div>

      {/* Progress & Quick Stats Bar */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Spreadsheet Progress:</span>
            <div className="w-32 bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300">
              <div 
                className={`h-full transition-all duration-500 ${completionPercentage === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="font-black text-slate-800">{completionPercentage}%</span>
          </div>

          <div className="text-slate-500 hidden md:inline">
            • <b className="text-slate-700">{filledSlots}</b> of <b className="text-slate-700">{totalSlots}</b> Photo Slots Completed
          </div>
        </div>

        {/* Filter / Search inside sheet */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Floor / Flat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Rows</option>
            <option value="completed">Has Photos</option>
            <option value="pending">Empty Only</option>
          </select>
        </div>
      </div>

      {/* SPREADSHEET TABLE GRID */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
              <th className="p-3 w-12 text-center border-r border-slate-200">#</th>
              <th className="p-3 w-28 border-r border-slate-200">Floor</th>
              <th className="p-3 w-36 border-r border-slate-200">
                {activeSystem === 'Fire Alarm' ? 'Flat Number' : 'Area / Location'}
              </th>
              
              {/* Dynamic Equipment Columns */}
              {activeColumns.map(col => (
                <th key={col.id} className="p-3 border-r border-slate-200 min-w-[150px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{col.icon}</span>
                    <div>
                      <div className="text-slate-800 font-extrabold">{col.short}</div>
                      <div className="text-[9px] text-slate-500 font-normal truncate max-w-[120px]">{col.label}</div>
                    </div>
                  </div>
                </th>
              ))}

              <th className="p-3 w-28 text-center">Row Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length + 4} className="p-8 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-sm text-slate-600">No matching flats or locations found</p>
                  <p className="text-xs text-slate-400 mt-1">Try clearing your search query or status filter.</p>
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                let rowTotalPhotos = 0;
                activeColumns.forEach(c => {
                  rowTotalPhotos += getCellPhotos(row, c.id).length;
                });

                return (
                  <tr key={row.id} className="hover:bg-blue-50/40 transition">
                    {/* Index */}
                    <td className="p-3 text-center font-bold text-slate-400 border-r border-slate-200 bg-slate-50/50">
                      {row.index}
                    </td>

                    {/* Floor */}
                    <td className="p-3 font-extrabold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-md text-[11px]">
                        {row.floorName}
                      </span>
                    </td>

                    {/* Flat / Area */}
                    <td className="p-3 font-black text-slate-900 border-r border-slate-200 whitespace-nowrap">
                      {activeSystem === 'Fire Alarm' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-black text-xs">
                            🏠
                          </span>
                          <span className="text-sm font-black text-slate-800">
                            {row.flatNumber !== '-' ? `Flat ${row.flatNumber}` : 'Common Area'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-blue-900">
                          {row.locationLabel}
                        </span>
                      )}
                    </td>

                    {/* Equipment Photo Cells */}
                    {activeColumns.map(col => {
                      const cellPhotos = getCellPhotos(row, col.id);
                      const hasPhoto = cellPhotos.length > 0;
                      const latestPhoto = cellPhotos[0];

                      return (
                        <td 
                          key={col.id} 
                          className={`p-2 border-r border-slate-200 align-top transition ${
                            hasPhoto ? 'bg-emerald-50/30' : 'bg-white'
                          }`}
                        >
                          {hasPhoto ? (
                            /* PHOTO IS PRESENT IN CELL */
                            <div className="group relative rounded-xl overflow-hidden border border-emerald-200 bg-white shadow-sm p-1">
                              {/* Photo Thumbnail */}
                              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-900">
                                <img
                                  src={latestPhoto.thumbnail_url || latestPhoto.url || (latestPhoto.data ? URL.createObjectURL(latestPhoto.data) : '')}
                                  alt={col.label}
                                  className="w-full h-full object-cover group-hover:scale-105 transition cursor-pointer"
                                  onClick={() => {
                                    if (cellPhotos.length === 1 && onOpenPhotoLightbox) {
                                      onOpenPhotoLightbox(latestPhoto);
                                    } else {
                                      setPreviewCellPhotos({
                                        title: `${row.locationLabel} - ${col.label}`,
                                        photos: cellPhotos,
                                        row,
                                        col
                                      });
                                    }
                                  }}
                                />

                                {/* Verified Badge */}
                                <div className="absolute top-1 left-1 bg-emerald-600/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>OK</span>
                                </div>

                                {/* Multi-photo count badge */}
                                {cellPhotos.length > 1 && (
                                  <div className="absolute bottom-1 right-1 bg-slate-900/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                    +{cellPhotos.length - 1} more
                                  </div>
                                )}
                              </div>

                              {/* Cell Controls */}
                              <div className="mt-1 flex items-center justify-between text-[10px] px-0.5">
                                <span className="text-slate-400 font-medium truncate max-w-[80px]">
                                  {latestPhoto.created_at ? new Date(latestPhoto.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Saved'}
                                </span>

                                <div className="flex items-center gap-1">
                                  {/* Quick Snap Another / Replace */}
                                  <button
                                    onClick={() => handleTriggerCellUpload(row, col, true)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition cursor-pointer"
                                    title="Snap additional / replace photo"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (onOpenPhotoLightbox) onOpenPhotoLightbox(latestPhoto);
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition cursor-pointer"
                                    title="View full size"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* EMPTY CELL: DIRECT 1-TAP SNAP BUTTON */
                            <div className="h-full min-h-[70px] border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-2 flex flex-col items-center justify-center gap-1 bg-slate-50/50 hover:bg-blue-50/50 transition group">
                              <div className="flex items-center gap-1">
                                {/* Camera Snap (Direct 1-tap) */}
                                <button
                                  onClick={() => handleTriggerCellUpload(row, col, true)}
                                  className="p-2 bg-white hover:bg-blue-600 text-slate-600 hover:text-white rounded-lg shadow-sm border border-slate-200 hover:border-blue-600 transition cursor-pointer active:scale-95"
                                  title="Open Camera to Snap Photo"
                                >
                                  <Camera className="w-4 h-4" />
                                </button>

                                {/* File Upload */}
                                <button
                                  onClick={() => handleTriggerCellUpload(row, col, false)}
                                  className="p-2 bg-white hover:bg-slate-700 text-slate-600 hover:text-white rounded-lg shadow-sm border border-slate-200 hover:border-slate-700 transition cursor-pointer active:scale-95"
                                  title="Upload from Gallery / Files"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                              </div>

                              <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 transition">
                                + Add Photo
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Row Summary Status */}
                    <td className="p-3 text-center align-middle whitespace-nowrap">
                      {rowTotalPhotos > 0 ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-black rounded-lg text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{rowTotalPhotos} Photo{rowTotalPhotos > 1 ? 's' : ''}</span>
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-lg text-[10px]">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cell Photo Details Modal (When multiple photos exist for one cell) */}
      {previewCellPhotos && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">{previewCellPhotos.title}</h3>
                <p className="text-xs text-slate-500">{previewCellPhotos.photos.length} Photos in this spreadsheet cell</p>
              </div>
              <button
                onClick={() => setPreviewCellPhotos(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4 max-h-[60vh] overflow-y-auto p-1">
              {previewCellPhotos.photos.map((p, idx) => (
                <div key={p.id || idx} className="relative rounded-xl overflow-hidden border border-slate-200 group bg-slate-900 aspect-square">
                  <img
                    src={p.thumbnail_url || p.url || (p.data ? URL.createObjectURL(p.data) : '')}
                    alt="Inspection"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-between p-2">
                    <button
                      onClick={() => {
                        setPreviewCellPhotos(null);
                        if (onOpenPhotoLightbox) onOpenPhotoLightbox(p);
                      }}
                      className="p-1.5 bg-white/90 rounded-lg text-slate-900 hover:bg-white text-xs font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-white font-medium">
                      {p.original_filename || `Photo #${idx+1}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const { row, col } = previewCellPhotos;
                  setPreviewCellPhotos(null);
                  handleTriggerCellUpload(row, col, true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Add Another Photo Here</span>
              </button>

              <button
                onClick={() => setPreviewCellPhotos(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploading Spinner Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold text-slate-800">Auto-adjusting photo into spreadsheet cell...</span>
          </div>
        </div>
      )}
    </div>
  );
}
