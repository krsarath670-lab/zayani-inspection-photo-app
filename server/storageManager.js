const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
let sharp = null;
try {
    sharp = require('sharp');
} catch (e) {
    console.warn('Optional native image library sharp not available, using raw buffer mode.');
}

const STORAGE_ROOT = path.join(__dirname, '..', 'storage', 'ZAYANI');

if (!fs.existsSync(STORAGE_ROOT)) {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

function sanitize(str) {
    return (str || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function cleanEquipmentTag(eq) {
    const upper = (eq || '').toUpperCase().trim();
    if (upper.includes('BREAK') || upper.includes('BG')) return 'BG';
    if (upper.includes('DETECTOR')) return 'DETECTOR';
    if (upper.includes('PANEL')) return 'PANEL';
    if (upper.includes('EXTINGUISHER')) return 'EXTINGUISHER';
    if (upper.includes('HOSE') || upper.includes('REEL')) return 'HOSE-REEL';
    if (upper.includes('RISER')) return 'WET-RISER';
    if (upper.includes('EXIT') || upper.includes('LIGHT')) return 'EXIT-LIGHT';
    return sanitize(upper) || 'EQUIPMENT';
}

function getFloorTag(floorName) {
    if (!floorName) return 'F1';
    const match = floorName.match(/\d+/);
    if (match) return `F${match[0]}`;
    const upper = floorName.toUpperCase();
    if (upper.includes('GROUND') || upper === 'GF') return 'GF';
    if (upper.includes('BASEMENT') || upper === 'B1') return 'B1';
    if (upper.includes('ROOF')) return 'ROOF';
    return sanitize(floorName).toUpperCase();
}

function getPhysicalStorageDirectory({
    buildingNumber,
    systemType, // 'Fire Alarm' | 'Fire Fighting'
    locationType, // 'Flats' | 'Floors' | 'Areas'
    floorName,
    flatNumber,
    areaName,
    equipmentType
}) {
    const bldFolder = `Building ${buildingNumber}`;
    const sysFolder = systemType === 'Fire Alarm' ? 'Fire Alarm' : 'Fire Fighting';

    let subFolders = [];
    if (systemType === 'Fire Alarm') {
        if (locationType === 'Flats') {
            subFolders = ['Flats', floorName || 'Floor 1', `Flat ${flatNumber || '11'}`, equipmentType || 'Detector'];
        } else {
            subFolders = ['Floors', floorName || 'Floor 1', equipmentType || 'Detector'];
        }
    } else {
        // Fire Fighting (Floor or Area, NO flats)
        if (locationType === 'Areas' || areaName) {
            subFolders = ['Floors', areaName || 'Parking B1', equipmentType || 'Extinguisher'];
        } else {
            subFolders = ['Floors', floorName || 'Floor 1', equipmentType || 'Extinguisher'];
        }
    }

    const fullDirPath = path.join(STORAGE_ROOT, bldFolder, sysFolder, ...subFolders);
    if (!fs.existsSync(fullDirPath)) {
        fs.mkdirSync(fullDirPath, { recursive: true });
    }
    return fullDirPath;
}

function generateSafeFilename({
    buildingNumber,
    systemType,
    locationType,
    floorName,
    flatNumber,
    areaName,
    equipmentType,
    index = 1,
    ext = '.jpg'
}) {
    const sysTag = systemType === 'Fire Alarm' ? 'FA' : 'FF';
    const eqTag = cleanEquipmentTag(equipmentType);
    const idxStr = String(index).padStart(3, '0');

    if (systemType === 'Fire Alarm') {
        if (locationType === 'Flats' && flatNumber) {
            const flrTag = getFloorTag(floorName);
            return `ZAY-B${buildingNumber}-${sysTag}-${flrTag}-FLAT${flatNumber}-${eqTag}-${idxStr}${ext}`;
        } else {
            const flrTag = getFloorTag(floorName);
            return `ZAY-B${buildingNumber}-${sysTag}-${flrTag}-${eqTag}-${idxStr}${ext}`;
        }
    } else {
        // Fire Fighting
        if (locationType === 'Areas' || areaName) {
            const safeArea = sanitize(areaName || 'AREA').toUpperCase().replace(/_/g, '-');
            return `ZAY-B${buildingNumber}-${sysTag}-${safeArea}-${eqTag}-${idxStr}${ext}`;
        } else {
            const flrTag = getFloorTag(floorName);
            return `ZAY-B${buildingNumber}-${sysTag}-${flrTag}-${eqTag}-${idxStr}${ext}`;
        }
    }
}

async function saveInspectionPhoto({
    buffer,
    originalFilename = 'photo.jpg',
    buildingId,
    buildingNumber,
    systemType,
    locationType,
    floorId = null,
    floorName = null,
    flatId = null,
    flatNumber = null,
    areaId = null,
    areaName = null,
    equipmentType,
    description = '',
    uploadedBy = 'Technician',
    uploadedByUserId = null,
    dbInstance = null
}) {
    const db = dbInstance || require('./db').db;

    // Determine next sequential index
    let countQuery = `
        SELECT COUNT(*) as count FROM photos 
        WHERE building_id = ? AND system_type = ? AND equipment_type = ?
    `;
    const params = [buildingId, systemType, equipmentType];

    if (flatNumber) {
        countQuery += ` AND flat_number = ?`;
        params.push(flatNumber);
    } else if (floorName) {
        countQuery += ` AND floor_name = ?`;
        params.push(floorName);
    } else if (areaName) {
        countQuery += ` AND area_name = ?`;
        params.push(areaName);
    }

    const countRow = db.prepare(countQuery).get(...params);
    const nextIdx = (countRow ? countRow.count : 0) + 1;

    const targetDir = getPhysicalStorageDirectory({
        buildingNumber,
        systemType,
        locationType,
        floorName,
        flatNumber,
        areaName,
        equipmentType
    });

    const storedFilename = generateSafeFilename({
        buildingNumber,
        systemType,
        locationType,
        floorName,
        flatNumber,
        areaName,
        equipmentType,
        index: nextIdx,
        ext: '.jpg'
    });

    const targetFilePath = path.join(targetDir, storedFilename);

    // Compress with Sharp
    let processedBuffer = buffer;
    try {
        processedBuffer = await sharp(buffer)
            .rotate()
            .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 82, progressive: true })
            .toBuffer();
    } catch (e) {
        console.warn('Sharp compression fallback:', e.message);
    }

    fs.writeFileSync(targetFilePath, processedBuffer);

    const photoId = 'pht-' + uuidv4();
    const relStoragePath = path.relative(path.join(__dirname, '..'), targetFilePath).replace(/\\/g, '/');

    db.prepare(`
        INSERT INTO photos (
            id, building_id, system_type, location_type, floor_id, floor_name,
            flat_id, flat_number, area_id, area_name, equipment_type, description,
            original_filename, stored_filename, storage_path, file_size, photo_number,
            uploaded_by, uploaded_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        photoId,
        buildingId,
        systemType,
        locationType,
        floorId,
        floorName,
        flatId,
        flatNumber,
        areaId,
        areaName,
        equipmentType,
        description,
        originalFilename,
        storedFilename,
        relStoragePath,
        processedBuffer.length,
        nextIdx,
        uploadedBy,
        uploadedByUserId
    );

    return {
        id: photoId,
        buildingId,
        buildingNumber,
        systemType,
        locationType,
        floorName,
        flatNumber,
        areaName,
        equipmentType,
        storedFilename,
        storagePath: relStoragePath,
        description,
        fileSize: processedBuffer.length
    };
}

module.exports = {
    STORAGE_ROOT,
    saveInspectionPhoto,
    getPhysicalStorageDirectory,
    generateSafeFilename
};
