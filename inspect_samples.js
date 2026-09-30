const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');

async function main() {
    const excelPath = 'C:\\Users\\USER\\Desktop\\sarath\\207\\Photos\\JAW\\320\\Work Completion report (Building no 320).xlsx';
    const pdfPath = 'C:\\Users\\USER\\Desktop\\sarath\\207\\Photos\\JAW\\320\\JAW 320.pdf';

    console.log('====================================');
    console.log('1. INSPECTING EXCEL REPORT');
    console.log('====================================');
    try {
        const workbook = XLSX.readFile(excelPath);
        console.log('Sheet Names:', workbook.SheetNames);
        workbook.SheetNames.forEach(sheetName => {
            console.log(`\n--- Sheet: ${sheetName} ---`);
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            data.forEach((row, idx) => {
                if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
                    console.log(`Row ${idx + 1}:`, JSON.stringify(row));
                }
            });
        });
    } catch (e) {
        console.error('Error reading Excel:', e);
    }

    console.log('\n====================================');
    console.log('2. INSPECTING PDF REPORT');
    console.log('====================================');
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdfParse(dataBuffer);
        console.log('PDF Page Count:', pdfData.numpages);
        console.log('PDF Info:', JSON.stringify(pdfData.info));
        console.log('\n--- PDF Text Content ---\n');
        console.log(pdfData.text);
    } catch (e) {
        console.error('Error reading PDF:', e);
    }
}

main();
