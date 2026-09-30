const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authMiddleware } = require('../auth');

function generateNextMaintenanceNumber() {
    const year = new Date().getFullYear();
    const prefix = `ZAY-MNT-${year}-`;
    const last = db.prepare(`
        SELECT maintenance_number FROM maintenance_jobs 
        WHERE maintenance_number LIKE ? 
        ORDER BY maintenance_number DESC LIMIT 1
    `).get(`${prefix}%`);

    let nextNum = 1;
    if (last && last.maintenance_number) {
        const parts = last.maintenance_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
            nextNum = lastSeq + 1;
        }
    }
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

// GET /api/maintenance/next-number - Get generated number
router.get('/next-number', authMiddleware, (req, res) => {
    const nextNumber = generateNextMaintenanceNumber();
    res.json({ nextNumber });
});

// GET /api/maintenance - List jobs
router.get('/', authMiddleware, (req, res) => {
    const { building_id, status, search } = req.query;
    let query = `
        SELECT 
            m.*,
            b.building_number,
            b.location,
            b.road,
            b.block,
            b.building_name,
            (SELECT COUNT(*) FROM photos p WHERE p.maintenance_id = m.id) as photo_count,
            (SELECT COUNT(*) FROM reports r WHERE r.maintenance_id = m.id) as report_count
        FROM maintenance_jobs m
        JOIN buildings b ON m.building_id = b.id
        WHERE 1=1
    `;
    const params = [];

    if (building_id) {
        query += ` AND m.building_id = ?`;
        params.push(building_id);
    }
    if (status) {
        query += ` AND m.status = ?`;
        params.push(status);
    }
    if (search) {
        const term = `%${search.trim()}%`;
        query += ` AND (m.maintenance_number LIKE ? OR b.building_number LIKE ? OR b.location LIKE ? OR m.description LIKE ?)`;
        params.push(term, term, term, term);
    }

    query += ` ORDER BY m.maintenance_date DESC, m.created_at DESC`;
    const jobs = db.prepare(query).all(...params);
    res.json({ jobs });
});

// GET /api/maintenance/:id - Detail view
router.get('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const job = db.prepare(`
        SELECT 
            m.*,
            b.building_number,
            b.location,
            b.road,
            b.block,
            b.building_name,
            u.name as created_by_name
        FROM maintenance_jobs m
        JOIN buildings b ON m.building_id = b.id
        LEFT JOIN users u ON m.created_by = u.id
        WHERE m.id = ? OR m.maintenance_number = ?
    `).get(id, id);

    if (!job) return res.status(404).json({ error: 'Maintenance record not found' });

    const photos = db.prepare(`SELECT * FROM photos WHERE maintenance_id = ? ORDER BY display_order ASC, created_at ASC`).all(job.id);
    const reports = db.prepare(`SELECT * FROM reports WHERE maintenance_id = ? ORDER BY created_at DESC`).all(job.id);
    const inspections = db.prepare(`SELECT * FROM inspections WHERE maintenance_id = ?`).all(job.id);

    res.json({
        job,
        photos,
        reports,
        inspections
    });
});

// POST /api/maintenance - Create Maintenance
router.post('/', authMiddleware, (req, res) => {
    const {
        building_id,
        maintenance_date = new Date().toISOString().slice(0, 10),
        maintenance_type = 'Periodic Maintenance',
        system_area = 'Fire Alarm & Fire Fighting',
        description,
        findings,
        action_taken,
        remarks,
        technician_name,
        engineer_name = req.user.name,
        status = 'Completed'
    } = req.body;

    if (!building_id) {
        return res.status(400).json({ error: 'Building is required' });
    }

    const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(building_id);
    if (!building) {
        return res.status(404).json({ error: 'Selected building does not exist' });
    }

    const maintenance_number = generateNextMaintenanceNumber();
    const id = 'mnt-' + uuidv4();

    db.prepare(`
        INSERT INTO maintenance_jobs (
            id, maintenance_number, building_id, maintenance_date, maintenance_type,
            system_area, description, findings, action_taken, remarks,
            technician_name, engineer_name, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        maintenance_number,
        building_id,
        maintenance_date,
        maintenance_type,
        system_area,
        description || `Maintenance work for Building ${building.building_number} (${building.location})`,
        findings || '',
        action_taken || '',
        remarks || '',
        technician_name || '',
        engineer_name || req.user.name,
        status,
        req.user.id
    );

    // Audit log
    db.prepare(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, 'CREATE_MAINTENANCE', 'maintenance', ?, ?)
    `).run('log-' + uuidv4(), req.user.id, req.user.name, id, `Created Maintenance Job ${maintenance_number} for Building ${building.building_number}`);

    const newJob = db.prepare(`
        SELECT m.*, b.building_number, b.location, b.road, b.block 
        FROM maintenance_jobs m 
        JOIN buildings b ON m.building_id = b.id 
        WHERE m.id = ?
    `).get(id);

    res.status(201).json({ job: newJob });
});

// PUT /api/maintenance/:id - Update Maintenance
router.put('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const {
        maintenance_date,
        maintenance_type,
        system_area,
        description,
        findings,
        action_taken,
        remarks,
        technician_name,
        engineer_name,
        status
    } = req.body;

    const job = db.prepare('SELECT * FROM maintenance_jobs WHERE id = ?').get(id);
    if (!job) return res.status(404).json({ error: 'Maintenance job not found' });

    db.prepare(`
        UPDATE maintenance_jobs SET
            maintenance_date = COALESCE(?, maintenance_date),
            maintenance_type = COALESCE(?, maintenance_type),
            system_area = COALESCE(?, system_area),
            description = COALESCE(?, description),
            findings = COALESCE(?, findings),
            action_taken = COALESCE(?, action_taken),
            remarks = COALESCE(?, remarks),
            technician_name = COALESCE(?, technician_name),
            engineer_name = COALESCE(?, engineer_name),
            status = COALESCE(?, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        maintenance_date,
        maintenance_type,
        system_area,
        description,
        findings,
        action_taken,
        remarks,
        technician_name,
        engineer_name,
        status,
        id
    );

    const updated = db.prepare('SELECT * FROM maintenance_jobs WHERE id = ?').get(id);
    res.json({ job: updated });
});

module.exports = router;
