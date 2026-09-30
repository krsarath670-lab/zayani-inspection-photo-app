import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  FolderArchive, 
  Tag, 
  Trash2, 
  Eye, 
  X, 
  Check, 
  Download,
  Calendar,
  Layers,
  Edit2
} from 'lucide-react';
import { apiRequest, compressImage } from '../api';

export default function PhotoHub({ onSelectBuilding, onOpenImportZip }) {
  const [photos, setPhotos] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  
  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    building_id: '',
    category: 'Inspection',
    floor: '',
    flat_no: '',
    caption: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Photo viewer lightbox
  const [activePhoto, setActivePhoto] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [photoEditData, setPhotoEditData] = useState({});

  const categories = [
    'Before',
    'During',
    'After',
    'Inspection',
    'Completed Work',
    'Fire Alarm',
    'Fire Fighting',
    'Common Area',
    'Flats',
    'Fire Alarm Panel',
    'Elevator',
    'Other'
  ];

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedBuildingId) params.append('building_id', selectedBuildingId);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      const res = await apiRequest(`/photos?${params.toString()}`);
      setPhotos(res.photos || []);
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
    fetchBuildings();
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [selectedBuildingId, selectedCategory]);

  const handleFilesChosen = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    // Compress on client before uploading for mobile speed
    const compressed = [];
    for (const f of rawFiles) {
      const comp = await compressImage(f, 1920, 0.85);
      compressed.push(comp);
    }
    setSelectedFiles(compressed);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFormData.building_id) {
      alert('Please select a building.');
      return;
    }
    if (selectedFiles.length === 0) {
      alert('Please choose at least one photo.');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      const systemType = uploadFormData.category === 'Fire Fighting' ? 'Fire Fighting' : 'Fire Alarm';
      const equipmentType = uploadFormData.equipment_type || (systemType === 'Fire Fighting' ? 'Extinguisher' : 'Detector');

      fd.append('building_id', uploadFormData.building_id);
      fd.append('system_type', systemType);
      fd.append('category', uploadFormData.category);
      fd.append('equipment_type', equipmentType);
      fd.append('floor_name', uploadFormData.floor ? `Floor ${uploadFormData.floor}` : 'Floor 1');
      if (uploadFormData.floor) fd.append('floor', uploadFormData.floor);
      if (uploadFormData.flat_no) {
        fd.append('flat_number', uploadFormData.flat_no);
        fd.append('flat_no', uploadFormData.flat_no);
      }
      if (uploadFormData.caption) {
        fd.append('description', uploadFormData.caption);
        fd.append('caption', uploadFormData.caption);
      }

      selectedFiles.forEach((f) => {
        fd.append('photos', f);
      });

      await apiRequest('/photos/upload', {
        method: 'POST',
        body: fd
      });

      setIsUploadModalOpen(false);
      setSelectedFiles([]);
      fetchPhotos();
      alert('Photos uploaded and auto-organized successfully!');
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      await apiRequest(`/photos/${photoId}`, { method: 'DELETE' });
      setActivePhoto(null);
      fetchPhotos();
    } catch (e) {
      alert('Failed to delete photo: ' + e.message);
    }
  };

  const handleSavePhotoEdit = async () => {
    if (!activePhoto) return;
    try {
      await apiRequest(`/photos/${activePhoto.id}`, {
        method: 'PUT',
        body: JSON.stringify(photoEditData)
      });
      setActivePhoto({ ...activePhoto, ...photoEditData });
      setEditingPhoto(false);
      fetchPhotos();
    } catch (e) {
      alert('Failed to update photo: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">PHOTO HUB</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic Logical Photo Cataloging: <code className="text-blue-600 font-mono">ZAYANI / Building / Year / Maintenance / Category</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImportZip}
            className="px-3.5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FolderArchive className="w-4 h-4" />
            <span>Import ZIP Archive</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>+ Take / Upload Photos</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Building Filter */}
        <div className="flex items-center gap-2 flex-1">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
          >
            <option value="">All ZAYANI Buildings ({buildings.length})</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                Building {b.building_number} — {b.location}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Photos Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading Photos...
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Camera className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Photos Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Upload field maintenance photos or import an existing building photo archive.
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-700 transition cursor-pointer"
          >
            + Upload Photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {photos.map((p) => {
            const token = localStorage.getItem('zayani_token');
            const srcUrl = `/api/photos/${p.id}/file?token=${token}`;
            return (
              <div
                key={p.id}
                onClick={() => {
                  setActivePhoto(p);
                  setPhotoEditData({
                    caption: p.caption || '',
                    category: p.category || 'Inspection',
                    floor: p.floor || '',
                    flat_no: p.flat_no || ''
                  });
                  setEditingPhoto(false);
                }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-blue-500 transition cursor-pointer group flex flex-col justify-between"
              >
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  <img
                    src={srcUrl}
                    alt={p.caption || p.stored_filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                    B-{p.building_number}
                  </div>
                  <div className="absolute bottom-2 left-2 bg-blue-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                    {p.category}
                  </div>
                </div>

                <div className="p-2.5 space-y-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {p.floor ? `Floor ${p.floor}` : ''} {p.flat_no ? `Flat ${p.flat_no}` : ''} {(!p.floor && !p.flat_no) ? (p.caption || p.category) : ''}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate" title={p.stored_filename}>
                    {p.stored_filename}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* UPLOAD / CAMERA MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">ADD MAINTENANCE PHOTOS</h3>
                  <p className="text-[11px] text-slate-400">Automatic safe filename & folder organization</p>
                </div>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Building <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={uploadFormData.building_id}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, building_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="">-- Choose Building --</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      Building {b.building_number} — {b.location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={uploadFormData.category}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Floor (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1, 2, 3, 4, GF"
                    value={uploadFormData.floor}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, floor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Flat No. (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 11, 12, 13, 14..."
                  value={uploadFormData.flat_no}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, flat_no: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Caption / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Smoke detector tested in bedroom"
                  value={uploadFormData.caption}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, caption: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              {/* File Input Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Choose Photo(s) / Camera <span className="text-rose-600">*</span>
                </label>
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition">
                  <Camera className="w-8 h-8 text-blue-600" />
                  <span className="text-xs font-bold text-slate-700">
                    Click to Take Photo or Select from Gallery
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Supports multiple photos (JPEG, PNG, WebP with auto-compression)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFilesChosen}
                    className="hidden"
                  />
                </label>

                {selectedFiles.length > 0 && (
                  <div className="mt-2 text-xs font-bold text-emerald-600">
                    ✓ {selectedFiles.length} photo(s) selected and compressed for upload
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? 'Uploading & Organizing...' : `+ Upload ${selectedFiles.length || ''} Photos`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col my-8">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-blue-400 uppercase">
                  Building {activePhoto.building_number} • {activePhoto.location}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {activePhoto.stored_filename}
                </div>
              </div>
              <button onClick={() => setActivePhoto(null)} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 bg-black flex items-center justify-center max-h-[55vh]">
              <img
                src={`/api/photos/${activePhoto.id}/file?token=${localStorage.getItem('zayani_token')}`}
                alt={activePhoto.caption}
                className="max-h-[50vh] max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="p-5 space-y-4 bg-slate-900 border-t border-slate-800">
              {editingPhoto ? (
                <div className="space-y-3 bg-slate-800/80 p-4 rounded-2xl">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Category</label>
                      <select
                        value={photoEditData.category}
                        onChange={(e) => setPhotoEditData({ ...photoEditData, category: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-700 text-white rounded-lg outline-none"
                      >
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Floor</label>
                      <input
                        type="text"
                        value={photoEditData.floor}
                        onChange={(e) => setPhotoEditData({ ...photoEditData, floor: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-700 text-white rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Flat No</label>
                      <input
                        type="text"
                        value={photoEditData.flat_no}
                        onChange={(e) => setPhotoEditData({ ...photoEditData, flat_no: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-700 text-white rounded-lg outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Caption</label>
                    <input
                      type="text"
                      value={photoEditData.caption}
                      onChange={(e) => setPhotoEditData({ ...photoEditData, caption: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-700 text-white rounded-lg outline-none text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingPhoto(false)}
                      className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePhotoEdit}
                      className="px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-sm text-white">
                      {activePhoto.caption || 'No custom caption'}
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Category: <b className="text-blue-400">{activePhoto.category}</b> • {activePhoto.floor ? `Floor ${activePhoto.floor}` : ''} {activePhoto.flat_no ? `Flat ${activePhoto.flat_no}` : ''}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Uploaded by: {activePhoto.uploaded_by || 'System'} on {activePhoto.created_at}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPhoto(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                    <button
                      onClick={() => handleDeletePhoto(activePhoto.id)}
                      className="px-3 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
