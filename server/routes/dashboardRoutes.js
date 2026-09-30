const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../auth');

router.get('/', authMiddleware, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);

    const totalBuildings = db.prepare('SELECT COUNT(*) as count FROM buildings').get().count;
    const activeBuildings = db.prepare("SELECT COUNT(*) as count FROM buildings WHERE status = 'active'").get().count;
    
    const maintenanceToday = db.prepare("SELECT COUNT(*) as count FROM maintenance_jobs WHERE maintenance_date = ?").get(today).count;
    const pendingMaintenance = db.prepare("SELECT COUNT(*) as count FROM maintenance_jobs WHERE status IN ('In Progress', 'Draft', 'Pending Review')").get().count;
    const completedMaintenance = db.prepare("SELECT COUNT(*) as count FROM maintenance_jobs WHERE status = 'Completed'").get().count;

    const reportsCreated = db.prepare('SELECT COUNT(*) as count FROM reports').get().count;
    const totalPhotos = db.prepare('SELECT COUNT(*) as count FROM photos').get().count;
    const reviewQueueCount = db.prepare("SELECT COUNT(*) as count FROM import_review_queue WHERE status = 'pending_review'").get().count;

    // Recent buildings
    const recentBuildings = db.prepare(`
        SELECT b.*, 
            (SELECT COUNT(*) FROM maintenance_jobs m WHERE m.building_id = b.id) as maintenance_count,
            (SELECT COUNT(*) FROM photos p WHERE p.building_id = b.id) as photo_count
        FROM buildings b 
        ORDER BY b.updated_at DESC, b.created_at DESC 
        LIMIT 6
    `).all();

    // Recent reports
    const recentReports = db.prepare(`
        SELECT r.*, b.building_number, b.location 
        FROM reports r 
        JOIN buildings b ON r.building_id = b.id 
        ORDER BY r.created_at DESC 
        LIMIT 6
    `).all();

    // Recent photos
    const recentPhotos = db.prepare(`
        SELECT p.*, b.building_number, b.location 
        FROM photos p 
        JOIN buildings b ON p.building_id = b.id 
        ORDER BY p.created_at DESC 
        LIMIT 8
    `).all();

    res.json({
        stats: {
            totalBuildings,
            activeBuildings,
            maintenanceToday,
            pendingMaintenance,
            completedMaintenance,
            reportsCreated,
            totalPhotos,
            reviewQueueCount
        },
        recentBuildings,
        recentReports,
        recentPhotos
    });
});

module.exports = router;
