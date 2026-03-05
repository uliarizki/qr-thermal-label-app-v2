import { useState, useEffect } from 'react';
import { Icons } from './Icons';
import './AddCustomer.css';
import { useCustomer } from '../context/CustomerContext';
import { generateCustomerId } from '../utils/idGenerator';

export default function CustomerForm({
    initialValues,
    onSubmit,
    isLoading,
    submitLabel = "Simpan",
    isEditMode = false
}) {
    // Default Empty State
    const defaultState = {
        id: '',
        nama: '',
        kota: '',
        sales: '',
        pabrik: '',
        telp: '',
        cabang: 'BT SMG'
    };

    const [formData, setFormData] = useState(defaultState);

    // Initialize/Update form data when initialValues change
    useEffect(() => {
        if (initialValues) {
            setFormData(prev => ({
                ...prev,
                ...initialValues,
                // Ensure existing branch preference is respected if not provided in initialValues
                cabang: initialValues.cabang || prev.cabang
            }));
        } else {
            // If no initial values (Add Mode), try to load saved branch
            const savedBranch = localStorage.getItem('qr:lastBranch');
            if (savedBranch) {
                setFormData(prev => ({ ...prev, cabang: savedBranch }));
            }
        }
    }, [initialValues]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));

        // Persist Cabang Selection only in Add Mode
        if (name === 'cabang' && !isEditMode) {
            localStorage.setItem('qr:lastBranch', value);
        }
    };

    const setBranch = (br) => {
        // In Edit Mode, we might want to restrict changing branch? 
        // For now, let's allow it but not auto-persist as "preference" for next add.
        if (!isEditMode) localStorage.setItem('qr:lastBranch', br);

        setFormData(prev => ({
            ...prev,
            cabang: br
        }));
    };

    // Access customers for duplicate check and ID generation
    const { customers } = useCustomer();

    // Auto-Generate ID when Branch changes (only if ID is empty and NOT in edit mode)
    useEffect(() => {
        if (!isEditMode && formData.cabang) {
            const newId = generateCustomerId(formData.cabang, customers || []);
            setFormData(prev => ({ ...prev, id: newId }));
        }
    }, [formData.cabang, isEditMode]); // We only want to trigger on branch change or mount

    const handleSubmit = (e) => {
        e.preventDefault();

        // 1. Force ID Generation if Empty (Safety Net)
        let finalId = formData.id;
        if (!isEditMode && !finalId && formData.cabang) {
            finalId = generateCustomerId(formData.cabang, customers || []);
            // Update state for UI immediately (though component might unmount/reset)
            setFormData(prev => ({ ...prev, id: finalId }));
        }

        // 2. Prepare Data
        const upperCasedData = {};
        Object.keys(formData).forEach(key => {
            let val = formData[key];

            // Use the forced ID if 'id' key
            if (key === 'id') val = finalId;

            upperCasedData[key] = typeof val === 'string' ? val.toUpperCase() : val;
        });

        // 3. DUPLICATE CHECK (Only in Add Mode)
        if (!isEditMode && customers) {
            const isDuplicate = customers.some(c =>
                c.nama === upperCasedData.nama &&
                c.kota === upperCasedData.kota &&
                c.cabang === upperCasedData.cabang
            );

            if (isDuplicate) {
                if (!window.confirm(
                    `⚠️ DUPLICATE WARNING ⚠️\n\nA customer with the name "${upperCasedData.nama}" in "${upperCasedData.kota}" (${upperCasedData.cabang}) already exists.\n\nAre you sure you want to add this duplicate?`
                )) {
                    return; // Abort submission
                }
            }
        }

        onSubmit(upperCasedData);
    };

    return (
        <div className="customer-form">
            {/* BRANCH CONTEXT SELECTOR */}
            <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
                    Lokasi Data (Cabang) <span className="required">*</span>
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                    {['BT SMG', 'BT JKT', 'BT SBY'].map(br => (
                        <button
                            key={br}
                            type="button"
                            onClick={() => setBranch(br)}
                            style={{
                                flex: 1, padding: '12px',
                                border: formData.cabang === br ? '2px solid #D4AF37' : '1px solid #ddd',
                                background: formData.cabang === br ? '#fffdf5' : 'white',
                                color: formData.cabang === br ? '#D4AF37' : '#666',
                                borderRadius: 8, cursor: 'pointer',
                                fontWeight: formData.cabang === br ? 'bold' : 'normal',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {br}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* MANDATORY FIELDS */}
                <div className="form-section">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#f59e0b' }}>⭐</span> Data Wajib
                    </h3>

                    <div className="form-group">
                        <label>Nama Customer <span className="required">*</span></label>
                        <input
                            type="text"
                            name="nama"
                            value={formData.nama}
                            onChange={handleChange}
                            placeholder="Contoh: REJEKI BANJAR NEGARA"
                            maxLength="100"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Kota <span className="required">*</span></label>
                        <input
                            type="text"
                            name="kota"
                            value={formData.kota}
                            onChange={handleChange}
                            placeholder="Contoh: SEMARANG"
                            maxLength="50"
                            required
                        />
                    </div>
                </div>

                {/* OPTIONAL FIELDS */}
                <div className="form-section">
                    <h3>📋 Data Tambahan (Opsional)</h3>

                    <div className="form-group">
                        <label>ID Customer</label>
                        <input
                            type="text"
                            name="id"
                            value={formData.id}
                            onChange={handleChange}
                            onFocus={(e) => e.target.select()} // Auto-select all text on click/tap
                            placeholder="Kosongkan jika belum ada ID" // ID usually shouldn't be edited if it's the key, but user might want to fix it.
                            maxLength="20"
                            disabled={isEditMode} // Disable ID editing in Edit Mode to prevent breaking references
                            style={isEditMode ? { background: '#f5f5f5', color: '#999' } : {}}
                        />
                        {isEditMode && <small>💡 ID tidak dapat diubah</small>}
                        {!isEditMode && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <small>💡 Otomatis dibuat sesuai Cabang</small>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (formData.cabang) {
                                            const newId = generateCustomerId(formData.cabang, customers || []);
                                            setFormData(prev => ({ ...prev, id: newId }));
                                        }
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#D4AF37', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                                >
                                    ↻ Generate Ulang
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Sales (Wholesaler)</label>
                        <input
                            type="text"
                            name="sales"
                            value={formData.sales}
                            onChange={handleChange}
                            placeholder="Customer under customer (optional)"
                            maxLength="50"
                        />
                    </div>

                    <div className="form-group">
                        <label>Pabrik</label>
                        <input
                            type="text"
                            name="pabrik"
                            value={formData.pabrik}
                            onChange={handleChange}
                            placeholder="Nama pabrik"
                            maxLength="50"
                        />
                    </div>

                    <div className="form-group">
                        <label>Nomor Telepon</label>
                        <input
                            type="tel"
                            name="telp"
                            value={formData.telp}
                            onChange={handleChange}
                            placeholder="Contoh: 08132776777"
                            maxLength="20"
                        />
                    </div>
                </div>

                {/* BUTTON */}
                <button type="submit" disabled={isLoading} className="action-btn primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {isLoading ? (
                        <>
                            <span className="spin"><Icons.Refresh size={20} /></span>
                            <span>Memproses...</span>
                        </>
                    ) : (
                        <>
                            <Icons.Check size={20} />
                            <span>{submitLabel}</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
