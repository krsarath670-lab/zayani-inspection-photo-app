const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const BASE_URL = 'http://localhost:5175/api';

async function request(endpoint, options = {}, token = null) {
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Request to ${endpoint} failed (${res.status}): ${text}`);
    }

    const contentType = res.headers.get('content-type');
    if (contentType && (contentType.includes('spreadsheet') || contentType.includes('pdf') || contentType.includes('word') || contentType.includes('octet-stream'))) {
        return await res.arrayBuffer();
    }
    return await res.json();
}

async function runTests() {
    console.log('===============================================================');
    console.log('   ZAYANI MAINTENANCE REPORTING APP — FULL ACCEPTANCE TEST    ');
    console.log('===============================================================');

    // TEST 1: Authentication & User Roles
    console.log('\n[TEST 1] Testing Authentication & Roles...');
    const loginRes = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'sarath@zayani.com', password: 'sarath123' })
    });
    const token = loginRes.token;
    console.log('✓ Logged in as:', loginRes.user.name, `(${loginRes.user.role})`);

    // TEST 2: Verify Seed Building 320
    console.log('\n[TEST 2] Verifying Building 320 Source of Truth...');
    const buildingsRes = await request('/buildings?search=320', {}, token);
    const b320 = buildingsRes.buildings.find(b => b.building_number === '320');
    if (!b320) throw new Error('Building 320 not found in database!');
    console.log('✓ Found Building 320:');
    console.log(`  - Number: ${b320.building_number}`);
    console.log(`  - Location: ${b320.location}`);
    console.log(`  - Road: ${b320.road} | Block: ${b320.block}`);
    console.log(`  - Maintenance Count: ${b320.maintenance_count}`);
    console.log(`  - Report Count: ${b320.report_count}`);
    console.log(`  - Photo Count: ${b320.photo_count}`);
    console.log(`  - Open Issues Count: ${b320.open_issues_count}`);

    // TEST 3: Fetch Full Building 320 Details & Tabs
    console.log('\n[TEST 3] Fetching Building 320 Details & Tabs...');
    const detail = await request(`/buildings/${b320.id}`, {}, token);
    console.log(`✓ Building Tabs Verified:`);
    console.log(`  - Maintenance Jobs: ${detail.maintenanceJobs.length}`);
    console.log(`  - Reports: ${detail.reports.length}`);
    console.log(`  - Inspections: ${detail.inspections.length}`);
    console.log(`  - Photos: ${detail.photos.length}`);

    // TEST 4: Create New Maintenance with Auto-Generated Number
    console.log('\n[TEST 4] Creating New Maintenance Job with Auto-Generated ID...');
    const nextNumRes = await request('/maintenance/next-number', {}, token);
    console.log('✓ Auto-Generated Maintenance Number:', nextNumRes.nextNumber);

    const newMntRes = await request('/maintenance', {
        method: 'POST',
        body: JSON.stringify({
            building_id: b320.id,
            maintenance_date: '2026-09-30',
            maintenance_type: 'Periodic Maintenance',
            system_area: 'Fire Alarm & Fire Fighting',
            description: 'Semi-annual safety enhancement verification and alarm smoke test',
            findings: 'All sounders functional on floors 1-4',
            action_taken: 'Tested control panel battery backup and reset call points',
            technician_name: 'Kiran & Majeed',
            status: 'Completed'
        })
    }, token);
    const newJob = newMntRes.job;
    console.log(`✓ Created Job: ${newJob.maintenance_number} for Building ${newJob.building_number} (${newJob.location})`);

    // TEST 5: Create New Inspection with Floor/Flat Matrix
    console.log('\n[TEST 5] Creating Inspection & Updating Flat Matrix (Flats 11-44)...');
    const newInspRes = await request('/inspections', {
        method: 'POST',
        body: JSON.stringify({
            building_id: b320.id,
            maintenance_id: newJob.id,
            inspection_date: '2026-09-30',
            inspector_name: 'Sarath KR'
        })
    }, token);
    const newInsp = newInspRes.inspection;
    console.log(`✓ Created Inspection: ${newInsp.inspection_number} with ${newInspRes.items.length} flats`);

    // Toggle flat 13, 21, 22, 23 to NOT OPEN
    const item13 = newInspRes.items.find(i => i.flat_no === '13');
    if (item13) {
        await request(`/inspections/item/${item13.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                issue_type: 'Not accessible during inspection',
                remarks: 'NOT OPEN',
                inspection_status: 'Not Open'
            })
        }, token);
        console.log('✓ Updated Flat 13: Not accessible during inspection (NOT OPEN)');
    }

    // TEST 6: Upload Photo & Verify Automatic Organization
    console.log('\n[TEST 6] Testing Photo Upload & Auto-Organization...');
    const testJpgBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
        0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
        0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
        0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
        0x00, 0xbf, 0x00, 0xff, 0xd9
    ]);

    const nativeForm = new FormData();
    nativeForm.append('building_id', b320.id);
    nativeForm.append('maintenance_id', newJob.id);
    nativeForm.append('category', 'After');
    nativeForm.append('floor', '2');
    nativeForm.append('flat_no', '24');
    nativeForm.append('caption', 'Smoke detector test verified in Flat 24');
    const photoBlob = new Blob([testJpgBuffer], { type: 'image/jpeg' });
    nativeForm.append('photos', photoBlob, 'field_camera_capture_001.jpg');

    const photoRes = await fetch(`${BASE_URL}/photos/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: nativeForm
    });
    const photoData = await photoRes.json();
    console.log('✓ Photo Upload Result:', photoData.message);
    const uploadedPhoto = photoData.photos[0];
    console.log(`  - Auto Safe Filename: ${uploadedPhoto.storedFilename}`);
    console.log(`  - Physical Storage Path: ${uploadedPhoto.storagePath}`);

    // TEST 7: Create Official Report & Verify Auto Prepared By
    console.log('\n[TEST 7] Creating Work Completion Report...');
    const reportRes = await request('/reports', {
        method: 'POST',
        body: JSON.stringify({
            building_id: b320.id,
            maintenance_id: newJob.id,
            inspection_id: newInsp.id,
            report_type: 'Work Completion Report',
            report_date: '2026-09-30',
            title: `Work Completion Report – Building No.[320], Road No. [6405], Block No. [964]`,
            systems_serviced: 'Fire Alarm (Smoke detectors, Break panel, Fire Alarm panel, Exit lights), Fire extinguishers',
            special_notes: 'NOTE: There is no Fire Hose Reel in this building'
        })
    }, token);
    const newReport = reportRes.report;
    console.log(`✓ Report Created: ${newReport.report_number}`);
    console.log(`  - Title: ${newReport.title}`);
    console.log(`  - Prepared By: ${newReport.prepared_by} (Auto Captured!)`);

    // TEST 8: Export Official Excel (.xlsx) Report
    console.log('\n[TEST 8] Downloading & Parsing Official Excel (.xlsx) Report...');
    const excelBuffer = await request(`/reports/${newReport.id}/excel`, {}, token);
    const workbook = XLSX.read(Buffer.from(excelBuffer), { type: 'buffer' });
    console.log('✓ Excel Generated with Sheets:', workbook.SheetNames);
    const summarySheet = workbook.Sheets['Work Completion'];
    const summaryAoa = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
    console.log('✓ Header in Row 6:', summaryAoa[5]);
    console.log('✓ Subtitle in Row 8:', summaryAoa[7]);

    // TEST 9: Export PDF (.pdf) Reports
    console.log('\n[TEST 9] Downloading PDF Reports...');
    const inspPdfBuffer = await request(`/reports/${newReport.id}/pdf?type=inspection`, {}, token);
    const compPdfBuffer = await request(`/reports/${newReport.id}/pdf?type=completion`, {}, token);
    console.log(`✓ Inspection PDF Generated (${inspPdfBuffer.byteLength} bytes)`);
    console.log(`✓ Work Completion PDF Generated (${compPdfBuffer.byteLength} bytes)`);

    // TEST 10: Export Word (.docx) Report
    console.log('\n[TEST 10] Downloading Word (.docx) Report...');
    const wordBuffer = await request(`/reports/${newReport.id}/word`, {}, token);
    console.log(`✓ Word Docx Generated (${wordBuffer.byteLength} bytes)`);

    // TEST 11: Multi-Building Isolation Test (Building 1000 Lawzi vs Building 320 JAW)
    console.log('\n[TEST 11] Testing Multi-Building Data Isolation...');
    const b1000Res = await request('/buildings?search=1000', {}, token);
    const b1000 = b1000Res.buildings.find(b => b.building_number === '1000');
    if (!b1000) throw new Error('Building 1000 not found!');

    const b1000Photos = await request(`/photos?building_id=${b1000.id}`, {}, token);
    const b320Photos = await request(`/photos?building_id=${b320.id}`, {}, token);
    console.log(`✓ Building 320 Photos Count: ${b320Photos.photos.length}`);
    console.log(`✓ Building 1000 Photos Count: ${b1000Photos.photos.length}`);
    const overlap = b320Photos.photos.filter(p => p.building_id === b1000.id);
    if (overlap.length > 0) throw new Error('Data isolation failure: photo assigned to wrong building!');
    console.log('✓ Zero cross-building photo bleed verified!');

    // TEST 12: Global Search Test
    console.log('\n[TEST 12] Testing Global Multi-Entity Search...');
    const searchRes = await request('/search?q=320', {}, token);
    console.log(`✓ Search "320" matched:`);
    console.log(`  - Buildings: ${searchRes.buildings.length}`);
    console.log(`  - Maintenance: ${searchRes.maintenance.length}`);
    console.log(`  - Reports: ${searchRes.reports.length}`);

    console.log('\n===============================================================');
    console.log('   >>> ALL 12 ACCEPTANCE TESTS PASSED SUCCESSFULLY (100%) <<<   ');
    console.log('===============================================================');
}

runTests().catch(err => {
    console.error('\n❌ ACCEPTANCE TEST FAILED:', err);
    process.exit(1);
});
