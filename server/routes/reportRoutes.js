const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const excelGenerator = require('../reportGenerators/excelGenerator');
const pdfGenerator = require('../reportGenerators/pdfGenerator');
const wordGenerator = require('../reportGenerators/wordGenerator');

function generateNextReportNumber(type = 'WCR') {
    const year = new Date().getFullYear();
    const typePrefix = type.includes('Inspection') ? 'INSP' : (type.includes('Work') ? 'WCR' : 'MNT');
    const prefix = `ZAY-${typePrefix}-${year}-`;
    const last = db.prepare(`
        SELECT report_number FROM reports 
        WHERE report_number LIKE ? 
        ORDER BY report_number DESC LIMIT 1
    `).get(`${prefix}%`);

    let nextNum = 1;
    if (last && last.report_number) {
        const parts = last.report_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

// GET /api/reports - List reports
router.get('/', authMiddleware, (req, res) => {
    const { building_id, report_type } = req.query;
    let query = `
        SELECT 
            r.*,
            b.building_number,
            b.location,
            b.road,
            b.block,
            b.building_name,
            m.maintenance_number,
            (SELECT COUNT(*) FROM photos p WHERE p.report_id = r.id OR p.building_id = r.building_id) as photo_count
        FROM reports r
        JOIN buildings b ON r.building_id = b.id
        LEFT JOIN maintenance_jobs m ON r.maintenance_id = m.id
        WHERE 1=1
    `;
    const params = [];

    if (building_id) {
        query += ` AND r.building_id = ?`;
        params.push(building_id);
    }
    if (report_type) {
        query += ` AND r.report_type = ?`;
        params.push(report_type);
    }

    query += ` ORDER BY r.report_date DESC, r.created_at DESC`;
    const reports = db.prepare(query).all(...params);
    res.json({ reports });
});

// GET /api/reports/:id - Detail view
router.get('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const report = db.prepare(`
        SELECT 
            r.*,
            b.building_number,
            b.location,
            b.road,
            b.block,
            b.building_name,
            b.building_type,
            m.maintenance_number,
            m.maintenance_type,
            m.system_area,
            m.findings,
            m.action_taken,
            m.technician_name,
            m.engineer_name
        FROM reports r
        JOIN buildings b ON r.building_id = b.id
        LEFT JOIN maintenance_jobs m ON r.maintenance_id = m.id
        WHERE r.id = ? OR r.report_number = ?
    `).get(id, id);

    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Fetch associated inspection items
    let inspectionItems = [];
    if (report.inspection_id) {
        inspectionItems = db.prepare(`
            SELECT * FROM inspection_items 
            WHERE inspection_id = ? 
            ORDER BY CAST(floor AS INTEGER) ASC, flat_no ASC
        `).all(report.inspection_id);
    } else {
        // Find latest inspection for building
        const latestInsp = db.prepare(`SELECT id FROM inspections WHERE building_id = ? ORDER BY inspection_date DESC LIMIT 1`).get(report.building_id);
        if (latestInsp) {
            inspectionItems = db.prepare(`
                SELECT * FROM inspection_items 
                WHERE inspection_id = ? 
                ORDER BY CAST(floor AS INTEGER) ASC, flat_no ASC
            `).all(latestInsp.id);
        }
    }

    // Fetch associated photos
    const photos = db.prepare(`
        SELECT * FROM photos 
        WHERE (report_id = ? OR building_id = ?) 
        ORDER BY display_order ASC, created_at ASC
    `).all(report.id, report.building_id);

    res.json({
        report,
        inspectionItems,
        photos
    });
});

// POST /api/reports - Create report
router.post('/', authMiddleware, (req, res) => {
    const {
        building_id,
        maintenance_id,
        inspection_id,
        report_type = 'Work Completion Report',
        report_date = new Date().toISOString().slice(0, 10),
        title,
        summary,
        systems_serviced,
        special_notes,
        status = 'Final',
        selected_photo_ids = []
    } = req.body;

    if (!building_id) return res.status(400).json({ error: 'Building ID is required' });

    const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(building_id);
    if (!building) return res.status(404).json({ error: 'Building not found' });

    const report_number = generateNextReportNumber(report_type);
    const id = 'rpt-' + uuidv4();

    // Auto-capture logged in user identity
    const prepared_by = `${req.user.name} (${req.user.role.toUpperCase()})`;
    const prepared_by_user_id = req.user.id;

    const defaultTitle = report_type === 'Work Completion Report'
        ? `Work Completion Report – Building No.[${building.building_number}], Road No. [${building.road || ''}], Block No. [${building.block || ''}]`
        : `${report_type} – Building ${building.building_number} (${building.location})`;

    db.prepare(`
        INSERT INTO reports (
            id, report_number, report_type, building_id, maintenance_id,
            inspection_id, report_date, prepared_by, prepared_by_user_id,
            title, summary, systems_serviced, special_notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        report_number,
        report_type,
        building_id,
        maintenance_id || null,
        inspection_id || null,
        report_date,
        prepared_by,
        prepared_by_user_id,
        title || defaultTitle,
        summary || `Safety Enhancement in 207 Housing Apartment Buildings. Building ${building.building_number} in ${building.location}.`,
        systems_serviced || 'Fire Alarm (Smoke detectors, Break panel, Fire Alarm panel, Exit lights), Fire extinguishers',
        special_notes || (building.building_number === '320' ? 'NOTE: There is no Fire Hose Reel in this building' : ''),
        status
    );

    // Associate selected photos
    if (selected_photo_ids && Array.isArray(selected_photo_ids) && selected_photo_ids.length > 0) {
        const updatePhoto = db.prepare(`UPDATE photos SET report_id = ? WHERE id = ?`);
        for (const pId of selected_photo_ids) {
            updatePhoto.run(id, pId);
        }
    }

    // Audit log
    db.prepare(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, 'CREATE_REPORT', 'report', ?, ?)
    `).run('log-' + uuidv4(), req.user.id, req.user.name, id, `Created ${report_type} ${report_number} for Building ${building.building_number}`);

    const created = db.prepare(`
        SELECT r.*, b.building_number, b.location, b.road, b.block 
        FROM reports r 
        JOIN buildings b ON r.building_id = b.id 
        WHERE r.id = ?
    `).get(id);

    res.status(201).json({ report: created });
});

// Helper to gather full report dataset
function getReportFullData(reportId) {
    const report = db.prepare(`
        SELECT r.*, b.building_number, b.location, b.road, b.block, b.building_name, b.building_type
        FROM reports r
        JOIN buildings b ON r.building_id = b.id
        WHERE r.id = ? OR r.report_number = ?
    `).get(reportId, reportId);

    if (!report) return null;

    const building = {
        id: report.building_id,
        building_number: report.building_number,
        location: report.location,
        road: report.road,
        block: report.block,
        building_name: report.building_name,
        building_type: report.building_type
    };

    const maintenance = report.maintenance_id
        ? db.prepare(`SELECT * FROM maintenance_jobs WHERE id = ?`).get(report.maintenance_id)
        : null;

    const inspection = report.inspection_id
        ? db.prepare(`SELECT * FROM inspections WHERE id = ?`).get(report.inspection_id)
        : db.prepare(`SELECT * FROM inspections WHERE building_id = ? ORDER BY inspection_date DESC LIMIT 1`).get(building.id);

    let items = [];
    if (inspection) {
        items = db.prepare(`SELECT * FROM inspection_items WHERE inspection_id = ? ORDER BY CAST(floor AS INTEGER) ASC, flat_no ASC`).all(inspection.id);
    }

    const photos = db.prepare(`SELECT * FROM photos WHERE (report_id = ? OR building_id = ?) ORDER BY display_order ASC, created_at ASC`).all(report.id, building.id);

    return { building, maintenance, inspection, items, photos, report };
}

// GET /api/reports/:id/excel - Download Excel
router.get('/:id/excel', authMiddleware, async (req, res) => {
    try {
        const data = getReportFullData(req.params.id);
        if (!data) return res.status(404).json({ error: 'Report not found' });

        const excelBuffer = excelGenerator.generateWorkCompletionExcel(data);
        const filename = `Work_Completion_Report_Building_${data.building.building_number}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(excelBuffer);
    } catch (err) {
        console.error('Excel generation error:', err);
        res.status(500).json({ error: 'Failed to generate Excel: ' + err.message });
    }
});

