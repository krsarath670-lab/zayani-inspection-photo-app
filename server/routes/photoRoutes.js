const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const storageManager = require('../storageManager');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

// GET /api/photos - List photos with filters
router.get('/', authMiddleware, (req, res) => {
    const {
        building_id,
        system_type,
        location_type,
        floor_name,
        flat_number,
        area_name,
        equipment_type,
        search
    } = req.query;

    let query = `
        SELECT p.*, b.building_number, b.location 
        FROM photos p 
        JOIN buildings b ON p.building_id = b.id
        WHERE 1=1
    `;
    const params = [];

    if (building_id) {
        query += ` AND p.building_id = ?`;
        params.push(building_id);
    }
    if (system_type && system_type !== 'all') {
        query += ` AND p.system_type = ?`;
        params.push(system_type);
    }
    if (location_type) {
        query += ` AND p.location_type = ?`;
        params.push(location_type);
    }
    if (floor_name && floor_name !== 'all') {
        query += ` AND p.floor_name = ?`;
        params.push(floor_name);
    }
    if (flat_number && flat_number !== 'all') {
        query += ` AND p.flat_number = ?`;
        params.push(flat_number);
    }
    if (area_name && area_name !== 'all') {
        query += ` AND p.area_name = ?`;
        params.push(area_name);
    }
    if (equipment_type && equipment_type !== 'all') {
        query += ` AND p.equipment_type = ?`;
        params.push(equipment_type);
    }
    if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query += ` AND (p.description LIKE ? OR p.stored_filename LIKE ? OR p.equipment_type LIKE ? OR p.flat_number LIKE ?)`;
        params.push(term, term, term, term);
    }

    query += ` ORDER BY p.created_at DESC`;
    const photos = db.prepare(query).all(...params);
    res.json({ photos });
});

// GET /api/photos/:id/file - Stream photo securely
router.get('/:id/file', authMiddleware, (req, res) => {
    const { id } = req.params;
    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    const fullPath = path.isAbsolute(photo.storage_path) ? photo.storage_path : path.join(__dirname, '..', photo.storage_path);
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'Photo file missing on disk' });
    }

    res.setHeader('Content-Type', photo.mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(fullPath).pipe(res);
});

// Photo upload handler with smart fallbacks
async function handlePhotoUpload(req, res) {
    try {
        const body = req.body || {};
        
        // Smart system type fallback
        let systemType = body.system_type || body.category || 'Fire Alarm';
        if (systemType.toLowerCase().includes('alarm')) {
            systemType = 'Fire Alarm';
        } else if (systemType.toLowerCase().includes('fight') || systemType.toLowerCase().includes('extinguisher')) {
            systemType = 'Fire Fighting';
        }

        // Smart equipment type fallback
        let equipmentType = body.equipment_type;
        if (!equipmentType) {
            equipmentType = systemType === 'Fire Fighting' ? 'Extinguisher' : 'Detector';
        }

        // Smart floor and flat fallbacks
        const floorName = body.floor_name || body.floor || 'Floor 1';
        const flatNumber = body.flat_number || body.flat_no || null;
        const areaName = body.area_name || null;
        const locationType = body.location_type || (flatNumber ? 'Flats' : (areaName ? 'Areas' : 'Floors'));
        const description = body.description || body.caption || `${equipmentType} inspected at ${floorName}${flatNumber ? ` Flat ${flatNumber}` : ''}`;

        // Building lookup
        let buildingId = body.building_id;
        let building = null;

        if (buildingId) {
            building = db.prepare('SELECT * FROM buildings WHERE id = ? OR building_number = ?').get(buildingId, buildingId);
        }

        if (!building) {
            // Pick first building if only one exists or fallback
            building = db.prepare('SELECT * FROM buildings ORDER BY created_at DESC LIMIT 1').get();
        }

        if (!building) {
            return res.status(400).json({ error: 'Please create a building first before uploading photos.' });
        }

        const files = req.files || (req.file ? [req.file] : []);
        if (files.length === 0) {
            return res.status(400).json({ error: 'No photo files attached' });
        }

        const savedPhotos = [];
        for (const file of files) {
            const saved = await storageManager.saveInspectionPhoto({
                buffer: file.buffer,
                originalFilename: file.originalname || 'photo.jpg',
                buildingId: building.id,
                buildingNumber: building.building_number,
                systemType: systemType,
                locationType: locationType,
                floorId: body.floor_id || null,
                floorName: floorName,
                flatId: body.flat_id || null,
                flatNumber: flatNumber,
                areaId: body.area_id || null,
                areaName: areaName,
                equipmentType: equipmentType,
                description: description,
                uploadedBy: req.user ? req.user.name : 'Inspector',
                uploadedByUserId: req.user ? req.user.id : null
            });
            savedPhotos.push(saved);
        }

        res.status(201).json({
            message: `Successfully uploaded and auto-organized ${savedPhotos.length} photo(s)`,
            photos: savedPhotos,
            photo: savedPhotos[0]
        });
    } catch (err) {
        console.error('Photo save error:', err);
        res.status(500).json({ error: 'Photo upload failed: ' + err.message });
    }
}

// Support both POST /api/photos/upload and POST /api/photos
router.post('/upload', authMiddleware, upload.any(), handlePhotoUpload);
router.post('/', authMiddleware, upload.any(), handlePhotoUpload);

// DELETE /api/photos/:id - Delete photo
router.delete('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    const fullPath = path.isAbsolute(photo.storage_path) ? photo.storage_path : path.join(__dirname, '..', photo.storage_path);
    try {
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (e) {}

    db.prepare('DELETE FROM photos WHERE id = ?').run(id);
    res.json({ message: 'Photo deleted successfully' });
});

module.exports = router;
