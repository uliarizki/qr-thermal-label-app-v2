import { openDB } from 'idb';

const DB_NAME = 'qr-app-db';
const DB_VERSION = 1;

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Store for Customers
            if (!db.objectStoreNames.contains('customers')) {
                db.createObjectStore('customers', { keyPath: 'id' });
            }
            // Store for Activity History
            if (!db.objectStoreNames.contains('history')) {
                const historyStore = db.createObjectStore('history', { keyPath: 'timestamp' });
                historyStore.createIndex('type', 'type');
                historyStore.createIndex('user', 'user');
            }
            // Store for App Config/Metadata (Last Update, User Prefs)
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata');
            }
        },
    });
};

// --- CUSTOMER OPERATIONS ---

export const saveCustomersToDB = async (customers) => {
    const db = await initDB();
    const tx = db.transaction('customers', 'readwrite');
    const store = tx.objectStore('customers');

    // Clear old data first (optional, but ensures sync with sheet)
    await store.clear();

    for (const customer of customers) {
        if (customer.id) {
            store.put(customer);
        }
    }
    await tx.done;

    // Update Timestamp
    const metaDb = await initDB(); // Re-open or reuse? openDB handles pooling usually, but separate tx is safer
    await metaDb.put('metadata', new Date(), 'last_sync_customers');
};

export const getCustomersFromDB = async () => {
    const db = await initDB();
    const customers = await db.getAll('customers');
    const lastSync = await db.get('metadata', 'last_sync_customers');
    return { data: customers, lastSync };
};

// --- HISTORY OPERATIONS ---

export const addHistoryToDB = async (item) => {
    const db = await initDB();
    // Add unique timestamp if needed, or rely on passed timestamp
    const record = {
        ...item,
        timestamp: item.timestamp || Date.now()
    };
    await db.put('history', record);
    return record;
};

export const getHistoryFromDB = async () => {
    const db = await initDB();
    // Get all and sort by timestamp desc
    const all = await db.getAll('history');
    return all.sort((a, b) => b.timestamp - a.timestamp);
};

// --- METADATA OPERATIONS ---

export const saveMetaData = async (key, value) => {
    const db = await initDB();
    await db.put('metadata', value, key);
}

export const getMetaData = async (key) => {
    const db = await initDB();
    return db.get('metadata', key);
}
