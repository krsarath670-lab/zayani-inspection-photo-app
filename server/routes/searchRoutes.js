const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../auth');

router.get('/', authMiddleware, (req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) {
        return res.json({ buildings: [], photos: [] });
    }

    const term = `%${q.trim()}%`;

    const buildings = db.prepare(`
        SELECT * FROM buildings 
        WHERE building_number LIKE ? OR location LIKE ? OR road LIKE ? OR block LIKE ? OR building_name LIKE ?
        LIMIT 10
    `).all(term, term, term, term, term);

    const photos = db.prepare(`
        SELECT p.*, b.building_number, b.location 
        FROM photos p
        JOIN buildings b ON p.building_id = b.id
        WHERE p.description LIKE ? OR p.stored_filename LIKE ? OR p.equipment_type LIKE ? OR p.flat_number LIKE ? OR p.floor_name LIKE ? OR p.area_name LIKE ?
        LIMIT 20
    `).all(term, term, term, term, term, term);

    res.json({
        query: q,
        buildings,
        photos
    });
});

module.exports = router;
