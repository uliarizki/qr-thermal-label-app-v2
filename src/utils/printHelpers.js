import QRCode from 'qrcode';
import { calculateLabelLayout } from './labelLayout';

/**
 * Render label to an off-screen canvas and return the context data
 * @param {Object} data - Label data {nt, at, ws, it, pt, raw}
 * @param {Object} options - { width, height } in mm (default 50x30)
 * @returns {Promise<Uint8Array>} Raw pixel data (monochrome or grayscale) or standard ImageData
 */
export async function renderLabelToCanvas(data, options = { width: 50, height: 30 }) {
    // 1. Create Canvas with High DPI
    // 8 dots/mm = 203 DPI (Standard Thermal Printer)
    // 50mm * 8 = 400 pixels
    const DPMM = 8;
    const paddingBottomMm = options.paddingBottom || 0;

    const widthPx = Math.floor(options.width * DPMM);
    const contentHeightPx = Math.floor(options.height * DPMM);
    const paddingBottomPx = Math.floor(paddingBottomMm * DPMM);
    const totalHeightPx = contentHeightPx + paddingBottomPx;

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = totalHeightPx;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // White Background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, widthPx, totalHeightPx);
    ctx.fillStyle = 'black';

    // PADDING LOGIC (Safe Zone)
    // Thermal printers often have 1-2mm non-printable area, but we want full control.
    // User reported large margins, so we reset this to 0.
    const paddingMm = 0;
    const paddingPx = Math.floor(paddingMm * DPMM);

    // Coordinate Transform: Shift everything by paddingPx
    ctx.translate(paddingPx, paddingPx);

    // Adjust usable area for layout engine if needed (currently layout uses absolute coordinates)
    // We will just shift the context so (0,0) in layout becomes (2mm, 2mm) in canvas
    // This effectively adds a left/top margin.

    // Adapter for text measurement (Pixels instead of Points/MM)
    // We need to scale the font size from the layout engine (mm) to pixels
    const measureText = (text, fontSizePts, isBold) => {
        // 1 pt = 1.333 px approx (at 96 DPI), but we are in 203 DPI world
        // logic: fontSize in Layout is usually PT or arbitrary units for PDF.
        // Let's assume layout returns MM coordinates.
        // Font size needs calibration. 
        // Standard PDF generic: 12pt ~= 4.2mm height.

        // We'll set font and measure
        const fontSizePx = (fontSizePts / 72) * 203; // Convert pt to printer pixels
        ctx.font = `${isBold ? 'bold' : ''} ${fontSizePx}px Arial`; // Use Arial to match drawText
        const widthMm = ctx.measureText(text).width / DPMM;
        return widthMm * 1.1; // Match PrintPreview's safety buffer to ensure identical wrapping
    };

    // 2. Calculate Layout
    const layout = calculateLabelLayout(data, measureText);
    const { qr, id, name, city, sales, branch } = layout;

    // Helper to scale mm to px
    const mm = (val) => Math.floor(val * DPMM);

    // 3. Draw QR
    // QRCode.toDataURL returns a string, we need to load it
    const qrUrl = await QRCode.toDataURL(data.raw || JSON.stringify(data), {
        errorCorrectionLevel: 'M',
        margin: 0,
        width: mm(qr.size)
    });

    await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, mm(qr.x), mm(qr.y), mm(qr.size), mm(qr.size));
            resolve();
        };
        img.src = qrUrl;
    });

    // 4. Draw Text
    const drawText = (item, textContent) => {
        if (!textContent) return;
        const fontSizePx = (item.fontSize / 72) * 203;
        ctx.font = `${item.isBold ? 'bold' : ''} ${fontSizePx}px Arial`; // Match measureText
        // Fix baseline to match jsPDF (alphabetic)
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(textContent, mm(item.x), mm(item.y));
    };

    // ID
    drawText(id, id.text);

    // Name (Multiline)
    name.lines.forEach((line, i) => {
        const lineY = name.y + (i * name.lineHeightMm);
        // Construct a temp item for the line
        drawText({ ...name, y: lineY }, line);
    });

    // City (Multiline)
    city.lines.forEach((line, i) => {
        const lineY = city.y + (i * city.lineHeightMm);
        drawText({ ...city, y: lineY }, line);
    });

    // Sales
    drawText(sales, sales.text);

    // Branch
    drawText(branch, branch.text);

    return canvas;
}

/**
 * Convert Canvas to Monochrome ESC/POS Raster format (GS v 0)
 * This is widely supported by generic thermal printers (Epson, Xprinter, etc.)
 */
export function canvasToRaster(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // We must pad width to byte boundary (multiple of 8)
    const bytesPerRow = Math.ceil(width / 8);
    const rasterData = new Uint8Array(bytesPerRow * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const offset = (y * width + x) * 4;
            // RGB to Grayscale Luma (Standard Rec 601)
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const alpha = data[offset + 3];

            // White background assumption: if transparent, it's white.
            // If pixel is dark (< 128), bit is 1 (Print). If light, bit is 0 (No print).
            // Alpha check: transparent = white = 0

            let isBlack = false;
            if (alpha > 128) {
                const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                isBlack = luma < 128; // Threshold
            }

            if (isBlack) {
                const byteIndex = y * bytesPerRow + Math.floor(x / 8);
                const bitIndex = 7 - (x % 8);
                rasterData[byteIndex] |= (1 << bitIndex);
            }
        }
    }

    // GS v 0 Command Structure
    // GS v 0 m xL xH yL yH d1...dk
    // m = 0 (Normal)
    // xL, xH = Width in bytes
    // yL, yH = Height in dots

    const xL = bytesPerRow % 256;
    const xH = Math.floor(bytesPerRow / 256);
    const yL = height % 256;
    const yH = Math.floor(height / 256);

    // Header: GS v 0 m xL xH yL yH
    const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

    // Combine
    const combined = new Uint8Array(header.length + rasterData.length);
    combined.set(header);
    combined.set(rasterData, header.length);

    return combined;
}
