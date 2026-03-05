import {
    loginUser as loginUserAPI,
    registerUser as registerUserAPI
} from '../utils/googleSheets';
import { retryWithBackoff, ApiError } from './api';

console.log('🔐 Auth Service using: Google Sheets');

/**
 * Login user with retry logic
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<Object>} User data with token
 */
export async function login(username, password) {
    if (!username || !password) {
        throw new ApiError('Username dan password wajib diisi', 400);
    }

    return retryWithBackoff(async () => {
        const result = await loginUserAPI(username, password);

        if (!result.success) {
            throw new ApiError(
                result.error || 'Login gagal',
                401,
                result
            );
        }

        return result.data;
    });
}

/**
 * Register new user (admin only)
 * @param {string} username 
 * @param {string} password 
 * @param {string} role 
 * @param {string} creatorRole 
 * @returns {Promise<Object>} Created user
 */
export async function register(username, password, role, creatorRole) {
    if (!username || !password || !role) {
        throw new ApiError('Semua field wajib diisi', 400);
    }

    return retryWithBackoff(async () => {
        const result = await registerUserAPI(username, password, role, creatorRole);

        if (!result.success) {
            throw new ApiError(
                result.error || 'Registrasi gagal',
                500,
                result
            );
        }

        return result.data;
    });
}

/**
 * Logout user (client-side)
 */
export async function logout() {
    // Clear local storage
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // Reload to reset state
    window.location.href = '/';
}
/**
 * Revoke all sessions (Not supported in Sheets Auth)
 */
export async function revokeAllSessions(uid) {
    console.warn('Global Logout requires Firebase Auth');
    throw new Error('Fitur ini memerlukan database Firebase.');
}

/**
 * Subscribe to security updates (Not supported in Sheets Auth)
 */
export function subscribeToUserSecurity(uid, onRevoked) {
    // No-op for Sheets
    return () => { };
}
