const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const { createBuildingZipStream } = require('../zipExporter');

// GET /api/buildings - List all buildings with stats
router.get('/', authMiddleware, (req, res) => {
    const { search } = req.query;
    let query = `
        SELECT 
            b.*,
            (SELECT COUNT(*) FROM floors f WHERE f.building_id = b.id) as floor_count,
            (SELECT COUNT(*) FROM flats fl WHERE fl.building_id = b.id) as flat_count,
            (SELECT COUNT(*) FROM areas a WHERE a.building_id = b.id) as area_count,
            (SELECT COUNT(*) FROM photos p WHERE p.building_id = b.id) as total_photos,
            (SELECT COUNT(*) FROM photos p WHERE p.building_id = b.id AND p.system_type = 'Fire Alarm') as fire_alarm_photos,
            (SELECT COUNT(*) FROM photos p WHERE p.building_id = b.id AND p.system_type = 'Fire Fighting') as fire_fighting_photos,
            (SELECT MAX(created_at) FROM photos p WHERE p.building_id = b.id) as last_photo_date
        FROM buildings b
        WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query += ` AND (b.building_number LIKE ? OR b.location LIKE ? OR b.road LIKE ? OR b.block LIKE ? OR b.building_name LIKE ?)`;
        params.push(term, term, term, term, term);
    }

    query += ` ORDER BY b.building_number ASC`;

    const buildings = db.prepare(query).all(...params);
    res.json({ buildings });
});

// GET /api/buildings/:id - Detail view with floors, flats, areas, and photo breakdown
router.get('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const building = db.prepare(`
        SELECT 
            b.*,
            (SELECT COUNT(*) FROM photos p WHERE p.building_id = b.id) as total_photos,
            (SELECT COUNT(*) FROM photos p WHERE p.building_id = b.id AND p.system_type = 'Fire Alarm') as fire_alarm_photos,
            (SELECT COUNT(*) FROM photos p WHERE p.building_id = b.id AND p.system_type = 'Fire Fighting') as fire_fighting_photos,
            (SELECT MAX(created_at) FROM photos p WHERE p.building_id = b.id) as last_photo_date
        FROM buildings b
        WHERE b.id = ? OR b.building_number = ?
    `).get(id, id);

    if (!building) return res.status(404).json({ error: 'Building not found' });

    // Fetch floors and their flats
    const floors = db.prepare(`SELECT * FROM floors WHERE building_id = ? ORDER BY display_order ASC, floor_number ASC`).all(building.id);
    const flats = db.prepare(`SELECT * FROM flats WHERE building_id = ? ORDER BY display_order ASC`).all(building.id);
    const areas = db.prepare(`SELECT * FROM areas WHERE building_id = ? ORDER BY display_order ASC`).all(building.id);

    // Attach flats to floors
    const floorsWithFlats = floors.map(f => ({
        ...f,
        flats: flats.filter(fl => fl.floor_id === f.id)
    }));

    // Photos for this building
    const photos = db.prepare(`SELECT * FROM photos WHERE building_id = ? ORDER BY created_at DESC`).all(building.id);

    res.json({
        building,
        floors: floorsWithFlats,
        areas,
        photos
    });
});

// POST /api/buildings - Create new building with custom floors, flats, and areas
router.post('/', authMiddleware, (req, res) => {
    const {
        building_number,
        building_name,
        location,
        road,
        block,
        address,
        remarks,
        floors = [],
        areas = []
    } = req.body;

    if (!building_number || !location) {
        return res.status(400).json({ error: 'Building Number and Location are required' });
    }

    const existing = db.prepare(`
        SELECT id FROM buildings WHERE building_number = ? AND LOWER(location) = LOWER(?)
    `).get(building_number.trim(), location.trim());

    if (existing) {
        return res.status(400).json({ error: `Building No. ${building_number} in "${location}" already exists.` });
    }

    const bldId = 'bld-' + uuidv4();
    db.prepare(`
        INSERT INTO buildings (
            id, building_number, building_name, location, road, block, address, remarks, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
        bldId,
        building_number.trim(),
        building_name?.trim() || `Building ${building_number} - ${location}`,
        location.trim(),
        road?.trim() || '',
        block?.trim() || '',
        address?.trim() || '',
        remarks?.trim() || ''
    );

    // Insert Floors and Flats
    const insertFloor = db.prepare(`
        INSERT INTO floors (id, building_id, floor_name, floor_number, has_flats, display_order)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertFlat = db.prepare(`
        INSERT INTO flats (id, building_id, floor_id, flat_number, display_order)
        VALUES (?, ?, ?, ?, ?)
    `);

    if (floors && floors.length > 0) {
        floors.forEach((f, idx) => {
            const fId = 'flr-' + uuidv4();
            insertFloor.run(
                fId,
                bldId,
                f.floor_name || `Floor ${idx + 1}`,
                f.floor_number !== undefined ? f.floor_number : idx,
                f.has_flats ? 1 : 0,
                idx
            );

            if (f.has_flats && f.flats && Array.isArray(f.flats)) {
                f.flats.forEach((flatNum, flatIdx) => {
                    if (flatNum && String(flatNum).trim()) {
                        insertFlat.run(
                            'flat-' + uuidv4(),
                            bldId,
                            fId,
                            String(flatNum).trim(),
                            flatIdx
                        );
                    }
                });
            }
        });
    }

    // Insert Areas
    const insertArea = db.prepare(`
        INSERT INTO areas (id, building_id, area_name, area_type, display_order)
        VALUES (?, ?, ?, ?, ?)
    `);

    if (areas && areas.length > 0) {
        areas.forEach((a, idx) => {
            if (a.area_name && a.area_name.trim()) {
                insertArea.run(
                    'area-' + uuidv4(),
                    bldId,
                    a.area_name.trim(),
                    a.area_type || 'Parking',
                    idx
                );
            }
        });
    }

    const created = db.prepare('SELECT * FROM buildings WHERE id = ?').get(bldId);
    res.status(201).json({ building: created });
});

// POST /api/buildings/:id/floors - Add a floor
router.post('/:id/floors', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { floor_name, has_flats = true, flats = [] } = req.body;

    if (!floor_name) return res.status(400).json({ error: 'Floor name is required' });

    const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(id);
    if (!building) return res.status(404).json({ error: 'Building not found' });

    const maxOrder = db.prepare('SELECT MAX(display_order) as m FROM floors WHERE building_id = ?').get(id).m || 0;
    const fId = 'flr-' + uuidv4();

    db.prepare(`
        INSERT INTO floors (id, building_id, floor_name, floor_number, has_flats, display_order)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(fId, id, floor_name.trim(), maxOrder + 1, has_flats ? 1 : 0, maxOrder + 1);

    if (has_flats && flats && Array.isArray(flats)) {
        const insertFlat = db.prepare(`
            INSERT INTO flats (id, building_id, floor_id, flat_number, display_order)
            VALUES (?, ?, ?, ?, ?)
        `);
        flats.forEach((flatNum, idx) => {
            if (flatNum) insertFlat.run('flat-' + uuidv4(), id, fId, String(flatNum).trim(), idx);
        });
    }

    res.json({ message: 'Floor added successfully' });
});

// POST /api/buildings/:id/areas - Add an area
router.post('/:id/areas', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { area_name, area_type = 'Parking' } = req.body;

    if (!area_name) return res.status(400).json({ error: 'Area name is required' });

    const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(id);
    if (!building) return res.status(404).json({ error: 'Building not found' });

    const maxOrder = db.prepare('SELECT MAX(display_order) as m FROM areas WHERE building_id = ?').get(id).m || 0;
    const aId = 'area-' + uuidv4();

    db.prepare(`
        INSERT INTO areas (id, building_id, area_name, area_type, display_order)
        VALUES (?, ?, ?, ?, ?)
    `).run(aId, id, area_name.trim(), area_type, maxOrder + 1);

    res.json({ message: 'Area added successfully' });
});

