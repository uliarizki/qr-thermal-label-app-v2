const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} retries - Maximum number of retries
 * @returns {Promise} Result of the function
 */
export async function retryWithBackoff(fn, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            // Don't retry on last attempt
            if (i === retries - 1) {
                throw error;
            }

            // Calculate exponential backoff delay
            const delay = BASE_DELAY * Math.pow(2, i);
            console.log(`⚠️ Retry attempt ${i + 1}/${retries} after ${delay}ms...`);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}