const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } = require('docx');

async function generateWordReport({ building, maintenance, inspection, items, report }) {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${building.location}  Building No:${building.building_number}`,
                            bold: true,
                            size: 28,
                            color: "0F172A"
                        })
                    ],
                    spacing: { after: 120 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Road-${building.road || ''}   Block-${building.block || ''}   ${building.location}`,
                            size: 22,
                            color: "475569"
                        })
                    ],
                    spacing: { after: 240 }
                }),
                // Table
                new Table({
                    width: {
                        size: 100,
                        type: WidthType.PERCENTAGE
                    },
                    rows: [
                        // Header Row
                        new TableRow({
                            tableHeader: true,
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Floor", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: "1E293B" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Flat no", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: "1E293B" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Issue type", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: "1E293B" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Remarks", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: "1E293B" }
                                }),
                            ]
                        }),
                        // Data Rows
                        ...(items || []).map((item, idx) => {
                            const isNotOpen = item.remarks === 'NOT OPEN' || item.issue_type?.includes('Not accessible');
                            const textColor = isNotOpen ? "DC2626" : (item.remarks === 'OK' ? "166534" : "0F172A");
                            return new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: String(item.floor || '') })] })],
                                        shading: { fill: idx % 2 === 0 ? "FFFFFF" : "F8FAFC" }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: String(item.flat_no || '') })] })],
                                        shading: { fill: idx % 2 === 0 ? "FFFFFF" : "F8FAFC" }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: item.issue_type || '', color: textColor })] })],
                                        shading: { fill: idx % 2 === 0 ? "FFFFFF" : "F8FAFC" }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: item.remarks || '', bold: isNotOpen || item.remarks === 'OK', color: textColor })] })],
                                        shading: { fill: idx % 2 === 0 ? "FFFFFF" : "F8FAFC" }
                                    }),
                                ]
                            });
                        })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `\nPrepared By: ${report?.prepared_by || 'Sarath KR'} | Date: ${report?.report_date || '2026-02-09'}`,
                            italics: true,
                            size: 18,
                            color: "64748B"
                        })
                    ],
                    spacing: { before: 240 }
                })
            ]
        }]
    });

    return await Packer.toBuffer(doc);
}

module.exports = {
    generateWordReport
};
