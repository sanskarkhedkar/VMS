const PDFDocument = require('pdfkit');
const { generateQRBuffer } = require('./qr.util');

const formatDate = (value) => new Date(value).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

const formatTime = (value) => new Date(value).toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit'
});

const instructions = [
  'Carry a valid photo ID and cooperate with security checks.',
  'Keep this entry pass visible at all times while on-site.',
  'Stay with your host and avoid restricted areas without an escort.',
  'Follow all safety and emergency instructions from staff.',
  'Return this visitor pass to security during gate checkout.'
];

const drawLabelValue = (doc, label, value, x, y, width = 250) => {
  doc
    .fontSize(9)
    .fillColor('#64748b')
    .text(label.toUpperCase(), x, y, { width });

  doc
    .moveDown(0.1)
    .fontSize(12)
    .fillColor('#0f172a')
    .text(value || '-', { width });
};

const generateEntryPassPDF = async (visit) => new Promise(async (resolve, reject) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    const buffers = [];
    doc.on('data', (data) => buffers.push(data));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(22)
      .fillColor('#0f172a')
      .text('Visitor Entry Pass');

    doc
      .moveDown(0.3)
      .fontSize(10)
      .fillColor('#475569')
      .text(`Generated on ${new Date().toLocaleString()}`);

    doc
      .moveDown(0.8)
      .fontSize(14)
      .fillColor('#0ea5e9')
      .text(visit.passNumber || 'Pending Pass');

    doc
      .moveDown(0.5)
      .fontSize(11)
      .fillColor('#0f172a')
      .text('Present this pass at all checkpoints and keep it visible while on-site.');

    doc.moveDown(1);

    // QR code (optional)
    const qrBufferResult = await generateQRBuffer(visit.id, visit.passNumber);
    if (qrBufferResult.success && qrBufferResult.buffer) {
      doc.image(qrBufferResult.buffer, doc.page.width - 180, 120, { width: 110 });
      doc
        .fontSize(9)
        .fillColor('#475569')
        .text('Scan to verify entry', doc.page.width - 185, 235, { width: 140, align: 'center' });
    }

    // Visitor & host details
    const startY = doc.y;
    drawLabelValue(
      doc,
      'Visitor',
      `${visit.visitor?.firstName || ''} ${visit.visitor?.lastName || ''}`.trim(),
      50,
      startY
    );

    drawLabelValue(doc, 'Company', visit.visitor?.company || 'N/A', 50, startY + 50);
    drawLabelValue(doc, 'Phone', visit.visitor?.phone || 'Not provided', 50, startY + 100);

    drawLabelValue(
      doc,
      'Host',
      `${visit.hostEmployee?.firstName || ''} ${visit.hostEmployee?.lastName || ''}`.trim(),
      320,
      startY
    );
    drawLabelValue(doc, 'Department', visit.hostEmployee?.department || 'N/A', 320, startY + 50);
    drawLabelValue(doc, 'Host Email', visit.hostEmployee?.email || 'N/A', 320, startY + 100);

    // Visit timing
    const timingY = Math.max(doc.y, startY + 150);
    doc.moveTo(50, timingY).lineTo(doc.page.width - 50, timingY).strokeColor('#e2e8f0').stroke();

    doc
      .moveDown(0.8)
      .fontSize(14)
      .fillColor('#0f172a')
      .text('Schedule & Timing');

    doc.moveDown(0.3);
    drawLabelValue(doc, 'Scheduled Date', formatDate(visit.scheduledDate), 50, doc.y);
    drawLabelValue(
      doc,
      'Scheduled Slot',
      `${formatTime(visit.scheduledTimeIn)} - ${formatTime(visit.scheduledTimeOut)}`,
      320,
      doc.y
    );

    doc.moveDown(1.2);
    drawLabelValue(doc, 'Check-In Time', formatTime(visit.actualTimeIn || visit.scheduledTimeIn), 50, doc.y);
    drawLabelValue(doc, 'Purpose', visit.purpose?.replace('_', ' ') || 'N/A', 320, doc.y);

    // Instructions
    doc.moveDown(2);
    doc
      .fontSize(14)
      .fillColor('#0f172a')
      .text('General Instructions');

    doc.moveDown(0.5);
    instructions.forEach((text) => {
      const bulletY = doc.y + 4;
      doc
        .circle(56, bulletY, 3)
        .fill('#0ea5e9')
        .fillColor('#334155')
        .fontSize(11)
        .text(text, 70, doc.y, { width: doc.page.width - 120 })
        .moveDown(0.4);
    });

    doc.end();
  } catch (error) {
    reject(error);
  }
});

module.exports = {
  generateEntryPassPDF
};
