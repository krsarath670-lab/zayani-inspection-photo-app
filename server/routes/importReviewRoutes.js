const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const storageManager = require('../storageManager');

// GET /api/import-review - List pending review items
router.get('/', authMiddleware, (req, res) => {
    const items = db.prepare(`
        SELECT * FROM import_review_queue 
        WHERE status = 'pending_review' 
        ORDER BY created_at DESC
    `).all();
    res.json({ items });
});

// GET /api/import-review/:id/file - Stream preview image
router.get('/:id/file', authMiddleware, (req, res) => {
    const item = db.prepare('SELECT * FROM import_review_queue WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const fullPath = path.isAbsolute(item.storage_path) ? item.storage_path : path.join(__dirname, '..', item.storage_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File missing on disk' });

    res.setHeader('Content-Type', 'image/jpeg');
    fs.createReadStream(fullPath).pipe(res);
});

// POST /api/import-review/:id/assign - Assign item to building
router.post('/:id/assign', authMiddleware, async (req, res) => {
    const { building_id, category = 'Inspection', floor, flat_no, caption } = req.body;
    if (!building_id) return res.status(400).json({ error: 'Building ID is required' });

    const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(building_id);
    if (!building) return res.status(404).json({ error: 'Building not found' });

    const item = db.prepare('SELECT * FROM import_review_queue WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Review item not found' });

    const sourcePath = path.isAbsolute(item.storage_path) ? item.storage_path : path.join(__dirname, '..', item.storage_path);
    if (fs.existsSync(sourcePath)) {
        const buffer = fs.readFileSync(sourcePath);
        await storageManager.processAndSavePhoto({
            buffer,
            originalFilename: item.original_filename,
            buildingId: building.id,
            buildingNumber: building.building_number,
            category,
            floor: floor || null,
            flatNo: flat_no || null,
            caption: caption || `Imported Photo - Building ${building.building_number}`,
            uploadedBy: req.user.name,
            uploadedByUserId: req.user.id
        });

        // Clean up review file
        try { fs.unlinkSync(sourcePath); } catch (e) {}
    }

    db.prepare(`UPDATE import_review_queue SET status = 'assigned' WHERE id = ?`).run(req.params.id);

    res.json({ message: 'Photo successfully assigned to Building ' + building.building_number });
});

// DELETE /api/import-review/:id - Discard item
router.delete('/:id', authMiddleware, (req, res) => {
    const item = db.prepare('SELECT * FROM import_review_queue WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const sourcePath = path.isAbsolute(item.storage_path) ? item.storage_path : path.join(__dirname, '..', item.storage_path);
    try {
        if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
    } catch (e) {}

    db.prepare(`UPDATE import_review_queue SET status = 'discarded' WHERE id = ?`).run(req.params.id);
    res.json({ message: 'Item discarded' });
});

module.exports = router;
