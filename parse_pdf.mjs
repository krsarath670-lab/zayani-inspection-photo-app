import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function parse() {
    const pdfPath = 'C:\\Users\\USER\\Desktop\\sarath\\207\\Photos\\JAW\\320\\JAW 320.pdf';
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const doc = await loadingTask.promise;
    console.log(`PDF Pages: ${doc.numPages}`);
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');
        console.log(`\n=== PAGE ${i} ===\n`);
        console.log(text);
    }
}

parse().catch(console.error);
