import html2canvas from 'html2canvas';

// Output format for Digital Card images.
// The card background is a photo, so PNG (lossless) is ~930 KB per card at 1500x900.
// JPEG is ~4-6x smaller with no visible difference and the QR stays scannable.
export const CARD_MIME = 'image/jpeg';
export const CARD_EXT = 'jpg';
export const CARD_QUALITY = 0.92;        // Single download/share (~215 KB)
export const CARD_QUALITY_BATCH = 0.85;  // Batch export (~165 KB)

/**
 * Generates a canvas from a Digital Card element with consistent settings.
 * Enforces Desktop layout (windowWidth: 1200) to prevent mobile scaling issues.
 *
 * @param {HTMLElement} elementToCapture - The DOM element to capture (usually .digital-card)
 * @param {Object} [options]
 * @param {string|null} [options.backgroundColor] - Fill behind the rounded corners (null = transparent)
 * @returns {Promise<HTMLCanvasElement>}
 */
export const generateCardCanvas = async (elementToCapture, { backgroundColor = null } = {}) => {
    if (!elementToCapture) throw new Error("Element not found");

    return await html2canvas(elementToCapture, {
        backgroundColor,
        scale: 3,           // High resolution output
        width: 500,         // Force content width
        height: 300,        // Force content height
        windowWidth: 1200,  // CRITICAL: Force desktop media queries to prevent mobile scaling
        useCORS: true,
        allowTaint: true,
        logging: false,
        // html2canvas clones the whole page for every capture. Skip everything that is not
        // the card or one of its ancestors, otherwise a batch list with thousands of rows
        // gets copied again for each card.
        ignoreElements: (el) =>
            document.body.contains(el) &&
            !el.contains(elementToCapture) &&
            !elementToCapture.contains(el),
        onClone: (clonedDoc) => {
            const card = clonedDoc.querySelector('.digital-card');
            if (card) {
                // Double safety: Force styles in the cloned document
                card.style.transform = 'none';
                card.style.margin = '0';
                card.style.boxShadow = 'none';
                card.style.width = '500px';
                card.style.height = '300px'; // 300px + padding fix if needed
            }
        }
    });
};

/**
 * Generates a Blob from a Digital Card element.
 * 
 * @param {HTMLElement} elementToCapture
 * @param {Object} [options]
 * @param {string} [options.type] - MIME type ('image/jpeg' | 'image/png' | 'image/webp')
 * @param {number} [options.quality] - 0..1, ignored for PNG
 * @returns {Promise<Blob>}
 */
export const generateCardBlob = async (elementToCapture, { type = CARD_MIME, quality = CARD_QUALITY } = {}) => {
    // JPEG has no alpha channel: transparent corners would turn black, so fill them white
    const canvas = await generateCardCanvas(elementToCapture, {
        backgroundColor: type === 'image/jpeg' ? '#ffffff' : null
    });

    try {
        return await new Promise((resolve, reject) => {
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('Failed to encode card image')),
                type,
                quality
            );
        });
    } finally {
        // Release the 1500x900 bitmap right away (matters when rendering thousands of cards)
        canvas.width = 0;
        canvas.height = 0;
    }
};
