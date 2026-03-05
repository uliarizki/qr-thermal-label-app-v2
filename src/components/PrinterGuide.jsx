import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import './PrinterGuide.css';

/**
 * PrinterGuide Component
 * Tutorial for printer driver installation using WinUSB (via Zadig) for WebUSB
 * Uses Standardized Modal and UI Components
 */
const PrinterGuide = ({ onClose }) => {
    const [activeSection, setActiveSection] = useState('overview');

    const sections = [
        { id: 'overview', title: '📋 Ikhtisar', icon: <Icons.Search size={14} /> },
        { id: 'android', title: '📱 Android', icon: <Icons.User size={14} /> },
        { id: 'windows', title: '💻 Windows', icon: <Icons.Settings size={14} /> },
        { id: 'troubleshoot', title: '🔧 Masalah', icon: <Icons.Alert size={14} /> },
    ];

    // Handle Esc Key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

                {/* HEADER */}
                <div className="modal-header">
                    <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        🖨️ Panduan Printer
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        <Icons.X size={24} />
                    </button>
                </div>

                {/* TABS (Standardized) */}
                <div className="modal-tabs" style={{ padding: '10px 20px', borderBottom: '1px solid #eee', background: 'white' }}>
                    <div className="view-toggles" style={{ width: '100%' }}>
                        {sections.map(section => (
                            <button
                                key={section.id}
                                className={`view-btn ${activeSection === section.id ? 'active' : ''}`}
                                onClick={() => setActiveSection(section.id)}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                {section.title}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="guide-content">
                    {activeSection === 'overview' && (
                        <div className="fade-in">
                            <h3>Tentang WebUSB Printing</h3>
                            <div className="method-grid">
                                <div className="method-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <h4>🔌 Direct Print</h4>
                                        <span className="badge gold">Recommended</span>
                                    </div>
                                    <p>Cetak langsung dari browser menggunakan kabel USB. Cepat dan tanpa aplikasi tambahan.</p>
                                    <div style={{ fontSize: 12, color: '#333' }}>
                                        ✅ <strong>Android:</strong> Plug & Play (OTG)<br />
                                        ⚠️ <strong>Windows:</strong> Butuh Zadig WinUSB
                                    </div>
                                </div>
                                <div className="method-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <h4>📄 Share PDF</h4>
                                        <span className="badge gray">Fallback</span>
                                    </div>
                                    <p>Download PDF Label lalu cetak menggunakan aplikasi printer bawaan (RawBT/Printer App).</p>
                                    <div style={{ fontSize: 12, color: '#333' }}>
                                        ✅ <strong>Semua HP:</strong> Support Bluetooth
                                    </div>
                                </div>
                            </div>

                            <div className="info-box warning">
                                <h4>⚠️ Perhatian untuk Windows</h4>
                                <ul>
                                    <li>Windows secara default memblokir akses langsung browser ke USB Printer.</li>
                                    <li>Anda <strong>WAJIB</strong> mengganti driver printer menjadi <strong>WinUSB</strong> menggunakan tool <strong>Zadig</strong>.</li>
                                    <li>Lihat tab "Windows" untuk panduan lengkap.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeSection === 'android' && (
                        <div className="fade-in">
                            <h3>📱 Setup Android (USB OTG)</h3>
                            <div className="info-box">
                                <h4>✅ Native Support</h4>
                                <p>Android modern sudah mendukung akses USB langsung. Tidak perlu driver khusus.</p>
                            </div>

                            <div className="step-list">
                                <Step num="1" title="Siapkan Kabel OTG" text="Gunakan adapter USB OTG (Type-C ke USB-A) untuk menghubungkan kabel printer ke HP." />
                                <Step num="2" title="Hubungkan & Nyalakan" text="Colok kabel USB dan nyalakan Printer Thermal (biasanya lampu biru/hijau menyala)." />
                                <Step num="3" title="Buka Chrome" text="Pastikan menggunakan Google Chrome versi terbaru." />
                                <Step num="4" title="Connect di Aplikasi" text="Klik tombol 'Connect Printer' di Batch Tools. Pilih printer yang muncul (e.g., 'USB Printing Support')." />
                            </div>
                        </div>
                    )}

                    {activeSection === 'windows' && (
                        <div className="fade-in">
                            <h3>💻 Setup Windows (Zadig)</h3>
                            <p style={{ marginBottom: 20 }}>Ikuti langkah ini SEKALI saja untuk menginstal driver WinUSB.</p>

                            <div className="step-list">
                                <Step num="1" title="Download Zadig"
                                    text={<span>Tool gratis untuk mengganti driver USB. <br /><a href="https://zadig.akeo.ie/" target="_blank" className="btn-download">📥 Download Zadig 2.8</a></span>}
                                />
                                <Step num="2" title="Buka Zadig" text="Jalan file exe tersebut. Tidak perlu diinstall, langsung jalan." />
                                <Step num="3" title="List All Devices" text="Di menu Zadig, klik 'Options' -> 'List All Devices'." />
                                <Step num="4" title="Pilih Printer" text="Di dropdown, cari nama printer (biasanya 'POS58', 'RPP02', atau 'USB Printing Support')." />
                                <Step num="5" title="Ganti ke WinUSB" text={<span>Geser driver tujuan (kanan) menjadi <strong>WinUSB (v6.1...)</strong>. Lalu klik tombol besar <strong>Replace Driver / Install Driver</strong>.</span>} />
                                <Step num="6" title="Selesai" text="Tunggu sampai 'Success'. Refresh halaman aplikasi ini dan coba Connect lagi." />
                            </div>
                        </div>
                    )}

                    {activeSection === 'troubleshoot' && (
                        <div className="fade-in">
                            <h3>🔧 Pemecahan Masalah</h3>
                            <div className="faq-item">
                                <h4>❌ Printer Tidak Muncul di List</h4>
                                <p style={{ fontSize: 13, color: '#555' }}>Pastikan kabel USB kencang dan printer NYALA. Di Windows, pastikan sudah pakai Zadig. Coba cabut-colok USB.</p>
                            </div>
                            <div className="faq-item">
                                <h4>❌ Access Denied / Failed to Open</h4>
                                <p style={{ fontSize: 13, color: '#555' }}>Driver belum diganti ke WinUSB (Windows), atau tab lain sedang menggunakan printer (tutup tab lain).</p>
                            </div>
                            <div className="faq-item">
                                <h4>❌ Hasil Cetak Aneh / Kosong</h4>
                                <p style={{ fontSize: 13, color: '#555' }}>Cek pemasangan kertas (jangan terbalik). Cek setting ukuran kertas di Batch Tools (Standar: 50x30mm).</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper Subcomponent
const Step = ({ num, title, text }) => (
    <div className="step-item">
        <div className="step-num">{num}</div>
        <div className="step-body">
            <h4>{title}</h4>
            <p>{text}</p>
        </div>
    </div>
);

export default PrinterGuide;
