// src/utils/escPosEncoder.js

/**
 * Lightweight ESC/POS Encoder
 * Translates text & layout into binary commands for thermal printers.
 */
class EscPosEncoder {
    constructor() {
        this.buffer = [];
    }

    // Initialize printer (Generic)
    initialize() {
        this.buffer = []; // Reset buffer
        this.buffer.push(0x1B, 0x40); // ESC @
        return this;
    }

    // Specific optimization for EPPOS / RPP02 / Generic 58mm
    // Solves "Ribet setting velocity/density"
    initEppos() {
        this.buffer = [];
        this.buffer.push(0x1B, 0x40); // ESC @ (Reset)

        // 1. Set Print Density (Darkness) - Max it out for clarity
        // ESC 7 n1 n2 n3 (n1=Max heating dots, n2=Heating time, n3=Heating interval)
        // Values derived from standard 58mm driver optimization
        this.buffer.push(0x1B, 0x37, 0x07, 0x80, 0x02);

        // 2. Set Print Speed (if supported, generic command)
        // often GS ( E or vendor specific. For now rely on density balance.

        return this;
    }

    // Text Formatting
    align(align) {
        // 0: Left, 1: Center, 2: Right
        const n = align === 'center' ? 1 : align === 'right' ? 2 : 0;
        this.buffer.push(0x1B, 0x61, n); // ESC a n
        return this;
    }

    bold(active = true) {
        this.buffer.push(0x1B, 0x45, active ? 1 : 0); // ESC E n
        return this;
    }

    // Size: 0 (Normal) to 7 (Largest)
    // width: 0-7, height: 0-7
    // byte = (width << 4) | height
    size(width, height) {
        const n = ((width & 0x07) << 4) | (height & 0x07);
        this.buffer.push(0x1D, 0x21, n); // GS ! n
        return this;
    }

    text(content) {
        if (!content) return this;
        // Simple encoding: Spread string into bytes
        // Only supports ASCII/Basic Latin. For UTF-8, need complex encoding/codepage.
        // Assuming printer set to PC437 or similar by default.
        for (let i = 0; i < content.length; i++) {
            this.buffer.push(content.charCodeAt(i));
        }
        return this;
    }

    newline(count = 1) {
        for (let i = 0; i < count; i++) {
            this.buffer.push(0x0A); // LF
        }
        return this;
    }

    // QR Code (Model 2)
    // Reference: ESC/POS Command Manual
    qr(data, size = 6) {
        // 1. Set QR Model (Function 165)
        // GS ( k pL pH cn fn n1 n2
        this.buffer.push(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

        // 2. Set QR Module Size (Function 167) - size 1-16 dots
        this.buffer.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size);

        // 3. Set Error Correction Level (Function 169) - 48(L) 49(M) 50(Q) 51(H)
        this.buffer.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 49); // M

        // 4. Store QR Data (Function 180)
        const len = data.length + 3;
        const pL = len % 256;
        const pH = Math.floor(len / 256);
        this.buffer.push(0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
        this.text(data);

        // 5. Print QR Code (Function 181)
        this.buffer.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);

        return this;
    }

    // Cut Paper
    cut() {
        this.buffer.push(0x1D, 0x56, 0x42, 0x00); // GS V B 0
        return this;
    }

    // Get Raw Uint8Array
    encode() {
        return new Uint8Array(this.buffer);
    }
}

export default new EscPosEncoder();
