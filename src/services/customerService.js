import {
    getCustomers as getCustomersFromSheets,
    addCustomer as addCustomerToSheets,
    editCustomer as editCustomerToSheets
} from '../utils/googleSheets';
import { retryWithBackoff, ApiError } from './api';

console.log('📊 Customer Service using: Google Sheets');

/**
 * Get all customers with retry logic
 * @param {boolean} forceReload - Force reload from server
 * @returns {Promise<Array>} Array of customers
 */
export async function getCustomers(forceReload = false) {
    return retryWithBackoff(async () => {
        const result = await getCustomersFromSheets(forceReload);

        if (!result.success) {
            throw new ApiError(
                result.error || 'Failed to fetch customers',
                500,
                result
            );
        }

        return result.data || [];
    });
}

/**
 * Add a new customer with validation and retry
 * @param {Object} customerData - Customer data
 * @returns {Promise<Object>} Created customer
 */
export async function addCustomer(customerData) {
    // Basic validation
    if (!customerData.nama || !customerData.kota || !customerData.cabang) {
        throw new ApiError('Nama, Kota, dan Cabang wajib diisi', 400);
    }

    return retryWithBackoff(async () => {
        const result = await addCustomerToSheets(customerData);

        if (!result.success) {
            throw new ApiError(
                result.error || 'Failed to add customer',
                500,
                result
            );
        }

        return result.data;
    });
}

/**
 * Edit existing customer
 * @param {Object} customerData - Customer data with id
 * @returns {Promise<Object>} Updated customer
 */
export async function editCustomer(customerData) {
    if (!customerData.id) {
        throw new ApiError('Customer ID is required', 400);
    }

    return retryWithBackoff(async () => {
        const result = await editCustomerToSheets(customerData);

        if (!result.success) {
            throw new ApiError(
                result.error || 'Failed to update customer',
                500,
                result
            );
        }

        return result.data;
    });
}

/**
 * Search customers (client-side for now)
 * @param {Array} customers - All customers
 * @param {string} query - Search query
 * @returns {Array} Filtered customers
 */
export function searchCustomers(customers, query) {
    if (!query || !query.trim()) return customers;

    const searchTerm = query.toLowerCase().trim();

    return customers.filter(customer => {
        return (
            customer.nama?.toLowerCase().includes(searchTerm) ||
            customer.kota?.toLowerCase().includes(searchTerm) ||
            customer.id?.toLowerCase().includes(searchTerm) ||
            customer.kode?.toLowerCase().includes(searchTerm) ||
            customer.cabang?.toLowerCase().includes(searchTerm)
        );
    });
}
