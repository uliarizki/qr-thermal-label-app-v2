import { toast } from 'react-hot-toast';

/**
 * Trigger a download of a Blob.
 * @param {Blob} blob 
 * @param {string} filename 
 */
export const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Handle sharing of a file with a fallback to download.
 * Standard "Android-like" behavior: Try to open system share sheet.
 * If not supported or fails (non-cancellation), fallback to download.
 * 
 * @param {Blob} blob - The file content
 * @param {string} filename - The name of the file
 * @param {string} title - Share title
 * @param {string} text - Share text
 * @param {string} mimeType - MIME type of the file (e.g. 'application/pdf', 'image/png')
 */
export const shareOrDownload = async (blob, filename, title, text, mimeType) => {
    const file = new File([blob], filename, { type: mimeType });
    const toastId = toast.loading('Opening Share...');

    // Check if Web Share API is supported
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: title,
                text: text,
            });
            toast.success('Shared successfully!', { id: toastId });
        } catch (error) {
            if (error.name === 'AbortError') {
                // User cancelled, standard behavior is to just close toast
                toast.dismiss(toastId);
            } else {
                // Genuine error, fallback
                console.error('Share failed:', error);
                toast.error('Share failed, downloading instead...', { id: toastId });
                downloadBlob(blob, filename);
            }
        }
    } else {
        // Fallback for Desktop or unsupported browsers
        toast.dismiss(toastId);
        toast('Sharing not supported, downloading...', { icon: '⬇️' });
        downloadBlob(blob, filename);
    }
};
