import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getCustomers, getCachedCustomers } from '../utils/googleSheets';
import { useAuth } from './AuthContext';

const CustomerContext = createContext();

export function useCustomer() {
    return useContext(CustomerContext);
}

export function CustomerProvider({ children }) {
    const { user } = useAuth();

    // -- State --
    const [customers, setCustomers] = useState(() => {
        // Initial load from cache
        return getCachedCustomers() || [];
    });

    const [isSyncing, setIsSyncing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null); // replaces globalSelectedCustomer

    // -- Actions --

    /**
     * Sync data from Google Sheets
     * @param {boolean} silent - If true, minimal UI feedback (no loading toast)
     */
    const syncCustomers = useCallback(async (silent = false) => {
        // Ensure silent is boolean
        console.log("Syncing...", silent);
        const isSilent = silent === true;

        if (!isSilent) setIsSyncing(true);
        const toastId = isSilent ? null : toast.loading('Syncing data...');

        try {
            // Force reload = true
            const result = await getCustomers(true);

            if (result.success) {
                setCustomers(result.data || []);
                setLastUpdated(new Date());
                if (!isSilent) {
                    setIsSyncing(false);
                    if (toastId) toast.success('Data berhasil disinkronisasi!', { id: toastId });
                } else {
                    console.log("Silent sync complete");
                }
            } else {
                throw new Error(result.error || 'Sync failed');
            }
        } catch (error) {
            console.error('Sync failed:', error);
            if (!isSilent) {
                setIsSyncing(false);
                if (toastId) toast.error('Gagal sync data: ' + (error.message || 'Unknown error'), { id: toastId });
            }
        }
    }, []);

    /**
     * Handle adding a new customer (Optimistic UI + Sync)
     */
    const addCustomerLocal = useCallback((newCustomer) => {
        // 1. Trigger Sync
        syncCustomers(false);

        // Safety check
        if (!newCustomer || typeof newCustomer !== 'object') {
            console.error('AddCustomerLocal: Invalid customer data', newCustomer);
            return;
        }

        // 2. Select the new customer immediately for display
        // Construct safe object
        const displayCustomer = {
            id: newCustomer.id || '',
            nama: newCustomer.nama || 'New Customer',
            kota: newCustomer.kota || '',
            sales: newCustomer.sales || '',
            pabrik: newCustomer.pabrik || '',
            cabang: newCustomer.cabang || '',
            telp: newCustomer.telp || '',
            // Consistent 'kode' for QR
            kode: JSON.stringify({
                it: newCustomer.id || '',
                nt: newCustomer.nama,
                at: newCustomer.kota,
                pt: newCustomer.sales || '',
                kp: newCustomer.pabrik || '',
                ws: newCustomer.cabang || '',
                np: newCustomer.telp || ''
            })
        };

        setSelectedCustomer(displayCustomer);
    }, [syncCustomers]);

    // -- Effects --

    // 1. Auto-Sync Strategy (Interval + Focus)
    useEffect(() => {
        if (!user) return;

        // Initial silent sync on mount if stale? 
        // For now, relies on cache, but maybe we want a fresh fetch on load?
        // syncCustomers(true);

        const intervalId = setInterval(() => {
            syncCustomers(true);
        }, 5 * 60 * 1000); // 5 mins

        const handleFocus = () => {
            syncCustomers(true);
        };

        window.addEventListener('focus', handleFocus);
        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, syncCustomers]);


    const value = {
        customers,
        isSyncing,
        lastUpdated,
        selectedCustomer,
        setSelectedCustomer,
        syncCustomers,
        addCustomerLocal
    };

    return (
        <CustomerContext.Provider value={value}>
            {children}
        </CustomerContext.Provider>
    );
}
