import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAcceptanceTest() {
  console.log('🚀 Starting ZAYANI Inspection Photo App Acceptance Test...');
  const baseUrl = 'http://localhost:5175/api';

  // Step 1: Login
  console.log('\n--- 1. Testing Authentication ---');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarath@zayani.com', password: 'sarath123' })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) throw new Error('Login failed: ' + JSON.stringify(loginData));
  const token = loginData.token;
  console.log(`✅ Logged in as: ${loginData.user.name} (${loginData.user.role})`);

  // Step 2: Fetch Building 320
  console.log('\n--- 2. Fetching Building 320 Details ---');
  const b320ListRes = await fetch(`${baseUrl}/buildings?search=320`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const b320List = await b320ListRes.json();
  const bld320 = b320List.buildings.find(b => b.building_number === '320');
  if (!bld320) throw new Error('Building 320 not found in database');
  console.log(`✅ Found Building 320: Location "${bld320.location}", Road ${bld320.road}, Block ${bld320.block}`);

  const b320DetailRes = await fetch(`${baseUrl}/buildings/${bld320.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const b320Detail = await b320DetailRes.json();
  const allFlats = b320Detail.floors.flatMap(f => f.flats || []);
  console.log(`✅ Building 320 Structure: ${b320Detail.floors.length} Floors, ${allFlats.length} Flats, ${b320Detail.areas.length} Areas`);

  // Create a 1x1 test JPEG buffer
  const sampleJpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const sampleJpgBuffer = Buffer.from(sampleJpgBase64, 'base64');

  // Step 3: Upload Fire Alarm Flat Photo (Floor 2, Flat 21, Detector)
  console.log('\n--- 3. Uploading Fire Alarm Flat Photo (Floor 2, Flat 21, Detector) ---');
  const floor2 = b320Detail.floors.find(f => f.floor_name.includes('2'));
  const flat21 = allFlats.find(f => f.flat_number === '21');

  const faFormData = new FormData();
  faFormData.append('photo', new Blob([sampleJpgBuffer], { type: 'image/jpeg' }), 'camera_fa.jpg');
  faFormData.append('building_id', bld320.id);
  faFormData.append('system_type', 'Fire Alarm');
  faFormData.append('location_type', 'Flats');
  faFormData.append('floor_id', floor2.id);
  faFormData.append('floor_name', floor2.floor_name);
  faFormData.append('flat_id', flat21.id);
  faFormData.append('flat_number', flat21.flat_number);
  faFormData.append('equipment_type', 'Detector');
  faFormData.append('description', 'Optical smoke detector installed and tested OK in bedroom.');

  const faUploadRes = await fetch(`${baseUrl}/photos/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: faFormData
  });
  const faPhoto = await faUploadRes.json();
  const faItem = faPhoto.photo || faPhoto.photos[0];
  console.log(`✅ FA Flat Photo Uploaded: ID ${faItem.id}`);
  console.log(`   Filename: ${faItem.storedFilename || faItem.stored_filename}`);
  console.log(`   Storage Path: ${faItem.storagePath || faItem.storage_path}`);

  // Step 4: Upload Fire Fighting Floor Photo (Floor 2, Exit Light - Strictly NO Flat)
  console.log('\n--- 4. Uploading Fire Fighting Floor Photo (Floor 2, Exit Light) ---');
  const ffFormData = new FormData();
  ffFormData.append('photo', new Blob([sampleJpgBuffer], { type: 'image/jpeg' }), 'camera_ff.jpg');
  ffFormData.append('building_id', bld320.id);
  ffFormData.append('system_type', 'Fire Fighting');
  ffFormData.append('location_type', 'Floors');
  ffFormData.append('floor_id', floor2.id);
  ffFormData.append('floor_name', floor2.floor_name);
  ffFormData.append('equipment_type', 'Exit Light');
  ffFormData.append('description', 'Illuminated Exit sign above staircase door operational on battery backup.');

  const ffUploadRes = await fetch(`${baseUrl}/photos/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: ffFormData
  });
  const ffPhoto = await ffUploadRes.json();
  const ffItem = ffPhoto.photo || ffPhoto.photos[0];
  console.log(`✅ FF Floor Photo Uploaded: ID ${ffItem.id}`);
  console.log(`   Filename: ${ffItem.storedFilename || ffItem.stored_filename}`);
  console.log(`   Storage Path: ${ffItem.storagePath || ffItem.storage_path}`);

  // Step 5: Upload Fire Fighting Parking Area Photo (Parking B1, Extinguisher)
  console.log('\n--- 5. Uploading Fire Fighting Parking Photo (Parking B1, Extinguisher) ---');
  const parkingArea = b320Detail.areas.find(a => a.area_name.toLowerCase().includes('parking') || a.area_name.toLowerCase().includes('b1')) || b320Detail.areas[0];

  const ffParkFormData = new FormData();
  ffParkFormData.append('photo', new Blob([sampleJpgBuffer], { type: 'image/jpeg' }), 'camera_park.jpg');
  ffParkFormData.append('building_id', bld320.id);
  ffParkFormData.append('system_type', 'Fire Fighting');
  ffParkFormData.append('location_type', 'Areas');
  ffParkFormData.append('area_id', parkingArea.id);
  ffParkFormData.append('area_name', parkingArea.area_name);
  ffParkFormData.append('equipment_type', 'Extinguisher');
  ffParkFormData.append('description', '6kg ABC Dry Powder Extinguisher inspected with intact seal.');

  const ffParkUploadRes = await fetch(`${baseUrl}/photos/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: ffParkFormData
  });
  const ffParkPhoto = await ffParkUploadRes.json();
  const ffParkItem = ffParkPhoto.photo || ffParkPhoto.photos[0];
  console.log(`✅ FF Parking Photo Uploaded: ID ${ffParkItem.id}`);
  console.log(`   Filename: ${ffParkItem.storedFilename || ffParkItem.stored_filename}`);
  console.log(`   Storage Path: ${ffParkItem.storagePath || ffParkItem.storage_path}`);

  // Step 6: Create New Building with Custom Structure
  console.log('\n--- 6. Testing + NEW BUILDING Creation ---');
  const testBldNum = '5' + Math.floor(100 + Math.random() * 800);
  const newBldPayload = {
    building_number: testBldNum,
    building_name: 'Zayani Heights ' + testBldNum,
    location: 'Tubli / Highway Complex ' + testBldNum,
    road: '1120',
    block: '711',
    remarks: 'New installation project',
    floors: [
      { floor_name: 'Ground Floor', has_flats: false, flats: [] },
      { floor_name: 'Floor 1', has_flats: true, flats: ['101', '102', '103'] },
      { floor_name: 'Roof', has_flats: false, flats: [] }
    ],
    areas: [
      { area_name: 'Basement Parking', area_type: 'Parking' },
      { area_name: 'Main Lobby', area_type: 'Lobby' }
    ]
  };

  const newBldRes = await fetch(`${baseUrl}/buildings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(newBldPayload)
  });
  const newBld = await newBldRes.json();
  if (newBld.error) throw new Error('Create building error: ' + newBld.error);
  console.log(`✅ Created Building ${testBldNum}: ID ${newBld.building.id} (No. ${newBld.building.building_number} at ${newBld.building.location})`);

  // Step 7: Test ZIP Export for Building 320
  console.log('\n--- 7. Testing ZIP Export ---');
  const zipRes = await fetch(`${baseUrl}/buildings/${bld320.id}/export-zip`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!zipRes.ok) throw new Error('ZIP Export failed: ' + zipRes.statusText);
  const zipArrayBuffer = await zipRes.arrayBuffer();
  const zipBuffer = Buffer.from(zipArrayBuffer);
  console.log(`✅ ZIP Export Success: Downloaded ${zipBuffer.length} bytes for ZAYANI-Building-${bld320.building_number}.zip`);

  console.log('\n🎉 ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY! 🎉');
}

runAcceptanceTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
