// Shared constants for 55x40mm layout
export const LAYOUT_CONSTANTS = {
    WIDTH: 55,
    HEIGHT: 40,
    PADDING: 0, // No outer margin
    GAP: 1,     // 1mm
    QR_SIZE: 22, // 22mm
};

/**
 * Calculates the exact layout for the label content.
 * @param {Object} data - The customer data object.
 * @param {Function} measureTextFn - Function(text, fontSize, isBold) => width in mm.
 * @returns {Object} Layout instructions (positions, font sizes, lines).
 */
export function calculateLabelLayout(data, measureTextFn, config = {}) {
    const { WIDTH, HEIGHT, PADDING, GAP, QR_SIZE } = LAYOUT_CONSTANTS;

    // Vertical Offset (Y-Offset) handling
    const marginTop = config.marginTop || 0;

    // 1. QR Code Position (Top-Left)
    const qr = {
        x: PADDING,
        y: PADDING + marginTop, // Apply Offset
        size: QR_SIZE,
    };

    // 2. ID Position (Below QR, centered)
    const idText = (data.it || '').toString();
    const idFontSize = 9;
    const idWidth = measureTextFn(idText, idFontSize, true);
    const id = {
        text: idText,
        fontSize: idFontSize,
        isBold: true,
        x: qr.x + (qr.size / 2) - (idWidth / 2),
        y: qr.y + qr.size + 3.5, // Relative to QR, so offset is inherited
    };

    // 3. Right Side Content Calculation
    const contentX = PADDING + QR_SIZE + GAP;
    // Printer Hardware Margin Safety: 
    // Even if label is 55mm, printer might only print up to 52mm.
    // Increased safety margin from 1mm -> 3mm -> 3.5mm (User Request: "dikit lagi")
    const maxContentWidth = WIDTH - contentX - 3.5;

    let currentY = PADDING + 3 + marginTop; // Start Y for text + Offset

    // Helper to calculate lines and font size (Smart Text Logic)
    const resolveSmartText = (text, defaultSize, minSize, isBold, maxLinesLimit = 3) => {
        let fontSize = defaultSize;
        let lines = [];

        // Updated Helper: Tokenize text into "atoms" (words or hyphenated parts)
        // "SLAWI-KETANGGUNGAN" -> ["SLAWI-", "KETANGGUNGAN"]
        const getAtoms = (txt) => {
            const rawWords = txt.split(' ');
            const atoms = [];
            rawWords.forEach(w => {
                if (w.includes('-')) {
                    const parts = w.split('-').map((p, idx, arr) => idx < arr.length - 1 ? p + '-' : p);
                    atoms.push(...parts);
                } else {
                    atoms.push(w);
                }
            });
            // Filter out empty strings if any
            return atoms.filter(a => a.length > 0);
        };

        // Helper to reconstruct lines from atoms
        const getLines = (atoms, size, bold) => {
            if (atoms.length === 0) return [];

            const resultLines = [];
            let currentLine = atoms[0];

            for (let i = 1; i < atoms.length; i++) {
                const atom = atoms[i];
                const prevAtom = atoms[i - 1];

                // If previous atom ends with '-', no space separator.
                const separator = prevAtom.endsWith('-') ? '' : ' ';
                const testLine = currentLine + separator + atom;

                // Measure
                const width = measureTextFn(testLine, size, bold);
                if (width < maxContentWidth) {
                    currentLine = testLine;
                } else {
                    resultLines.push(currentLine);
                    currentLine = atom;
                }
            }
            resultLines.push(currentLine);
            return resultLines;
        };

        // 1. Check if single atom exceeds limit at default size
        const atoms = getAtoms(text);
        const maxAtomWidth = Math.max(...atoms.map(a => measureTextFn(a, defaultSize, isBold)));

        if (maxAtomWidth > maxContentWidth) {
            fontSize = minSize;
        }

        // 2. Generate lines at current size
        lines = getLines(atoms, fontSize, isBold);

        // 3. Fallback: If too many lines at default size, shrink to min size
        if (fontSize === defaultSize && lines.length > maxLinesLimit) {
            fontSize = minSize;
            lines = getLines(atoms, minSize, isBold);
        }

        return { lines, fontSize };
    };

    // 3a. Name (Smart)
    const nameText = (data.nt || '').toString();
    const nameResult = resolveSmartText(nameText, 11, 9, true, 3);

    // Explicit rule: if name is very long (fallback), prioritize min size immediately if desired, 
    // but the generic logic above handles it based on line count.

    const nameBlock = {
        lines: nameResult.lines,
        fontSize: nameResult.fontSize,
        isBold: true,
        x: contentX,
        y: currentY,
        lineHeightMm: nameResult.fontSize * 0.4, // Reduced line spacing
    };

    currentY += (nameResult.lines.length * nameBlock.lineHeightMm);
    currentY += 2; // Gap

    // 3b. City (Smart)
    const cityText = (data.at || '').toString();
    const cityResult = resolveSmartText(cityText, 9, 8, true, 2); // Default 9pt, min 8pt, attempt to fit in 2 lines

    const cityBlock = {
        lines: cityResult.lines, // CHANGED from text to lines
        fontSize: cityResult.fontSize,
        isBold: true,
        x: contentX,
        y: currentY,
        lineHeightMm: cityResult.fontSize * 0.4, // Reduced line spacing
    };
    currentY += (cityResult.lines.length * cityBlock.lineHeightMm); // Add height based on lines
    currentY += 1; // Small gap after city

    // 3c. Sales Info (PT)
    const salesText = (data.pt || '').toString();
    const salesBlock = {
        text: salesText,
        fontSize: 8,
        isBold: true,
        x: contentX,
        y: currentY,
    };

    // 4. Branch (Smart: Align with ID row, but shift DOWN if content overlaps)
    const branchText = (data.ws || '').toString();
    const branchWidth = measureTextFn(branchText, 10, true);
    // Base position: same row as ID. Only shift DOWN (never up) if city/sales extends below.
    const branchY = Math.max(id.y, currentY);
    const branchBlock = {
        text: branchText,
        fontSize: 10,
        isBold: true,
        x: contentX, // Left align with other content
        y: branchY, // Always >= id.y
    };

    return {
        qr,
        id,
        name: nameBlock,
        city: cityBlock,
        sales: salesBlock,
        branch: branchBlock,
        meta: { width: WIDTH, height: HEIGHT }
    };
}
