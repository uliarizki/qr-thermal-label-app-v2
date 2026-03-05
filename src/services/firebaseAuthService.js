import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { retryWithBackoff, ApiError } from './api';

const USERS_COLLECTION = 'users';
const EMAIL_DOMAIN = '@bintangmas.local'; // Internal email domain for username conversion

/**
 * Convert username to email format for Firebase
 * @param {string} usernameOrEmail - Username or email
 * @returns {string} Email format
 */
function toEmailFormat(usernameOrEmail) {
    // If already contains @, assume it's an email
    if (usernameOrEmail.includes('@')) {
        return usernameOrEmail;
    }
    // Convert username to email format
    return `${usernameOrEmail}${EMAIL_DOMAIN}`;
}

/**
 * Login with username or email and password
 * @param {string} usernameOrEmail - Username (e.g., 'admin') or email
 * @param {string} password - Password
 */
export async function login(usernameOrEmail, password) {
    return retryWithBackoff(async () => {
        try {
            // Convert username to email format if needed
            const email = toEmailFormat(usernameOrEmail);

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Get user profile from Firestore
            const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));

            if (!userDoc.exists()) {
                throw new ApiError('User profile not found', 404);
            }

            const userData = userDoc.data();

            // Update last login timestamp
            await updateDoc(doc(db, USERS_COLLECTION, user.uid), {
                lastLogin: serverTimestamp()
            });

            return {
                uid: user.uid,
                email: user.email,
                username: userData.username,
                role: userData.role,
                createdAt: userData.createdAt?.toDate()
            };
        } catch (error) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                throw new ApiError('Username atau password salah', 401);
            } else if (error.code === 'auth/too-many-requests') {
                throw new ApiError('Terlalu banyak percobaan login. Coba lagi nanti.', 429);
            } else if (error instanceof ApiError) {
                throw error;
            } else {
                throw new ApiError('Login gagal: ' + error.message, 500);
            }
        }
    });
}

/**
 * Register new user (admin only)
 * @param {string} username - Username (will be converted to email)
 * @param {string} password - Password
 * @param {string} role - User role ('admin' or 'user')
 */
export async function register(username, password, role) {
    return retryWithBackoff(async () => {
        try {
            // Convert username to email format
            const email = toEmailFormat(username);

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update display name
            await updateProfile(user, {
                displayName: username
            });

            // Create user profile in Firestore
            await setDoc(doc(db, USERS_COLLECTION, user.uid), {
                email,
                username,
                role,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });

            return {
                uid: user.uid,
                email,
                username,
                role
            };
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                throw new ApiError('Username sudah terdaftar', 400);
            } else if (error.code === 'auth/weak-password') {
                throw new ApiError('Password terlalu lemah (minimal 6 karakter)', 400);
            } else {
                throw new ApiError('Registrasi gagal: ' + error.message, 500);
            }
        }
    });
}

/**
 * Logout current user
 */
export async function logout() {
    await signOut(auth);
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Get user profile
            const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
            if (userDoc.exists()) {
                callback({
                    uid: user.uid,
                    email: user.email,
                    ...userDoc.data()
                });
            } else {
                callback(null);
            }
        } else {
            callback(null);
        }
    });
}
/**
 * Revoke all sessions by updating tokensValidAfter timestamp in Firestore
 */
export async function revokeAllSessions(uid) {
    await updateDoc(doc(db, USERS_COLLECTION, uid), {
        tokensValidAfter: serverTimestamp()
    });
}

/**
 * Subscribe to user security changes (tokensValidAfter)
 * @param {string} uid - User ID
 * @param {function} onRevoked - Callback when revocation is detected (timestamp)
 * @returns {function} Unsubscribe function
 */
export function subscribeToUserSecurity(uid, onRevoked) {
    return onSnapshot(doc(db, USERS_COLLECTION, uid), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            if (data.tokensValidAfter) {
                onRevoked(data.tokensValidAfter);
            }
        }
    });
}
