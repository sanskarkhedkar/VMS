const QRCode = require('qrcode');
const crypto = require('crypto');

const QR_SECRET = process.env.QR_SECRET || 'vms-qr-secret-key';

// Generate unique pass number
const generatePassNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `VMS-${timestamp}-${random}`;
};

// Generate QR code data
const generateQRData = (visitId, passNumber) => {
  const data = {
    visitId,
    passNumber,
    timestamp: Date.now()
  };
  
  // Create signature for verification
  const signature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 16);
  
  return JSON.stringify({ ...data, signature });
};

// Generate QR code as data URL
const generateQRCode = async (visitId, passNumber) => {
  try {
    const qrData = generateQRData(visitId, passNumber);
    
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
    
    return {
      success: true,
      qrData,
      qrCodeDataUrl
    };
  } catch (error) {
    console.error('QR generation failed:', error);
    return { success: false, error: error.message };
  }
};

// Generate QR code as buffer (for file saving)
const generateQRBuffer = async (visitId, passNumber) => {
  try {
    const qrData = generateQRData(visitId, passNumber);
    
    const buffer = await QRCode.toBuffer(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
    
    return { success: true, buffer, qrData };
  } catch (error) {
    console.error('QR buffer generation failed:', error);
    return { success: false, error: error.message };
  }
};

// Verify QR code data
const verifyQRCode = (qrDataString) => {
  try {
    const data = JSON.parse(qrDataString);
    const { visitId, passNumber, timestamp, signature } = data;
    
    // Recreate signature
    const verifyData = { visitId, passNumber, timestamp };
    const expectedSignature = crypto
      .createHmac('sha256', QR_SECRET)
      .update(JSON.stringify(verifyData))
      .digest('hex')
      .substring(0, 16);
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid QR signature' };
    }
    
    // Check if QR is not too old (7 days max)
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > maxAge) {
      return { valid: false, error: 'QR code expired' };
    }
    
    return {
      valid: true,
      visitId,
      passNumber
    };
  } catch (error) {
    return { valid: false, error: 'Invalid QR code format' };
  }
};

module.exports = {
  generatePassNumber,
  generateQRCode,
  generateQRBuffer,
  verifyQRCode
};
