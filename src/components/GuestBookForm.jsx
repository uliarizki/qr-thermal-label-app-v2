import React from 'react';
import { Icons } from './Icons'; // Unified Icons
import '../App.css';

export default function GuestBookForm({
    showScanner,
    setShowScanner,
    searchQuery,
    setSearchQuery,
    searchResults,
    handleSelectCustomer,
    manualForm,
    setManualForm,
    handleManualSubmit,
    setBranch,
    isOnline = true // Default true to prevent breaking if prop missing
}) {
    return (
        <div className="manual-form" style={{ padding: 20, background: '#f8f9fa', borderRadius: 12, border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#444' }}>Input Tamu / Member</h3>
                {/* Button to switch to Scanner */}
                <button
                    onClick={() => setShowScanner(true)}
                    className="action-btn secondary"
                    style={{ padding: '8px 12px', fontSize: 13 }}
                >
                    <Icons.Scan size={16} /> Buka Scanner
                </button>
            </div>

            {/* SEARCH BAR (Moved Uppermost) */}
            <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#666' }}>
                    Cari Member (ID / Nama)
                </label>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 12, top: 12, color: '#999' }}><Icons.Search size={18} /></div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ketik nama atau ID..."
                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                    />
                </div>

                {/* Search Results */}
                {searchQuery && (
                    <div style={{ marginTop: 8, border: '1px solid #eee', borderRadius: 8, background: 'white', maxHeight: 250, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        {searchResults.length > 0 ? (
                            searchResults.map(cust => (
                                <div
                                    key={cust.id}
                                    onClick={() => handleSelectCustomer(cust)}
                                    style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <div style={{ fontWeight: 600, color: '#333' }}>{cust.nama}</div>
                                            {cust.cabang && (
                                                <span style={{
                                                    fontSize: 10,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    border: cust.cabang.includes('SBY') ? '1px solid #fde047' :
                                                        cust.cabang.includes('SMG') ? '1px solid #86efac' :
                                                            '1px solid #e5e7eb',
                                                    background: cust.cabang.includes('SBY') ? '#fefce8' :
                                                        cust.cabang.includes('SMG') ? '#f0fdf4' :
                                                            '#f9fafb',
                                                    color: '#444',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {cust.cabang}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#666' }}>{cust.kota} | <span style={{ fontFamily: 'monospace' }}>{cust.id}</span></div>
                                    </div>
                                    <button
                                        className="action-btn primary"
                                        style={{
                                            padding: '6px 12px', fontSize: 12, minWidth: 'auto', height: 30,
                                            opacity: isOnline ? 1 : 0.5, cursor: isOnline ? 'pointer' : 'not-allowed'
                                        }}
                                        onClick={() => isOnline ? handleSelectCustomer(cust) : null}
                                        title={isOnline ? "Pilih" : "Offline"}
                                    >
                                        {isOnline ? 'Pilih' : 'Offline'}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: 16, fontStyle: 'italic', color: '#999', textAlign: 'center' }}>
                                Data tidak ditemukan. Silakan isi form manual di bawah.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ margin: '24px 0', borderTop: '1px dashed #ddd' }}></div>

            {/* NEW USER FORM */}
            <h4 style={{ marginTop: 0, marginBottom: 15, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📝</span> Formulir Tamu Baru
            </h4>
            <form onSubmit={handleManualSubmit}>
                {/* BRANCH CONTEXT SELECTOR (Moved Here) */}
                <div className="form-group" style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#555' }}>
                        Lokasi Acara (Cabang)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {['BT SMG', 'BT JKT', 'BT SBY'].map(br => (
                            <button
                                key={br}
                                type="button"
                                onClick={() => setBranch(br)}
                                style={{
                                    padding: '12px 4px',
                                    border: manualForm.cabang === br ? '2px solid #D4AF37' : '1px solid #e5e7eb',
                                    background: manualForm.cabang === br ? '#fffdf5' : 'white',
                                    color: manualForm.cabang === br ? '#D4AF37' : '#666',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontWeight: manualForm.cabang === br ? 'bold' : 'normal',
                                    fontSize: 13,
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}
                            >
                                {br}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 600 }}>Nama Lengkap</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={manualForm.nama}
                            onChange={(e) => setManualForm({ ...manualForm, nama: e.target.value })}
                            placeholder="Contoh: Budi Santoso"
                            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd' }}
                            required={!searchQuery} // Required only if manually adding
                        />
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 600 }}>Kota Asal</label>
                    <input
                        type="text"
                        value={manualForm.kota}
                        onChange={(e) => setManualForm({ ...manualForm, kota: e.target.value })}
                        placeholder="Contoh: Surabaya"
                        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd' }}
                        required={!searchQuery}
                    />
                </div>
                <div className="form-group" style={{ marginBottom: 25 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 600 }}>No. HP (Opsional)</label>
                    <input
                        type="tel"
                        value={manualForm.hp}
                        onChange={(e) => setManualForm({ ...manualForm, hp: e.target.value })}
                        placeholder="081..."
                        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd' }}
                    />
                </div>

                <button
                    type="submit"
                    className="login-btn"
                    style={{
                        marginTop: 10,
                        background: isOnline ? 'linear-gradient(135deg, #D4AF37 0%, #B59024 100%)' : '#ccc',
                        color: isOnline ? '#000' : '#666',
                        cursor: isOnline ? 'pointer' : 'not-allowed'
                    }}
                    disabled={!isOnline}
                    title={isOnline ? "Simpan" : "Offline - Tidak dapat menyimpan"}
                >
                    {isOnline ? 'Simpan & Hadir' : 'Offline - Tidak Tersedia'}
                </button>
            </form>
        </div>
    );
}
