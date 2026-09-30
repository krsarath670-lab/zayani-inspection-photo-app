const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authMiddleware } = require('../auth');

function generateNextInspectionNumber() {
    const year = new Date().getFullYear();
    const prefix = `ZAY-INSP-${year}-`;
    const last = db.prepare(`
        SELECT inspection_number FROM inspections 
        WHERE inspection_number LIKE ? 
        ORDER BY inspection_number DESC LIMIT 1
    `).get(`${prefix}%`);

    let nextNum = 1;
    if (last && last.inspection_number) {
        const parts = last.inspection_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

// GET /api/inspections - List inspections
router.get('/', authMiddleware, (req, res) => {
    const { building_id, maintenance_id } = req.query;
    let query = `
        SELECT 
            ins.*,
            b.building_number,
            b.location,
            b.road,
            b.block,
            (SELECT COUNT(*) FROM inspection_items ii WHERE ii.inspection_id = ins.id) as total_items,
            (SELECT COUNT(*) FROM inspection_items ii WHERE ii.inspection_id = ins.id AND ii.inspection_status = 'OK') as ok_count,
            (SELECT COUNT(*) FROM inspection_items ii WHERE ii.inspection_id = ins.id AND (ii.inspection_status != 'OK' OR ii.remarks = 'NOT OPEN')) as issues_count
        FROM inspections ins
        JOIN buildings b ON ins.building_id = b.id
        WHERE 1=1
    `;
    const params = [];
    if (building_id) {
        query += ` AND ins.building_id = ?`;
        params.push(building_id);
    }
    if (maintenance_id) {
        query += ` AND ins.maintenance_id = ?`;
        params.push(maintenance_id);
    }

    query += ` ORDER BY ins.inspection_date DESC, ins.created_at DESC`;
    const inspections = db.prepare(query).all(...params);
    res.json({ inspections });
});

// GET /api/inspections/:id - Detail view with items
router.get('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const inspection = db.prepare(`
        SELECT 
            ins.*,
            b.building_number,
            b.location,
            b.road,
            b.block,
            b.building_name,
            m.maintenance_number
        FROM inspections ins
        JOIN buildings b ON ins.building_id = b.id
        LEFT JOIN maintenance_jobs m ON ins.maintenance_id = m.id
        WHERE ins.id = ? OR ins.inspection_number = ?
    `).get(id, id);

    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    const items = db.prepare(`
        SELECT * FROM inspection_items 
        WHERE inspection_id = ? 
        ORDER BY CAST(floor AS INTEGER) ASC, flat_no ASC
    `).all(inspection.id);

    res.json({
        inspection,
        items
    });
});

// POST /api/inspections - Create inspection & auto-seed standard flats
router.post('/', authMiddleware, (req, res) => {
    const {
        building_id,
        maintenance_id,
        inspection_date = new Date().toISOString().slice(0, 10),
        inspector_name = req.user.name,
        remarks,
        items // optional custom items array
    } = req.body;

    if (!building_id) return res.status(400).json({ error: 'Building is required' });

    const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(building_id);
    if (!building) return res.status(404).json({ error: 'Building not found' });

    const inspection_number = generateNextInspectionNumber();
    const inspId = 'insp-' + uuidv4();

    db.prepare(`
        INSERT INTO inspections (
            id, inspection_number, building_id, maintenance_id, inspection_date,
            inspector_name, inspector_id, status, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed', ?)
    `).run(
        inspId,
        inspection_number,
        building_id,
        maintenance_id || null,
        inspection_date,
        inspector_name,
        req.user.id,
        remarks || `Inspection for Building ${building.building_number} (${building.location})`
    );

    const insertItem = db.prepare(`
        INSERT INTO inspection_items (
            id, inspection_id, floor, flat_no, issue_type, remarks, inspection_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    if (items && Array.isArray(items) && items.length > 0) {
        items.forEach((it, idx) => {
            insertItem.run(
                'item-' + uuidv4(),
                inspId,
                String(it.floor || '1'),
                String(it.flat_no || (idx + 1)),
                it.issue_type || '',
                it.remarks || 'OK',
                it.inspection_status || (it.remarks === 'NOT OPEN' ? 'Not Open' : 'OK')
            );
        });
    } else {
        // Auto-generate based on total_floors and flats_per_floor
        const floors = building.total_floors || 4;
        const flatsPerFloor = building.flats_per_floor || 4;

        for (let f = 1; f <= floors; f++) {
            for (let fl = 1; fl <= flatsPerFloor; fl++) {
                const flatNo = `${f}${fl}`;
                insertItem.run(
                    'item-' + uuidv4(),
                    inspId,
                    String(f),
                    flatNo,
                    '',
                    'OK',
                    'OK'
                );
            }
        }
    }

    const created = db.prepare('SELECT * FROM inspections WHERE id = ?').get(inspId);
    const createdItems = db.prepare('SELECT * FROM inspection_items WHERE inspection_id = ? ORDER BY CAST(floor AS INTEGER) ASC, flat_no ASC').all(inspId);

    res.status(201).json({
        inspection: created,
        items: createdItems
    });
});

// PUT /api/inspections/:id/items - Batch update inspection items
router.put('/:id/items', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items must be an array' });
    }

    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    const updateStmt = db.prepare(`
        UPDATE inspection_items SET
            issue_type = ?,
            remarks = ?,
            inspection_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND inspection_id = ?
    `);

    const updateAll = db.transaction((rows) => {
        for (const row of rows) {
            updateStmt.run(
                row.issue_type || '',
                row.remarks || 'OK',
                row.inspection_status || (row.remarks === 'NOT OPEN' ? 'Not Open' : 'OK'),
                row.id,
                id
            );
        }
    });

    updateAll(items);

    const updatedItems = db.prepare('SELECT * FROM inspection_items WHERE inspection_id = ? ORDER BY CAST(floor AS INTEGER) ASC, flat_no ASC').all(id);
    res.json({ items: updatedItems });
});

// PUT /api/inspections/item/:itemId - Update single inspection item
router.put('/item/:itemId', authMiddleware, (req, res) => {
    const { itemId } = req.params;
    const { issue_type, remarks, inspection_status } = req.body;

    db.prepare(`
        UPDATE inspection_items SET
            issue_type = ?,
            remarks = ?,
            inspection_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        issue_type || '',
        remarks || 'OK',
        inspection_status || (remarks === 'NOT OPEN' ? 'Not Open' : 'OK'),
        itemId
    );

    const updated = db.prepare('SELECT * FROM inspection_items WHERE id = ?').get(itemId);
    res.json({ item: updated });
});

module.exports = router;
