const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

// Generate CSV from data
const generateCSV = (data, fields) => {
  try {
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    return { success: true, csv };
  } catch (error) {
    console.error('CSV generation failed:', error);
    return { success: false, error: error.message };
  }
};

// Generate PDF report
const generatePDFReport = (title, data, columns) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        layout: 'landscape'
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve({ success: true, buffer: pdfBuffer });
      });

      // Header
      doc.fontSize(20)
         .fillColor('#1e40af')
         .text('Visitor Management System', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(16)
         .fillColor('#334155')
         .text(title, { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(10)
         .fillColor('#64748b')
         .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      
      doc.moveDown(1);

      // Table header
      const tableTop = doc.y;
      const columnWidth = (doc.page.width - 100) / columns.length;
      
      // Header background
      doc.rect(50, tableTop, doc.page.width - 100, 25)
         .fill('#1e40af');
      
      // Header text
      doc.fontSize(10).fillColor('#ffffff');
      columns.forEach((col, i) => {
        doc.text(col.header, 55 + (i * columnWidth), tableTop + 7, {
          width: columnWidth - 10,
          align: 'left'
        });
      });

      // Table rows
      let rowTop = tableTop + 30;
      
      data.forEach((row, rowIndex) => {
        // Alternate row background
        if (rowIndex % 2 === 0) {
          doc.rect(50, rowTop - 5, doc.page.width - 100, 25)
             .fill('#f8fafc');
        }
        
        doc.fontSize(9).fillColor('#334155');
        columns.forEach((col, i) => {
          const value = row[col.key] || '-';
          doc.text(String(value).substring(0, 30), 55 + (i * columnWidth), rowTop, {
            width: columnWidth - 10,
            align: 'left'
          });
        });
        
        rowTop += 25;
        
        // New page if needed
        if (rowTop > doc.page.height - 100) {
          doc.addPage();
          rowTop = 50;
        }
      });

      // Footer
      doc.fontSize(8)
         .fillColor('#94a3b8')
         .text(
           `Total Records: ${data.length}`,
           50,
           doc.page.height - 50,
           { align: 'center' }
         );

      doc.end();
    } catch (error) {
      reject({ success: false, error: error.message });
    }
  });
};

// Format visit data for export
const formatVisitForExport = (visit) => ({
  passNumber: visit.passNumber || '-',
  visitorName: `${visit.visitor?.firstName || ''} ${visit.visitor?.lastName || ''}`.trim(),
  visitorEmail: visit.visitor?.email || '-',
  visitorPhone: visit.visitor?.phone || '-',
  visitorCompany: visit.visitor?.company || '-',
  hostName: `${visit.hostEmployee?.firstName || ''} ${visit.hostEmployee?.lastName || ''}`.trim(),
  hostDepartment: visit.hostEmployee?.department || '-',
  purpose: visit.purpose?.replace('_', ' ') || '-',
  scheduledDate: new Date(visit.scheduledDate).toLocaleDateString(),
  scheduledTimeIn: new Date(visit.scheduledTimeIn).toLocaleTimeString(),
  scheduledTimeOut: new Date(visit.scheduledTimeOut).toLocaleTimeString(),
  actualTimeIn: visit.actualTimeIn ? new Date(visit.actualTimeIn).toLocaleTimeString() : '-',
  actualTimeOut: visit.actualTimeOut ? new Date(visit.actualTimeOut).toLocaleTimeString() : '-',
  status: visit.status?.replace('_', ' ') || '-',
  isWalkIn: visit.isWalkIn ? 'Yes' : 'No'
});

// Visit report columns
const visitReportColumns = [
  { header: 'Pass #', key: 'passNumber' },
  { header: 'Visitor', key: 'visitorName' },
  { header: 'Company', key: 'visitorCompany' },
  { header: 'Host', key: 'hostName' },
  { header: 'Purpose', key: 'purpose' },
  { header: 'Date', key: 'scheduledDate' },
  { header: 'Time In', key: 'scheduledTimeIn' },
  { header: 'Time Out', key: 'scheduledTimeOut' },
  { header: 'Status', key: 'status' }
];

// CSV fields for visitor export
const visitCSVFields = [
  { label: 'Pass Number', value: 'passNumber' },
  { label: 'Visitor Name', value: 'visitorName' },
  { label: 'Visitor Email', value: 'visitorEmail' },
  { label: 'Visitor Phone', value: 'visitorPhone' },
  { label: 'Visitor Company', value: 'visitorCompany' },
  { label: 'Host Name', value: 'hostName' },
  { label: 'Host Department', value: 'hostDepartment' },
  { label: 'Purpose', value: 'purpose' },
  { label: 'Scheduled Date', value: 'scheduledDate' },
  { label: 'Scheduled Time In', value: 'scheduledTimeIn' },
  { label: 'Scheduled Time Out', value: 'scheduledTimeOut' },
  { label: 'Actual Time In', value: 'actualTimeIn' },
  { label: 'Actual Time Out', value: 'actualTimeOut' },
  { label: 'Status', value: 'status' },
  { label: 'Walk-In', value: 'isWalkIn' }
];

module.exports = {
  generateCSV,
  generatePDFReport,
  formatVisitForExport,
  visitReportColumns,
  visitCSVFields
};
