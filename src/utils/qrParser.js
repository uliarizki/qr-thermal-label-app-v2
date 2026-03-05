// src/utils/qrParser.js
// Parse QR code JSON dengan mapping yang benar ke sheet columns

export function parseQRData(customerData) {
  return {
    it: customerData.id || '',        // ID (B)
    nt: customerData.nama || '',      // NAMA (C) - LARGEST
    at: customerData.kota || '',      // KOTA (D)
    pt: customerData.sales || '',     // SALES (E)
    kp: customerData.pabrik || '',    // PABRIK (F)
    ws: customerData.cabang || '',    // CABANG (G)
    np: customerData.telp || ''       // TELP (H)
    // tidak ada tr di sini
  };
}

export function generateQRJSON(customerData) {
  const qrData = parseQRData(customerData);
  return JSON.stringify(qrData);
}

// Validate QR data (untuk scanning & verification)
export function isValidQRData(qrJson) {
  try {
    const data = typeof qrJson === 'string' ? JSON.parse(qrJson) : qrJson;
    const hasRequired = data.nt && data.at && data.ws;
    return hasRequired ? data : null;
  } catch (error) {
    console.error('Invalid QR JSON:', error);
    return null;
  }
}

// Format untuk label printing
export function formatLabelData(qrData) {
  if (typeof qrData === 'string') {
    qrData = JSON.parse(qrData);
  }

  return {
    id: qrData.it || '',
    nama: qrData.nt || '',
    kota: qrData.at || '',
    sales: qrData.pt || '',
    pabrik: qrData.kp || '',
    cabang: qrData.ws || '',
    telp: qrData.np || ''
    // tidak ada tr di sini juga
  };
}
