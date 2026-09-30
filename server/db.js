const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data', 'zayani.db');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
    // 1. Users Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'technician',
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. Buildings Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS buildings (
            id TEXT PRIMARY KEY,
            building_number TEXT NOT NULL,
            building_name TEXT,
            location TEXT NOT NULL,
            road TEXT,
            block TEXT,
            address TEXT,
            remarks TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(building_number, location)
        );
    `);

    // 3. Floors Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS floors (
            id TEXT PRIMARY KEY,
            building_id TEXT NOT NULL,
            floor_name TEXT NOT NULL,
            floor_number INTEGER DEFAULT 1,
            has_flats INTEGER DEFAULT 1,
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
        );
    `);

    // 4. Flats Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS flats (
            id TEXT PRIMARY KEY,
            building_id TEXT NOT NULL,
            floor_id TEXT NOT NULL,
            flat_number TEXT NOT NULL,
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
            FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE
        );
    `);

    // 5. Parking / Other Areas Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS areas (
            id TEXT PRIMARY KEY,
            building_id TEXT NOT NULL,
            area_name TEXT NOT NULL,
            area_type TEXT DEFAULT 'Parking',
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
        );
    `);

    // 6. Photos Table (Core Inspection Photos)
    db.exec(`
        CREATE TABLE IF NOT EXISTS photos (
            id TEXT PRIMARY KEY,
            building_id TEXT NOT NULL,
            system_type TEXT NOT NULL, -- 'Fire Alarm' | 'Fire Fighting'
            location_type TEXT NOT NULL, -- 'Flats' | 'Floors' | 'Areas'
            floor_id TEXT,
            floor_name TEXT,
            flat_id TEXT,
            flat_number TEXT,
            area_id TEXT,
            area_name TEXT,
            equipment_type TEXT NOT NULL, -- FA: Detector, Break Glass, Panel, Other | FF: Extinguisher, Fire Hose Reel, Wet Riser, Exit Light, Other
            description TEXT,
            original_filename TEXT,
            stored_filename TEXT NOT NULL,
            storage_path TEXT NOT NULL,
            file_size INTEGER,
            mime_type TEXT DEFAULT 'image/jpeg',
            photo_number INTEGER DEFAULT 1,
            uploaded_by TEXT,
            uploaded_by_user_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
            FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE SET NULL,
            FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
            FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
        );
    `);

    seedInitialData();
}

function seedInitialData() {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount === 0) {
        console.log('Seeding initial user accounts...');
        const salt = bcrypt.genSaltSync(10);
        const adminPass = bcrypt.hashSync('admin123', salt);
        const engineerPass = bcrypt.hashSync('sarath123', salt);
        const inspectorPass = bcrypt.hashSync('insp123', salt);
        const technicianPass = bcrypt.hashSync('tech123', salt);

        const insertUser = db.prepare(`
            INSERT INTO users (id, name, email, password_hash, role, phone)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        insertUser.run('usr-admin-1', 'Zayani Project Admin', 'admin@zayani.com', adminPass, 'admin', '+973 3300 0001');
        insertUser.run('usr-eng-1', 'Sarath KR (Site Engineer)', 'sarath@zayani.com', engineerPass, 'engineer', '+973 3300 0002');
        insertUser.run('usr-insp-1', 'Ali Hassan (Lead Inspector)', 'inspector@zayani.com', inspectorPass, 'inspector', '+973 3300 0003');
        insertUser.run('usr-tech-1', 'Mohammed Jaffar (Technician)', 'technician@zayani.com', technicianPass, 'technician', '+973 3300 0004');
    }
}

initDatabase();

module.exports = {
    db,
    initDatabase
};
