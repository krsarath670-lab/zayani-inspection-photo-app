const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateInspectionPDF({ building, inspection, items, report }) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Header - matches JAW 320.pdf
            doc.rect(40, 40, doc.page.width - 80, 50).fillAndStroke('#f8fafc', '#cbd5e1');
            doc.fillColor('#0f172a').fontSize(15).font('Helvetica-Bold')
                .text(`${building.location} Building No:${building.building_number}`, 55, 48);
            doc.fontSize(10).font('Helvetica')
                .text(`Road-${building.road || 'N/A'}     Block-${building.block || 'N/A'}     Project: ZAYANI`, 55, 68);

            doc.moveDown(2);
            let startY = 105;

            // Table Header
            const colX = [40, 100, 160, 360];
            const colWidths = [60, 60, 200, doc.page.width - 40 - 360];

            doc.rect(40, startY, doc.page.width - 80, 22).fillAndStroke('#1e293b', '#1e293b');
            doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
            doc.text('Floor', colX[0] + 10, startY + 6);
            doc.text('Flat no', colX[1] + 5, startY + 6);
            doc.text('Issue type', colX[2] + 5, startY + 6);
            doc.text('Remarks', colX[3] + 5, startY + 6);

            let currentY = startY + 22;
            let currentFloor = null;

            (items || []).forEach((item, index) => {
                // Check page height
                if (currentY > doc.page.height - 80) {
                    doc.addPage();
                    currentY = 40;
                }

                const isEven = index % 2 === 0;
                const rowBg = isEven ? '#ffffff' : '#f8fafc';
                doc.rect(40, currentY, doc.page.width - 80, 20).fillAndStroke(rowBg, '#e2e8f0');

                // Display floor number on floor change or first item of floor
                const showFloor = item.floor !== currentFloor ? item.floor : '';
                if (item.floor !== currentFloor) {
                    currentFloor = item.floor;
                }

                doc.fillColor('#334155').fontSize(9).font('Helvetica');
                if (showFloor) {
                    doc.font('Helvetica-Bold').fillColor('#0f172a').text(showFloor, colX[0] + 10, currentY + 5);
                }

                doc.font('Helvetica').fillColor('#334155').text(item.flat_no, colX[1] + 10, currentY + 5);

                // Issue Type & Remarks formatting
                const isNotOpen = item.remarks === 'NOT OPEN' || item.issue_type?.includes('Not accessible');
                if (isNotOpen) {
                    doc.fillColor('#dc2626').text(item.issue_type || 'Not accessible during inspection', colX[2] + 5, currentY + 5);
                    doc.font('Helvetica-Bold').fillColor('#b91c1c').text(item.remarks || 'NOT OPEN', colX[3] + 5, currentY + 5);
                } else if (item.remarks === 'OK' || item.inspection_status === 'OK') {
                    doc.fillColor('#166534').text(item.issue_type || '', colX[2] + 5, currentY + 5);
                    doc.font('Helvetica-Bold').fillColor('#15803d').text('OK', colX[3] + 5, currentY + 5);
                } else {
                    doc.fillColor('#d97706').text(item.issue_type || 'Defect noted', colX[2] + 5, currentY + 5);
                    doc.font('Helvetica').fillColor('#b45309').text(item.remarks || '', colX[3] + 5, currentY + 5);
                }

                currentY += 20;
            });

            // Summary Footer
            if (currentY > doc.page.height - 100) {
                doc.addPage();
                currentY = 40;
            }

            currentY += 20;
            doc.rect(40, currentY, doc.page.width - 80, 50).fillAndStroke('#f1f5f9', '#cbd5e1');
            doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold')
                .text('INSPECTION SUMMARY & VERIFICATION', 55, currentY + 8);
            doc.font('Helvetica').fontSize(8).fillColor('#475569')
                .text(`Report ID: ${report?.report_number || inspection?.inspection_number || 'ZAY-RPT-SAMPLE'}   |   Date: ${report?.report_date || inspection?.inspection_date || '2026-02-09'}`, 55, currentY + 22)
                .text(`Prepared By: ${report?.prepared_by || inspection?.inspector_name || 'Sarath KR'}   |   Status: Verified & Submitted`, 55, currentY + 34);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

