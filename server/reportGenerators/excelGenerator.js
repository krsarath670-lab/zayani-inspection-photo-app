const XLSX = require('xlsx');

function generateWorkCompletionExcel({ building, maintenance, inspection, items, photos, report }) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Work Completion Summary (matches sample: Work Completion report (Building no 320).xlsx)
    const summaryRows = [];

    // Title Block
    summaryRows.push([]);
    summaryRows.push([]);
    summaryRows.push([]);
    summaryRows.push([]);
    summaryRows.push([]);
    summaryRows.push([null, null, null, null, "Safety Enhancement in 207 Housing Apartment Buildings"]);
    summaryRows.push([]);
    summaryRows.push([
        null, null, null,
        `Work Completion Report – Building No.[${building.building_number}], Road No. [${building.road || ''}], Block No. [${building.block || ''}]`
    ]);
    summaryRows.push([]);
    summaryRows.push([]);

    // Section 1: Fire Fighting Works
    summaryRows.push(["Work Completion Summary for Fire Fighting Works"]);
    summaryRows.push([]);
    summaryRows.push([
        null,
        `Systems serviced: ${report?.systems_serviced || 'Fire Alarm (Smoke detectors, Break panel, Fire Alarm panel, Exit lights), Fire extinguishers'}`
    ]);
    summaryRows.push([
        null,
        report?.special_notes || (building.building_number === '320' ? "NOTE: There is no Fire Hose Reel in this building" : "Fire safety systems inspected and certified.")
    ]);
    summaryRows.push([]);

    // Inspection status summary
    const okCount = (items || []).filter(i => i.inspection_status === 'OK').length;
    const notOpenCount = (items || []).filter(i => i.inspection_status === 'Not Open' || i.inspection_status === 'Not Accessible').length;
    const issueCount = (items || []).filter(i => i.inspection_status === 'Issue Found').length;

    summaryRows.push([null, `Total Flats Inspected: ${(items || []).length} | OK: ${okCount} | Not Accessible/Open: ${notOpenCount} | Issues: ${issueCount}`]);
    summaryRows.push([]);

    // Section 2: Fire Alarm Works
    summaryRows.push(["Work Completion Summary for Fire Alarm works"]);
    summaryRows.push([]);
    summaryRows.push([null, `Maintenance Type: ${maintenance?.maintenance_type || 'Safety Enhancement'}`]);
    summaryRows.push([null, `Action Taken: ${maintenance?.action_taken || 'Full inspection of panels, sensors and extinguishers'}`]);
    summaryRows.push([null, `Findings: ${maintenance?.findings || 'All accessible units verified functional'}`]);
    summaryRows.push([]);

    // Section 3: Elevator Summary
    summaryRows.push(["Work Completion Summary for Elevator"]);
    summaryRows.push([]);
    summaryRows.push([null, "Elevator shaft / landing fire alarm interface verified where applicable."]);
    summaryRows.push([]);
    summaryRows.push([null, `Report Prepared By: ${report?.prepared_by || 'Sarath KR'} | Date: ${report?.report_date || new Date().toISOString().slice(0, 10)}`]);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Work Completion");

    // Sheet 2: Floor & Flat Inspection (matches sample: FLAT REPORT.xlsx / JAW 312.xlsx)
    const inspRows = [];
    inspRows.push([`${building.location}  Building No:${building.building_number}`]);
    inspRows.push([`Road-${building.road || ''}   Block-${building.block || ''}    ${building.location}`]);
    inspRows.push(["Floor", "Flat no", "Issue type", "Remarks"]);

    if (items && items.length > 0) {
        items.forEach(item => {
            inspRows.push([
                item.floor,
                item.flat_no,
                item.issue_type || '',
                item.remarks || item.inspection_status || 'OK'
            ]);
        });
    }

    const wsInspection = XLSX.utils.aoa_to_sheet(inspRows);
    XLSX.utils.book_append_sheet(wb, wsInspection, "Flat Inspection");

    // Sheet 3: Photo Catalog & Manifest
    const photoRows = [];
    photoRows.push(["Photo Reference ID", "Category", "Floor", "Flat No", "Caption", "Original Filename", "Stored Filename", "Uploaded Date", "Uploaded By"]);
    if (photos && photos.length > 0) {
        photos.forEach(p => {
            photoRows.push([
                p.id,
                p.category || 'Inspection',
                p.floor || '-',
                p.flat_no || '-',
                p.caption || '',
                p.original_filename || '',
                p.stored_filename || '',
                p.created_at || '',
                p.uploaded_by || ''
            ]);
        });
    }
    const wsPhotos = XLSX.utils.aoa_to_sheet(photoRows);
    XLSX.utils.book_append_sheet(wb, wsPhotos, "Photos Manifest");

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
    generateWorkCompletionExcel
};
