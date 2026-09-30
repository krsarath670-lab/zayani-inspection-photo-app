const fs = require('fs');
const XLSX = require('xlsx');

function inspectExcel(filePath) {
    console.log(`\n================ FILE: ${filePath} ================`);
    if (!fs.existsSync(filePath)) {
        console.log('File does not exist');
        return;
    }
    const workbook = XLSX.readFile(filePath);
    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        data.slice(0, 35).forEach((row, idx) => {
            if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
                console.log(`Row ${(idx + 1).toString().padStart(2, ' ')}:`, JSON.stringify(row.filter(c => c !== null && c !== undefined)));
            }
        });
    });
}

inspectExcel('C:\\Users\\USER\\Desktop\\sarath\\207\\report\\FLAT REPORT.xlsx');
inspectExcel('C:\\Users\\USER\\Desktop\\sarath\\207\\report\\JAW 312.xlsx');