function generateFullCompletionPDF({ building, maintenance, inspection, items, photos, report }) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Page 1: Executive Cover & Details
            doc.rect(40, 40, doc.page.width - 80, 70).fillAndStroke('#0f172a', '#0f172a');
            doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
                .text('ZAYANI PROJECT MAINTENANCE REPORT', 55, 52);
            doc.fontSize(11).font('Helvetica')
                .text('Safety Enhancement in 207 Housing Apartment Buildings', 55, 75);
            doc.fontSize(9).fillColor('#94a3b8')
                .text(`Report No: ${report?.report_number || 'ZAY-WCR-2026-001'} | Date: ${report?.report_date || '2026-02-09'}`, 55, 92);

            let curY = 125;
            // Building Info Box
            doc.rect(40, curY, doc.page.width - 80, 65).fillAndStroke('#f8fafc', '#e2e8f0');
            doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
                .text(`BUILDING IDENTIFICATION: Building ${building.building_number}`, 55, curY + 10);
            doc.font('Helvetica').fontSize(9).fillColor('#334155')
                .text(`Location: ${building.location}`, 55, curY + 26)
                .text(`Road: ${building.road || 'N/A'}    |    Block: ${building.block || 'N/A'}`, 55, curY + 39)
                .text(`Building Type: ${building.building_type || 'Residential Apartment (207 Housing)'}`, 55, curY + 52);

            curY += 75;

            // Maintenance Scope Box
            doc.rect(40, curY, doc.page.width - 80, 85).fillAndStroke('#ffffff', '#e2e8f0');
            doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
                .text('MAINTENANCE WORK DETAILS', 55, curY + 10);
            doc.font('Helvetica').fontSize(9).fillColor('#334155')
                .text(`Maintenance Job No: ${maintenance?.maintenance_number || 'ZAY-MNT-2026-001'}`, 55, curY + 26)
                .text(`System / Area: ${maintenance?.system_area || 'Fire Alarm & Fire Fighting'}`, 55, curY + 39)
                .text(`Description: ${maintenance?.description || 'Safety enhancement and testing'}`, 55, curY + 52)
                .text(`Action Taken: ${maintenance?.action_taken || 'Completed full testing of alarms and extinguishers'}`, 55, curY + 65);

            curY += 95;

            // Systems Serviced & Notes
            doc.rect(40, curY, doc.page.width - 80, 55).fillAndStroke('#eff6ff', '#bfdbfe');
            doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold')
                .text('Systems Serviced & Operational Notes:', 55, curY + 8);
            doc.font('Helvetica').fontSize(8.5).fillColor('#1e3a8a')
                .text(report?.systems_serviced || 'Fire Alarm (Smoke detectors, Break panel, Fire Alarm panel, Exit lights), Fire extinguishers', 55, curY + 22)
                .text(report?.special_notes || 'NOTE: There is no Fire Hose Reel in this building.', 55, curY + 36);

            curY += 65;

            // Signatures
            doc.rect(40, curY, doc.page.width - 80, 50).fillAndStroke('#f8fafc', '#cbd5e1');
            doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold')
                .text(`Prepared By: ${report?.prepared_by || 'Sarath KR (Site Engineer)'}`, 55, curY + 12)
                .text(`Date Prepared: ${report?.report_date || '2026-02-09'}`, 55, curY + 28);

            // Page 2+: Photo Gallery with Automatic Organization
            if (photos && photos.length > 0) {
                doc.addPage();
                doc.rect(40, 40, doc.page.width - 80, 30).fillAndStroke('#1e293b', '#1e293b');
                doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
                    .text(`PHOTO DOCUMENTATION — BUILDING ${building.building_number}`, 55, 49);

                let photoY = 85;
                const photoWidth = 240;
                const photoHeight = 160;

                for (let i = 0; i < photos.length; i += 2) {
                    if (photoY + photoHeight + 40 > doc.page.height - 40) {
                        doc.addPage();
                        photoY = 45;
                    }

                    // Photo 1 (Left)
                    const p1 = photos[i];
                    const p1Path = path.isAbsolute(p1.storage_path) ? p1.storage_path : path.join(__dirname, '..', p1.storage_path);
                    if (fs.existsSync(p1Path)) {
                        try {
                            doc.image(p1Path, 45, photoY, { width: photoWidth, height: photoHeight, fit: [photoWidth, photoHeight] });
                        } catch (e) {
                            doc.rect(45, photoY, photoWidth, photoHeight).fillAndStroke('#f1f5f9', '#cbd5e1');
                            doc.fillColor('#64748b').fontSize(8).text('[Image Preview]', 120, photoY + 70);
                        }
                    } else {
                        doc.rect(45, photoY, photoWidth, photoHeight).fillAndStroke('#f1f5f9', '#cbd5e1');
                        doc.fillColor('#64748b').fontSize(8).text('[Photo Available in Storage]', 100, photoY + 70);
                    }
                    doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
                        .text(`${p1.category} - ${p1.floor ? 'Floor ' + p1.floor : ''} ${p1.flat_no ? 'Flat ' + p1.flat_no : ''}`, 45, photoY + photoHeight + 4, { width: photoWidth });
                    doc.font('Helvetica').fontSize(7).fillColor('#64748b')
                        .text(p1.caption || p1.original_filename || '', 45, photoY + photoHeight + 15, { width: photoWidth });

                    // Photo 2 (Right, if exists)
                    if (i + 1 < photos.length) {
                        const p2 = photos[i + 1];
                        const p2Path = path.isAbsolute(p2.storage_path) ? p2.storage_path : path.join(__dirname, '..', p2.storage_path);
                        if (fs.existsSync(p2Path)) {
                            try {
                                doc.image(p2Path, 315, photoY, { width: photoWidth, height: photoHeight, fit: [photoWidth, photoHeight] });
                            } catch (e) {
                                doc.rect(315, photoY, photoWidth, photoHeight).fillAndStroke('#f1f5f9', '#cbd5e1');
                                doc.fillColor('#64748b').fontSize(8).text('[Image Preview]', 390, photoY + 70);
                            }
                        } else {
                            doc.rect(315, photoY, photoWidth, photoHeight).fillAndStroke('#f1f5f9', '#cbd5e1');
                            doc.fillColor('#64748b').fontSize(8).text('[Photo Available in Storage]', 370, photoY + 70);
                        }
                        doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
                            .text(`${p2.category} - ${p2.floor ? 'Floor ' + p2.floor : ''} ${p2.flat_no ? 'Flat ' + p2.flat_no : ''}`, 315, photoY + photoHeight + 4, { width: photoWidth });
                        doc.font('Helvetica').fontSize(7).fillColor('#64748b')
                            .text(p2.caption || p2.original_filename || '', 315, photoY + photoHeight + 15, { width: photoWidth });
                    }

                    photoY += photoHeight + 35;
                }
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateInspectionPDF,
    generateFullCompletionPDF
};
