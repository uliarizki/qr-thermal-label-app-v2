import React from 'react';
import { Icons } from './Icons'; // Unified Icons

export default function GuestBookList({
    attendees,
    loading,
    filterDate,
    setFilterDate,
    onRefresh
}) {
    // Filter logic
    const filteredAttendees = attendees.filter(guest => {
        if (!guest.timestamp) return false;
        const guestDate = new Date(guest.timestamp).toISOString().split('T')[0];
        return guestDate === filterDate;
    });

    const isToday = filterDate === new Date().toISOString().split('T')[0];

    return (
        <div className="attendance-list" style={{ padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#444' }}>
                    Daftar Hadir
                </h3>
                <div style={{ fontSize: 13, color: '#666', background: '#f5f5f5', padding: '4px 10px', borderRadius: 20 }}>
                    {new Date(filterDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
                <div className="date-input-wrapper" style={{ position: 'relative' }}>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            border: '1px solid #ddd',
                            fontSize: 14,
                            fontFamily: 'inherit',
                            outline: 'none',
                            background: '#fff'
                        }}
                    />
                </div>

                <button
                    onClick={onRefresh}
                    className="action-btn secondary"
                    title="Refresh Data"
                    style={{ padding: '10px', width: 42, height: 42, minWidth: 42 }}
                >
                    <Icons.Refresh size={20} />
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    <span className="spin" style={{ display: 'inline-block', marginBottom: 10 }}><Icons.Refresh size={24} /></span>
                    <p>Memuat data...</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 600 }}>
                        <thead style={{ background: '#f8f9fa' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Jam</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Nama Tamu</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Lokasi Acara</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Kota Asal</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAttendees.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                                        <div style={{ marginBottom: 10, fontSize: 24 }}>📭</div>
                                        {isToday ? "Belum ada tamu hari ini." : "Tidak ada data untuk tanggal ini."}
                                    </td>
                                </tr>
                            ) : (
                                filteredAttendees.map((guest, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }} className="table-row-hover">
                                        <td style={{ padding: '12px 16px', color: '#666', fontFamily: 'monospace' }}>
                                            {new Date(guest.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#333' }}>{guest.nama}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                background: '#f3f4f6',
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                fontSize: 11,
                                                border: '1px solid #e5e7eb',
                                                color: '#4b5563',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>
                                                📍 {guest.cabang || '-'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#666' }}>{guest.kota}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{
                                                background: '#ecfdf5',
                                                color: '#059669',
                                                padding: '4px 10px',
                                                borderRadius: 20,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                border: '1px solid #d1fae5'
                                            }}>
                                                ✔ Hadir
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
