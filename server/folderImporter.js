const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const unzipper = require('unzipper');
const { db } = require('./db');
const storageManager = require('./storageManager');

function parseFolderMetadata(relativePath) {
    const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
    let detectedLocation = null;
    let detectedBuildingNo = null;
    let category = 'Inspection';
    let floor = null;
    let flatNo = null;

    // Search for building numbers (e.g., 320, 312, 1000, 1299, 786, 2205)
    for (const part of parts) {
        const cleanPart = part.trim();
        const numMatch = cleanPart.match(/\b(\d{3,4})\b/);
        if (numMatch && !detectedBuildingNo) {
            detectedBuildingNo = numMatch[1];
        }

        const upper = cleanPart.toUpperCase();
        if (upper.includes('JAW') || upper.includes('KHALIFA')) detectedLocation = 'Khalifa City / JAW';
        else if (upper.includes('LAWZI')) detectedLocation = 'Lawzi';
        else if (upper.includes('JUFFAIR')) detectedLocation = 'Juffair';
        else if (upper.includes('UMM') || upper.includes('HASSAM')) detectedLocation = 'Umm Al Hassam';
        else if (upper.includes('ISA')) detectedLocation = 'Isa Town';
        else if (upper.includes('HAMAD')) detectedLocation = 'Hamad Town';

        if (upper.includes('COMMEN') || upper.includes('COMMON')) category = 'Common Area';
        else if (upper.includes('FLAT')) {
            category = 'Flats';
            const flatM = upper.match(/FLAT\s*(\d+)/i);
            if (flatM) flatNo = flatM[1];
        } else if (upper.includes('PANEL')) {
            category = 'Fire Alarm Panel';
        } else if (upper.includes('FIGHTING')) {
            category = 'Fire Fighting';
        } else if (upper.includes('ELEVATOR')) {
            category = 'Elevator';
        } else if (upper.includes('BEFORE')) {
            category = 'Before';
        } else if (upper.includes('AFTER')) {
            category = 'After';
        }

        if (upper.includes('FLOOR') || upper === 'GF') {
            const flrM = upper.match(/(\d+)\s*FLOOR/i);
            floor = flrM ? flrM[1] : (upper === 'GF' ? 'GF' : null);
        }
    }

    return {
        detectedBuildingNo,
        detectedLocation,
        category,
        floor,
        flatNo
    };
}

async function handleZipUpload(zipFilePath, uploadedBy = 'System', userId = null) {
    const tempExtractDir = path.join(__dirname, '..', 'storage', 'temp_extract_' + Date.now());
    fs.mkdirSync(tempExtractDir, { recursive: true });

    try {
        const directory = await unzipper.Open.file(zipFilePath);
        await directory.extract({ path: tempExtractDir });

        const results = {
            totalFiles: 0,
            assignedCount: 0,
            reviewQueueCount: 0,
            assignedPhotos: [],
            reviewItems: []
        };

        const walkDir = (currentDir, relPrefix = '') => {
            const items = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const item of items) {
                const fullItemPath = path.join(currentDir, item.name);
                const relItemPath = path.join(relPrefix, item.name);

                if (item.isDirectory()) {
                    walkDir(fullItemPath, relItemPath);
                } else if (item.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(item.name)) {
                    results.totalFiles++;
                    const meta = parseFolderMetadata(relItemPath);

                    let matchedBuilding = null;
                    if (meta.detectedBuildingNo) {
                        if (meta.detectedLocation) {
                            matchedBuilding = db.prepare(`
                                SELECT * FROM buildings 
                                WHERE building_number = ? AND location LIKE ?
                            `).get(meta.detectedBuildingNo, `%${meta.detectedLocation}%`);
                        }
                        if (!matchedBuilding) {
                            matchedBuilding = db.prepare(`
                                SELECT * FROM buildings 
                                WHERE building_number = ?
                            `).get(meta.detectedBuildingNo);
                        }
                    }

                    if (matchedBuilding) {
                        // Confident assignment
                        const buffer = fs.readFileSync(fullItemPath);
                        const saved = storageManager.processAndSavePhoto({
                            buffer,
                            originalFilename: item.name,
                            buildingId: matchedBuilding.id,
                            buildingNumber: matchedBuilding.building_number,
                            category: meta.category,
                            floor: meta.floor,
                            flatNo: meta.flatNo,
                            caption: `${meta.category} - ${meta.floor ? 'Floor ' + meta.floor : ''} ${meta.flatNo ? 'Flat ' + meta.flatNo : ''} (From Import)`.trim(),
                            uploadedBy,
                            uploadedByUserId: userId
                        });
                        results.assignedCount++;
                        results.assignedPhotos.push(saved);
                    } else {
                        // Ambiguous - send to Import Review Queue
                        const queueId = 'rev-' + uuidv4();
                        const reviewStorageDir = path.join(storageManager.STORAGE_ROOT, 'Import_Review_Queue');
                        if (!fs.existsSync(reviewStorageDir)) fs.mkdirSync(reviewStorageDir, { recursive: true });

                        const safeStoredName = `IMPORT-UNASSIGNED-${Date.now()}-${item.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                        const destPath = path.join(reviewStorageDir, safeStoredName);
                        fs.copyFileSync(fullItemPath, destPath);

                        const relStoragePath = path.relative(path.join(__dirname, '..'), destPath).replace(/\\/g, '/');

                        db.prepare(`
                            INSERT INTO import_review_queue (
                                id, batch_id, detected_building_candidate, original_folder_path,
                                original_filename, stored_filename, storage_path, suggested_category, status
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')
                        `).run(
                            queueId,
                            'batch-' + Date.now(),
                            meta.detectedBuildingNo || null,
                            relItemPath,
                            item.name,
                            safeStoredName,
                            relStoragePath,
                            meta.category
                        );

                        results.reviewQueueCount++;
                        results.reviewItems.push({
                            id: queueId,
                            originalFilename: item.name,
                            originalFolderPath: relItemPath,
                            candidate: meta.detectedBuildingNo
                        });
                    }
                }
            }
        };

        walkDir(tempExtractDir);
        return results;
    } finally {
        // Clean up temp extract directory
        try {
            if (fs.existsSync(tempExtractDir)) {
                fs.rmSync(tempExtractDir, { recursive: true, force: true });
            }
            if (fs.existsSync(zipFilePath)) {
                fs.unlinkSync(zipFilePath);
            }
        } catch (e) {
            console.error('Cleanup error:', e);
        }
    }
}

module.exports = {
    parseFolderMetadata,
    handleZipUpload
};