// GET /api/reports/:id/pdf - Download PDF
router.get('/:id/pdf', authMiddleware, async (req, res) => {
    try {
        const data = getReportFullData(req.params.id);
        if (!data) return res.status(404).json({ error: 'Report not found' });

        const { type } = req.query; // 'inspection' or 'completion'
        let pdfBuffer;
        let filename;

        if (type === 'inspection' || data.report.report_type.includes('Inspection')) {
            pdfBuffer = await pdfGenerator.generateInspectionPDF(data);
            filename = `Inspection_Report_Building_${data.building.building_number}.pdf`;
        } else {
            pdfBuffer = await pdfGenerator.generateFullCompletionPDF(data);
            filename = `Work_Completion_Report_Building_${data.building.building_number}.pdf`;
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('PDF generation error:', err);
        res.status(500).json({ error: 'Failed to generate PDF: ' + err.message });
    }
});

// GET /api/reports/:id/word - Download Word Docx
router.get('/:id/word', authMiddleware, async (req, res) => {
    try {
        const data = getReportFullData(req.params.id);
        if (!data) return res.status(404).json({ error: 'Report not found' });

        const wordBuffer = await wordGenerator.generateWordReport(data);
        const filename = `Report_Building_${data.building.building_number}.docx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(wordBuffer);
    } catch (err) {
        console.error('Word generation error:', err);
        res.status(500).json({ error: 'Failed to generate Word doc: ' + err.message });
    }
});

module.exports = router;
