const { ZipArchive } = require('archiver');
const path = require('path');
const fs = require('fs');
const { db } = require('./db');

function createBuildingZipStream({
    buildingId,
    systemType = null,
    floorName = null,
    flatNumber = null,
    areaName = null,
    equipmentType = null
}) {
    const building = db.prepare('SELECT * FROM buildings WHERE id = ? OR building_number = ?').get(buildingId, buildingId);
    if (!building) throw new Error('Building not found');

    let query = `SELECT * FROM photos WHERE building_id = ?`;
    const params = [building.id];

    if (systemType) {
        query += ` AND system_type = ?`;
        params.push(systemType);
    }
    if (floorName) {
        query += ` AND floor_name = ?`;
        params.push(floorName);
    }
    if (flatNumber) {
        query += ` AND flat_number = ?`;
        params.push(flatNumber);
    }
    if (areaName) {
        query += ` AND area_name = ?`;
        params.push(areaName);
    }
    if (equipmentType) {
        query += ` AND equipment_type = ?`;
        params.push(equipmentType);
    }

    const photos = db.prepare(query).all(...params);

    const archive = new ZipArchive({
        zlib: { level: 9 }
    });

    // Add each photo with proper folder path inside ZIP
    const bldFolder = `Building ${building.building_number}`;

    photos.forEach((p) => {
        const diskPath = path.isAbsolute(p.storage_path) ? p.storage_path : path.join(__dirname, '..', p.storage_path);
        if (fs.existsSync(diskPath)) {
            let zipInnerPath;
            if (p.system_type === 'Fire Alarm') {
                if (p.location_type === 'Flats') {
                    zipInnerPath = path.posix.join(bldFolder, 'Fire Alarm', 'Flats', p.floor_name || 'Floor 1', `Flat ${p.flat_number || '11'}`, p.equipment_type || 'Detector', p.stored_filename);
                } else {
                    zipInnerPath = path.posix.join(bldFolder, 'Fire Alarm', 'Floors', p.floor_name || 'Floor 1', p.equipment_type || 'Detector', p.stored_filename);
                }
            } else {
                // Fire Fighting
                if (p.location_type === 'Areas' || p.area_name) {
                    zipInnerPath = path.posix.join(bldFolder, 'Fire Fighting', 'Floors', p.area_name || 'Parking B1', p.equipment_type || 'Extinguisher', p.stored_filename);
                } else {
                    zipInnerPath = path.posix.join(bldFolder, 'Fire Fighting', 'Floors', p.floor_name || 'Floor 1', p.equipment_type || 'Extinguisher', p.stored_filename);
                }
            }

            archive.file(diskPath, { name: zipInnerPath });
        }
    });

    return {
        archive,
        photoCount: photos.length,
        buildingNumber: building.building_number
    };
}

module.exports = {
    createBuildingZipStream
};
