const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\sarath\\207\\Photos\\JAW\\320\\Work Completion report (Building no 320).xlsx';
const workbook = XLSX.readFile(excelPath);

workbook.SheetNames.forEach(sheetName => {
    console.log(`\n================ SHEET: "${sheetName}" ================`);
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z500');
    console.log('Range:', sheet['!ref']);
    
    // Print all non-empty rows with row number
    for (let R = range.s.r; R <= range.e.r; ++R) {
        let rowCells = [];
        let hasContent = false;
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            const cell = sheet[cell_ref];
            const val = cell ? (cell.w || cell.v) : '';
            if (val !== '' && val !== null && val !== undefined) {
                hasContent = true;
            }
            rowCells.push(val || '');
        }
        if (hasContent) {
            // Trim trailing empty strings
            while (rowCells.length > 0 && rowCells[rowCells.length - 1] === '') {
                rowCells.pop();
            }
            console.log(`Row ${(R + 1).toString().padStart(3, ' ')}: ${rowCells.map(c => JSON.stringify(c)).join(' | ')}`);
        }
    }
});
