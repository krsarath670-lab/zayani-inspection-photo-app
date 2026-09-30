const fs = require('fs');
const mammoth = require('mammoth');

async function inspectDocx(filePath) {
    console.log(`\n================ DOCX: ${filePath} ================`);
    if (!fs.existsSync(filePath)) {
        console.log('File does not exist');
        return;
    }
    const result = await mammoth.extractRawText({ path: filePath });
    console.log(result.value);
}

async function main() {
    await inspectDocx('C:\\Users\\USER\\Desktop\\sarath\\207\\report\\WORD\\Lawzi 1000.docx');
    await inspectDocx('C:\\Users\\USER\\Desktop\\sarath\\207\\report\\WORD\\JUFFAIR  BUILDING 1299.docx');
}

main().catch(console.error);
