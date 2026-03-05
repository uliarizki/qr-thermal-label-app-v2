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

/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by stopping requests when error threshold is reached
 */
export class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failureCount = 0;
        this.threshold = threshold;
        this.timeout = timeout;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.nextAttempt = Date.now();
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new ApiError('Circuit breaker is OPEN', 503);
            }
            this.state = 'HALF_OPEN';
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failureCount++;
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.error(`🚨 Circuit breaker OPEN. Will retry after ${this.timeout}ms`);
        }
    }

    reset() {
        this.failureCount = 0;
        this.state = 'CLOSED';
        this.nextAttempt = Date.now();
    }
}
