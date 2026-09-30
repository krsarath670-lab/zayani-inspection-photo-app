// Offline-first IndexedDB storage for ZAYANI Inspection Photo App
// Enables full mobile & desktop functionality even when server/laptop is switched off!

import JSZip from 'jszip';

const DB_NAME = 'zayani_inspection_offline_db';
const DB_VERSION = 1;

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Buildings store
        if (!db.objectStoreNames.contains('buildings')) {
          const bldStore = db.createObjectStore('buildings', { keyPath: 'id' });
          bldStore.createIndex('building_number', 'building_number', { unique: false });
        }

        // Photos store
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('building_id', 'building_id', { unique: false });
          photoStore.createIndex('system_type', 'system_type', { unique: false });
          photoStore.createIndex('created_at', 'created_at', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        const db = e.target.result;
        resolve(db);
      };

      request.onerror = (e) => {
        console.error('IndexedDB open error:', e);
        reject(e);
      };
    });
  }
  return dbPromise;
}

// Clear all offline buildings & photos
export async function clearAllOfflineBuildings() {
  const db = await getDb();
  return new Promise((resolve) => {
    const tx = db.transaction(['buildings', 'photos'], 'readwrite');
    tx.objectStore('buildings').clear();
    tx.objectStore('photos').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// Delete single offline building
export async function deleteOfflineBuilding(buildingId) {
  const db = await getDb();
  return new Promise((resolve) => {
    const tx = db.transaction(['buildings', 'photos'], 'readwrite');
    tx.objectStore('buildings').delete(buildingId);
    
    // Also remove associated photos
    const photoStore = tx.objectStore('photos');
    const photoReq = photoStore.getAll();
    photoReq.onsuccess = () => {
      const photos = photoReq.result || [];
      photos.forEach(p => {
        if (p.building_id === buildingId) photoStore.delete(p.id);
      });
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// Get all buildings with computed stats
export async function getOfflineBuildings() {
  const db = await getDb();
  return new Promise((resolve) => {
    const tx = db.transaction(['buildings', 'photos'], 'readonly');
    const bldStore = tx.objectStore('buildings');
    const photoStore = tx.objectStore('photos');

    const bldReq = bldStore.getAll();
    const photoReq = photoStore.getAll();

    tx.oncomplete = () => {
      const buildings = bldReq.result || [];
      const photos = photoReq.result || [];

      const enriched = buildings.map((b) => {
        const bldPhotos = photos.filter((p) => p.building_id === b.id);
        const faPhotos = bldPhotos.filter((p) => p.system_type === 'Fire Alarm');
        const ffPhotos = bldPhotos.filter((p) => p.system_type === 'Fire Fighting');
        const allFlats = (b.floors || []).flatMap((f) => f.flats || []);

        return {
          ...b,
          floor_count: (b.floors || []).length,
          flat_count: allFlats.length,
          area_count: (b.areas || []).length,
          photo_count: bldPhotos.length,
          fa_photo_count: faPhotos.length,
          ff_photo_count: ffPhotos.length,
          last_photo_date: bldPhotos.length > 0 ? bldPhotos[bldPhotos.length - 1].created_at : null
        };
      });

      resolve(enriched);
    };
    tx.onerror = () => resolve([]);
  });
}

// Get single building details with its photos
export async function getOfflineBuildingDetail(buildingId) {
  const db = await getDb();
  return new Promise((resolve) => {
    const tx = db.transaction(['buildings', 'photos'], 'readonly');
    const bldStore = tx.objectStore('buildings');
    const photoStore = tx.objectStore('photos');

    const bldReq = bldStore.get(buildingId);
    const photoReq = photoStore.getAll();

    tx.oncomplete = () => {
      let bld = bldReq.result;
      if (!bld) {
        // Search by building number
        const allBlds = tx.objectStore('buildings').getAll();
      }
      const allPhotos = photoReq.result || [];
      const bldPhotos = allPhotos.filter((p) => p.building_id === buildingId || (bld && p.building_number === bld.building_number));

      resolve({
        building: bld,
        floors: bld ? bld.floors || [] : [],
        areas: bld ? bld.areas || [] : [],
        photos: bldPhotos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      });
    };
    tx.onerror = () => resolve({ building: null, floors: [], areas: [], photos: [] });
  });
}

// Save a new building offline
export async function saveOfflineBuilding(buildingData) {
  const db = await getDb();
  const id = 'bld-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const newBld = {
    id,
    ...buildingData,
    created_at: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['buildings'], 'readwrite');
    const store = tx.objectStore('buildings');
    const req = store.put(newBld);
    req.onsuccess = () => resolve(newBld);
    req.onerror = (e) => reject(e);
  });
}

// Generate Safe Filename according to standard spec
export function generateSafeOfflineFilename({
  buildingNumber,
  systemType,
  locationType,
  floorName,
  flatNumber,
  areaName,
  equipmentType,
  index = 1
}) {
  const sysTag = systemType === 'Fire Alarm' ? 'FA' : 'FF';
  const eqTag = (equipmentType || 'EQUIPMENT').toUpperCase().replace(/[^A-Z0-9]/g, '-');
  const idxStr = String(index).padStart(3, '0');

  const sanitize = (s) => (s || '').trim().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');

  const getFloorTag = (flr) => {
    if (!flr) return 'GF';
    const l = flr.toLowerCase();
    if (l.includes('ground')) return 'GF';
    if (l.includes('roof')) return 'ROOF';
    if (l.includes('basement')) return 'BASEMENT';
    if (l.includes('parking')) return sanitize(flr).toUpperCase();
    const m = flr.match(/\d+/);
    return m ? `F${m[0]}` : sanitize(flr).toUpperCase();
  };

  if (systemType === 'Fire Alarm') {
    if (locationType === 'Flats' && flatNumber) {
      const flrTag = getFloorTag(floorName);
      const flatTag = `FLAT${sanitize(flatNumber)}`;
      return `ZAY-B${buildingNumber}-${sysTag}-${flrTag}-${flatTag}-${eqTag}-${idxStr}.jpg`;
    } else {
      const flrTag = getFloorTag(floorName);
      return `ZAY-B${buildingNumber}-${sysTag}-${flrTag}-${eqTag}-${idxStr}.jpg`;
    }
  } else {
    // Fire Fighting (strictly no flats)
    if (locationType === 'Areas' || areaName) {
      const safeArea = sanitize(areaName || 'AREA').toUpperCase();
      return `ZAY-B${buildingNumber}-${sysTag}-${safeArea}-${eqTag}-${idxStr}.jpg`;
    } else {
      const flrTag = getFloorTag(floorName);
      return `ZAY-B${buildingNumber}-${sysTag}-${flrTag}-${eqTag}-${idxStr}.jpg`;
    }
  }
}

// Save Inspection Photo Offline (Blob / Base64)
export async function saveOfflinePhoto(photoData) {
  const db = await getDb();

  return new Promise(async (resolve, reject) => {
    const tx = db.transaction(['photos'], 'readwrite');
    const store = tx.objectStore('photos');

    // Count existing to determine index
    const allReq = store.getAll();
    allReq.onsuccess = async () => {
      const allPhotos = allReq.result || [];
      const matchCount = allPhotos.filter(
        (p) =>
          p.building_id === photoData.buildingId &&
          p.system_type === photoData.systemType &&
          p.equipment_type === photoData.equipmentType &&
          (photoData.flatNumber ? p.flat_number === photoData.flatNumber : true)
      ).length;

      const nextIdx = matchCount + 1;
      const storedFilename = generateSafeOfflineFilename({
        buildingNumber: photoData.buildingNumber,
        systemType: photoData.systemType,
        locationType: photoData.locationType,
        floorName: photoData.floorName,
        flatNumber: photoData.flatNumber,
        areaName: photoData.areaName,
        equipmentType: photoData.equipmentType,
        index: nextIdx
      });

      // Convert Blob / File to base64 for persistent IndexedDB storage
      let dataUrl = photoData.previewUrl;
      if (!dataUrl && photoData.file) {
        dataUrl = await fileToDataUrl(photoData.file);
      }

      const photoRecord = {
        id: 'pht-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        building_id: photoData.buildingId,
        building_number: photoData.buildingNumber,
        system_type: photoData.systemType,
        location_type: photoData.locationType,
        floor_id: photoData.floorId || null,
        floor_name: photoData.floorName || null,
        flat_id: photoData.flatId || null,
        flat_number: photoData.flatNumber || null,
        area_id: photoData.areaId || null,
        area_name: photoData.areaName || null,
        equipment_type: photoData.equipmentType,
        description: photoData.description || '',
        stored_filename: storedFilename,
        data_url: dataUrl,
        created_at: new Date().toISOString(),
        uploaded_by: photoData.uploadedBy || 'Inspector',
        sync_status: 'local'
      };

      const putReq = store.put(photoRecord);
      putReq.onsuccess = () => resolve(photoRecord);
      putReq.onerror = (e) => reject(e);
    };
    allReq.onerror = (e) => reject(e);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Generate structured ZIP file client-side (works 100% offline with zero server!)
export async function generateClientZip({ buildingId, buildingNumber, systemType = null, floorName = null }) {
  const db = await getDb();
  const zip = new JSZip();

  return new Promise(async (resolve, reject) => {
    try {
      const tx = db.transaction(['buildings', 'photos'], 'readonly');
      const bldReq = tx.objectStore('buildings').get(buildingId);
      const photoReq = tx.objectStore('photos').getAll();

      tx.oncomplete = async () => {
        const bld = bldReq.result || { building_number: buildingNumber || '320' };
        let photos = photoReq.result || [];

        photos = photos.filter((p) => p.building_id === buildingId || p.building_number === bld.building_number);
        if (systemType && systemType !== 'all') {
          photos = photos.filter((p) => p.system_type === systemType);
        }
        if (floorName && floorName !== 'all') {
          photos = photos.filter((p) => p.floor_name === floorName);
        }

        const bldFolder = zip.folder(`Building ${bld.building_number}`);

        for (const p of photos) {
          let zipPath = '';
          if (p.system_type === 'Fire Alarm') {
            if (p.location_type === 'Flats' && p.flat_number) {
              zipPath = `Fire Alarm/Flats/${p.floor_name || 'Floor 1'}/Flat ${p.flat_number}/${p.equipment_type || 'Detector'}/${p.stored_filename}`;
            } else {
              zipPath = `Fire Alarm/Floors/${p.floor_name || 'Floor 1'}/${p.equipment_type || 'Detector'}/${p.stored_filename}`;
            }
          } else {
            // Fire Fighting
            if (p.location_type === 'Areas' || p.area_name) {
              zipPath = `Fire Fighting/Floors/${p.area_name || 'Parking B1'}/${p.equipment_type || 'Extinguisher'}/${p.stored_filename}`;
            } else {
              zipPath = `Fire Fighting/Floors/${p.floor_name || 'Floor 1'}/${p.equipment_type || 'Extinguisher'}/${p.stored_filename}`;
            }
          }

          // Extract base64 image data
          if (p.data_url) {
            const base64Data = p.data_url.split(',')[1] || p.data_url;
            bldFolder.file(zipPath, base64Data, { base64: true });
          } else {
            // Fallback placeholder text file if image url not loaded
            bldFolder.file(zipPath + '.txt', `Photo: ${p.stored_filename}\nDescription: ${p.description}\nTime: ${p.created_at}`);
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        resolve(zipBlob);
      };

      tx.onerror = (e) => reject(e);
    } catch (err) {
      reject(err);
    }
  });
}
