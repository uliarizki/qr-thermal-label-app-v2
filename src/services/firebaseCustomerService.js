import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { retryWithBackoff, ApiError } from './api';

const CUSTOMERS_COLLECTION = 'customers';

/**
 * Generate search keywords from customer data
 */
function generateSearchKeywords(customerData) {
    const keywords = new Set();

    // Add lowercase versions of all searchable fields
    if (customerData.nama) {
        keywords.add(customerData.nama.toLowerCase());
        // Add individual words
        customerData.nama.toLowerCase().split(' ').forEach(word => keywords.add(word));
    }

    if (customerData.kota) {
        keywords.add(customerData.kota.toLowerCase());
    }

    if (customerData.cabang) {
        keywords.add(customerData.cabang.toLowerCase());
    }

    if (customerData.kode) {
        keywords.add(customerData.kode.toLowerCase());
    }

    if (customerData.id) {
        keywords.add(customerData.id.toLowerCase());
    }

    return Array.from(keywords);
}

/**
 * Get all customers from Firestore
 */
export async function getCustomers() {
    return retryWithBackoff(async () => {
        const customersRef = collection(db, CUSTOMERS_COLLECTION);
        const q = query(customersRef, orderBy('createdAt', 'desc'));

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Firestore Timestamps to Date objects
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
            };
        });
    });
}

/**
 * Get a single customer by ID
 */
export async function getCustomerById(customerId) {
    return retryWithBackoff(async () => {
        const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new ApiError('Customer not found', 404);
        }

        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
        };
    });
}

/**
 * Add a new customer to Firestore
 */
export async function addCustomer(customerData) {
    return retryWithBackoff(async () => {
        const customersRef = collection(db, CUSTOMERS_COLLECTION);

        // Generate search keywords for efficient searching
        const searchKeywords = generateSearchKeywords(customerData);

        const docData = {
            kode: customerData.kode || '',
            nama: customerData.nama,
            kota: customerData.kota,
            cabang: customerData.cabang,
            sales: customerData.sales || '',
            pabrik: customerData.pabrik || '',
            telp: customerData.telp || '',
            searchKeywords,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(customersRef, docData);

        return {
            id: docRef.id,
            ...docData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    });
}

/**
 * Update an existing customer
 */
export async function updateCustomer(customerId, customerData) {
    return retryWithBackoff(async () => {
        const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);

        // Generate new search keywords
        const searchKeywords = generateSearchKeywords(customerData);

        const updateData = {
            ...customerData,
            searchKeywords,
            updatedAt: serverTimestamp()
        };

        await updateDoc(docRef, updateData);

        return {
            id: customerId,
            ...updateData,
            updatedAt: new Date()
        };
    });
}

/**
 * Delete a customer
 */
export async function deleteCustomer(customerId) {
    return retryWithBackoff(async () => {
        const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
        await deleteDoc(docRef);
        return { id: customerId };
    });
}

/**
 * Search customers by keyword
 */
export async function searchCustomers(searchTerm) {
    if (!searchTerm || !searchTerm.trim()) {
        return getCustomers();
    }

    return retryWithBackoff(async () => {
        const customersRef = collection(db, CUSTOMERS_COLLECTION);
        const q = query(
            customersRef,
            where('searchKeywords', 'array-contains', searchTerm.toLowerCase()),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
            };
        });
    });
}
