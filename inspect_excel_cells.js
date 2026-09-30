const fs = require('fs');
const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\USER\\Desktop\\sarath\\207\\Photos\\JAW\\320\\Work Completion report (Building no 320).xlsx';
const workbook = XLSX.readFile(excelPath, { cellFormula: true, cellHTML: true, cellStyles: true });

const sheet = workbook.Sheets['blank '];
console.log('Merges count:', (sheet['!merges'] || []).length);
console.log('Merges sample:', JSON.stringify((sheet['!merges'] || []).slice(0, 20)));

// Let's inspect all keys in sheet
const keys = Object.keys(sheet).filter(k => !k.startsWith('!'));
console.log('Total non-meta cells:', keys.length);
keys.forEach(k => {
    console.log(k, ':', JSON.stringify(sheet[k]));
});
