import html2canvas from 'html2canvas';

/**
 * Generates a canvas from a Digital Card element with consistent settings.
 * Enforces Desktop layout (windowWidth: 1200) to prevent mobile scaling issues.
 * 
 * @param {HTMLElement} elementToCapture - The DOM element to capture (usually .digital-card)
 * @returns {Promise<HTMLCanvasElement>}
 */
export const generateCardCanvas = async (elementToCapture) => {
    if (!elementToCapture) throw new Error("Element not found");

    return await html2canvas(elementToCapture, {
        backgroundColor: null,
        scale: 3,           // High resolution output
        width: 500,         // Force content width
        height: 300,        // Force content height
        windowWidth: 1200,  // CRITICAL: Force desktop media queries to prevent mobile scaling
        useCORS: true,
        allowTaint: true,
        logging: false,
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
 * @returns {Promise<Blob>}
 */
export const generateCardBlob = async (elementToCapture) => {
    const canvas = await generateCardCanvas(elementToCapture);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
};