// GET /api/buildings/:id/export & /api/buildings/:id/export-zip - Download ZIP
function handleZipExport(req, res) {
    try {
        const { system_type, floor_name, flat_number, area_name, equipment_type } = req.query;

        const { archive, buildingNumber } = createBuildingZipStream({
            buildingId: req.params.id,
            systemType: system_type || null,
            floorName: floor_name || null,
            flatNumber: flat_number || null,
            areaName: area_name || null,
            equipmentType: equipment_type || null
        });

        let zipFilename = `ZAYANI-Building-${buildingNumber}`;
        if (system_type) zipFilename += `-${system_type.replace(/\s+/g, '-')}`;
        if (floor_name) zipFilename += `-${floor_name.replace(/\s+/g, '-')}`;
        if (flat_number) zipFilename += `-Flat-${flat_number}`;
        if (area_name) zipFilename += `-${area_name.replace(/\s+/g, '-')}`;
        if (equipment_type) zipFilename += `-${equipment_type.replace(/\s+/g, '-')}`;
        zipFilename += '.zip';

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

        archive.pipe(res);
        archive.finalize();
    } catch (e) {
        console.error('Export error:', e);
        res.status(500).json({ error: 'Export failed: ' + e.message });
    }
}

router.get('/:id/export', authMiddleware, handleZipExport);
router.get('/:id/export-zip', authMiddleware, handleZipExport);

// DELETE /api/buildings/:id - Delete single building and its cascade data
router.delete('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(id);
    if (!building) return res.status(404).json({ error: 'Building not found' });

    // Clean photos on disk for this building
    const photos = db.prepare('SELECT storage_path FROM photos WHERE building_id = ?').all(id);
    const path = require('path');
    const fs = require('fs');
    photos.forEach(p => {
        try {
            const fullPath = path.isAbsolute(p.storage_path) ? p.storage_path : path.join(__dirname, '..', p.storage_path);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        } catch (e) {}
    });

    db.prepare('DELETE FROM buildings WHERE id = ?').run(id);
    res.json({ message: `Building ${building.building_number} deleted successfully` });
});

// DELETE /api/buildings - Delete all buildings (clean slate)
router.delete('/', authMiddleware, (req, res) => {
    // Delete all photos from disk
    const photos = db.prepare('SELECT storage_path FROM photos').all();
    const path = require('path');
    const fs = require('fs');
    photos.forEach(p => {
        try {
            const fullPath = path.isAbsolute(p.storage_path) ? p.storage_path : path.join(__dirname, '..', p.storage_path);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        } catch (e) {}
    });

    db.prepare('DELETE FROM buildings').run();
    db.prepare('DELETE FROM floors').run();
    db.prepare('DELETE FROM flats').run();
    db.prepare('DELETE FROM areas').run();
    db.prepare('DELETE FROM photos').run();

    res.json({ message: 'All buildings deleted successfully. Clean slate ready.' });
});

module.exports = router;
