import React, { useState, useEffect } from 'react';
import QRScanner from './QRScanner';
import { checkInCustomer, addAndCheckIn, getAttendanceList } from '../utils/googleSheets';
import { toast } from 'react-hot-toast';
import '../App.css';
import GuestBookList from './GuestBookList';
import GuestBookForm from './GuestBookForm';
import { useCustomer } from '../context/CustomerContext'; // UNIFIED DATA SOURCE
import { Icons } from './Icons'; // Unified Icons
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function GuestBook() {
    const { customers, syncCustomers, isSyncing } = useCustomer(); // USE CONTEXT
    const [activeTab, setActiveTab] = useState('checkin'); // 'checkin' | 'list'
    const { isOnline } = useNetworkStatus();

    // Data States
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(false);

    // Manual / Search State
    const [showManual, setShowManual] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Default Cabang from LocalStorage or 'BT SMG'
    const [manualForm, setManualForm] = useState(() => {
        const savedBranch = typeof window !== 'undefined' ? localStorage.getItem('qr:lastBranch') : 'BT SMG';
        return { nama: '', kota: '', hp: '', cabang: savedBranch || 'BT SMG' };
    });

    // Date Filter State (Default Today)
    const [filterDate, setFilterDate] = useState(() => {
        const now = new Date();
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
    });

    // Load attendance when switching to list
    useEffect(() => {
        if (activeTab === 'list') {
            fetchAttendance();
        }
    }, [activeTab]);

    // SMART SEARCH LOGIC (Unified with CustomerSearch)
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        const terms = query.split(/\s+/).filter(Boolean);

        // Map customers to { customer, score }
        const scoredResults = customers.map(c => {
            let score = 0;
            const cId = String(c.id || '').toLowerCase();
            const cName = String(c.nama || '').toLowerCase();
            const cCity = String(c.kota || '').toLowerCase();

            // A. ID Match
            if (cId === query) score += 100;
            else if (cId.includes(query)) score += 80;

            // B. Name Match
            if (cName === query) score += 60;
            else if (cName.startsWith(query)) score += 50;
            else if (cName.includes(query)) score += 20;

            // C. Term Matching
            const allTermsMatch = terms.every(term => {
                let termMatched = false;
                if (cName.includes(term)) { score += 5; termMatched = true; }
                if (cCity.includes(term)) { score += 10; termMatched = true; }
                if (cId.includes(term)) { termMatched = true; }
                return termMatched;
            });

            if (!allTermsMatch) return { c, score: -1 };
            return { c, score };
        });

        // Filter & Sort & Limit
        const results = scoredResults
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5) // Suggest top 5 relevant
            .map(item => item.c);

        setSearchResults(results);
    }, [searchQuery, customers]);

    const fetchAttendance = async () => {
        setLoading(true);
        const res = await getAttendanceList();
        setLoading(false);
        if (res.success) {
            setAttendees(res.data);
        } else {
            toast.error('Gagal memuat data: ' + res.error);
        }
    };

    const handleScan = async (data) => {
        // data format: { it: 'ID', nt: 'Name', at: 'City', ws: 'Cabang' ... }
        const customer = {
            id: data.it,
            nama: data.nt,
            kota: data.at || '',
            cabang: manualForm.cabang || data.ws || '', // Prioritize selected branch event
        };
        await performCheckIn(customer);
    };

    const performCheckIn = async (customer) => {
        const toastId = toast.loading(`Checking In: ${customer.nama}...`);
        try {
            // OVERWRITE: Always record the EVENT LOCATION (manualForm.cabang)
            customer.cabang = manualForm.cabang;

            const res = await checkInCustomer(customer);
            if (res.success) {
                toast.success(`Hadir: ${customer.nama} (${customer.kota}) di ${customer.cabang}`, { id: toastId, duration: 4000 });
                if (activeTab === 'list') fetchAttendance(); // Refresh list if visible
            } else {
                toast.error(`Gagal: ${res.error}`, { id: toastId, duration: 5000 });
            }
        } catch (e) {
            toast.error('Error Check-In', { id: toastId });
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualForm.nama || !manualForm.kota) {
            toast.error('Nama dan Kota wajib diisi!');
            return;
        }

        const toastId = toast.loading('Mendaftarkan & Check-In...');
        const customer = {
            nama: manualForm.nama,
            kota: manualForm.kota,
            cabang: manualForm.cabang,
            telp: manualForm.hp,
        };

        try {
            const res = await addAndCheckIn(customer);
            if (res.success) {
                toast.success(`Sukses! ${manualForm.nama} terdaftar & hadir.`, { id: toastId });
                // Stick Branch, Reset others
                setManualForm(prev => ({ ...prev, nama: '', kota: '', hp: '' }));
                setSearchQuery(''); // Reset search
                // Sync to update global list if possible (silent)
                syncCustomers(true);
            } else {
                toast.error(`Gagal: ${res.error}`, { id: toastId });
            }
        } catch (error) {
            toast.error('Network Error', { id: toastId });
        }
    };

    // Select existing customer from search
    const handleSelectCustomer = (customer) => {
        if (window.confirm(`Check-In atas nama ${customer.nama} (${customer.kota}) di cabang ${manualForm.cabang}?`)) {
            performCheckIn({
                id: customer.id,
                nama: customer.nama,
                kota: customer.kota,
                cabang: manualForm.cabang // Use currently selected branch context
            });
            setSearchQuery('');
        }
    };

    const setBranch = (br) => {
        localStorage.setItem('qr:lastBranch', br);
        setManualForm(prev => ({ ...prev, cabang: br }));
    };

    return (
        <div className="page-card" style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* UNIFIED HEADER */}
            <div className="search-header-container" style={{ marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, color: '#333', fontSize: '1.6rem' }}> {/* Removed custom brand font */}
                        Buku Tamu
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
                        Pilih Mode Scan atau Cek List Kehadiran
                    </p>
                </div>

                {/* UNIFIED TABS (Segmented Control) */}
                <div className="view-toggles">
                    <button
                        className={`view-btn ${activeTab === 'checkin' ? 'active' : ''}`}
                        onClick={() => setActiveTab('checkin')}
                    >
                        <Icons.Scan size={16} /> Scan / Input
                    </button>
                    <button
                        className={`view-btn ${activeTab === 'list' ? 'active' : ''}`}
                        onClick={() => setActiveTab('list')}
                    >
                        <span style={{ fontSize: 16 }}>📋</span> List Hadir
                    </button>
                </div>
            </div>

            {activeTab === 'checkin' && (
                <div className="checkin-view">
                    {!showManual ? (
                        /* SCANNER VIEW */
                        <>
                            {!isOnline && (
                                <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, color: '#991b1b', marginBottom: 15, fontSize: 13, border: '1px solid #fecaca' }}>
                                    ⚠️ Offline Mode: Scan QR mungkin tidak dapat mencatat kehadiran ke server.
                                </div>
                            )}
                            <div style={{ marginBottom: 20 }}>
                                <QRScanner onScan={handleScan} />
                            </div>

                            <div style={{ textAlign: 'center', marginTop: 20 }}>
                                <button
                                    className="action-btn secondary"
                                    onClick={() => setShowManual(true)}
                                    style={{ padding: '12px 24px', width: 'auto' }}
                                >
                                    <Icons.Search size={16} /> Kembali ke Input Manual
                                </button>
                            </div>
                        </>
                    ) : (
                        <GuestBookForm
                            showScanner={!showManual}
                            setShowScanner={(val) => setShowManual(!val)} // Invert logic for clarity
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            searchResults={searchResults} // Uses new Weighted Results
                            handleSelectCustomer={handleSelectCustomer}
                            manualForm={manualForm}
                            setManualForm={setManualForm}
                            handleManualSubmit={handleManualSubmit}
                            setBranch={setBranch}
                            isOnline={isOnline}
                        />
                    )}
                </div>
            )}

            {activeTab === 'list' && (
                <GuestBookList
                    attendees={attendees}
                    loading={loading}
                    filterDate={filterDate}
                    setFilterDate={setFilterDate}
                    onRefresh={fetchAttendance}
                />
            )}
        </div>
    );
}
