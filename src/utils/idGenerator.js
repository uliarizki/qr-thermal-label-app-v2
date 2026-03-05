/**
 * ID Generator Utility
 * Generates Customer IDs based on City and Random/Sequence logic.
 */

const BRANCH_CODES = {
    'BT SMG': 'SMG',
    'BT JKT': 'JKT',
    'BT SBY': 'SBY',
};

/**
 * Generate a unique ID based on Branch
 * Format: [MMM][RRRR] (3 Letter Code + 4 Random Digits)
 * Example: SMG1024
 * @param {string} branch - Input branch name (e.g. "BT SMG")
 * @param {Array} existingCustomers - List of existing customers to check for collision
 * @returns {string} Generated ID
 */
export function generateCustomerId(branch, existingCustomers = []) {
    if (!branch || typeof branch !== 'string') return '';

    const upperBranch = branch.trim().toUpperCase();

    // 1. Get Prefix
    let prefix = BRANCH_CODES[upperBranch];

    // Fallback: Use raw letters if not in map
    if (!prefix) {
        // e.g. "BT BANDUNG" -> "BAN" or "BT" removed?
        // simple fallback: take first 3 alphanumeric chars
        const clean = upperBranch.replace(/[^A-Z]/g, '');
        prefix = clean.substring(0, 3);
    }

    if (prefix.length < 3) {
        prefix = prefix.padEnd(3, 'X');
    }

    // 2. Generate Number (Loop to ensure uniqueness)
    let newId = '';
    let attempts = 0;
    const maxAttempts = 50;

    const existingIds = new Set(existingCustomers.map(c => c.id));

    do {
        // Random 6 digit number: 100000 - 999999
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        newId = `${prefix}${randomNum}`;
        attempts++;
    } while (existingIds.has(newId) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
        // Fallback if super unlucky (add timestamp suffix)
        newId = `${prefix}${Date.now().toString().slice(-6)}`;
    }

    return newId;
}
