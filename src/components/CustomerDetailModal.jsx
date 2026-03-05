// Imports
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import PrintPreview from './PrintPreview';
import DigitalCard from './DigitalCard';
import CustomerForm from './CustomerForm';
import { Icons } from './Icons';
import { addHistory } from '../utils/history';
import { editCustomer, deleteCustomer } from '../utils/googleSheets';
import { shareOrDownload, downloadBlob } from '../utils/shareUtils';
import { generateCardBlob } from '../utils/cardGenerator';
import { useModalHistory } from '../hooks/useModalHistory';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function CustomerDetailModal({ customer, onClose }) {
    const [activeTab, setActiveTab] = useState('thermal'); // 'thermal' | 'digital'
    const [isDownloading, setIsDownloading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { isOnline } = useNetworkStatus();

    const digitalCardRef = useRef(null);

    // History Management
    const handleManualClose = useModalHistory(onClose, 'customer-detail');

    // Reset Edit Mode when customer changes
    useEffect(() => {
        setIsEditing(false);
    }, [customer]);

    // Add history on mount (Log usage)
    useEffect(() => {
        if (customer && !customer.skipHistoryLog) {
            addHistory('SEARCH_SELECT', {
                query: customer.id,
                customerId: customer.id,
                customerName: customer.nama,
                kota: customer.kota,
                telp: customer.telp,
                cabang: customer.cabang || customer.pabrik,
                kode: customer.kode
            });
        }
    }, [customer]);

    // Handle Esc Key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && !isEditing && !isSaving) handleManualClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isEditing, isSaving, handleManualClose]);

    // Helper to generate blob from card
    const getCardBlob = async () => {
        if (!digitalCardRef.current) return null;
        return await generateCardBlob(digitalCardRef.current);
    };

    const getFilename = () => {
        const cleanName = (customer.nama || 'CUSTOMER').replace(/[\\/:*?"<>|]/g, ' ').trim();
        const cleanCity = (customer.kota || 'CITY').replace(/[\\/:*?"<>|]/g, ' ').trim();
        return `${cleanName}_${cleanCity}_${customer.id}.png`;
    };

    const handleDownloadImage = async () => {
        try {
            setIsDownloading(true);
            const blob = await getCardBlob();
            if (!blob) throw new Error("Failed to generate blob");

            const filename = getFilename();
            downloadBlob(blob, filename);
            toast.success('Gambar berhasil disimpan!');
        } catch (err) {
            console.error(err);
            toast.error('Gagal menyimpan gambar');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShareImage = async () => {
        try {
            setIsDownloading(true);
            const blob = await getCardBlob();
            if (!blob) throw new Error("Failed to generate blob");

            const filename = getFilename();
            await shareOrDownload(
                blob,
                filename,
                'Digital ID Card',
                `Digital ID for ${customer.nama}`,
                'image/png'
            );
        } catch (err) {
            console.error(err);
            toast.error('Error saat generate gambar');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleEditSubmit = async (updatedData) => {
        setIsSaving(true);
        const toastId = toast.loading('Menyimpan perubahan...');
        try {
            const payload = { ...updatedData, id: customer.id };
            const res = await editCustomer(payload);
            if (res.success) {
                toast.success('Data berhasil diperbarui!', { id: toastId });
                setIsEditing(false);
                handleManualClose();
            } else {
                toast.error('Gagal update: ' + res.error, { id: toastId });
            }
        } catch (e) {
            toast.error('Error saving data', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isOnline) {
            toast.error('Hapus data hanya bisa saat ONLINE');
            return;
        }

        if (window.confirm(`⚠️ Yakin ingin MENGHAPUS customer ini?\n\n${customer.nama}\n(${customer.kota})\n\nTindakan ini tidak dapat dibatalkan!`)) {
            const toastId = toast.loading('Menghapus data...');
            try {
                const res = await deleteCustomer(customer.id);
                if (res.success) {
                    toast.success('Data berhasil dihapus', { id: toastId });
                    handleManualClose();
                    // Optional: Trigger global refresh? The list is cached, so might need a forced reload next time or manual state update if possible.
                    // But typically clearing cache (done in utils) + close is enough for next fetch.
                    if (typeof window !== 'undefined') window.location.reload(); // Simple brute force to refresh list
                } else {
                    toast.error('Gagal hapus: ' + res.error, { id: toastId });
                }
            } catch (e) {
                toast.error('Error deleting data', { id: toastId });
            }
        }
    };

    if (!customer) return null;

    return (
        <div className="modal-overlay" onClick={handleManualClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isEditing ? 'Edit Customer' : 'Detail Customer'}
                    </h3>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {!isEditing && customer.id && (
                            <button
                                className={`action-btn ${isOnline ? 'secondary' : 'disabled'}`}
                                onClick={() => isOnline ? setIsEditing(true) : toast.error('Edit tidak tersedia saat offline')}
                                disabled={!isOnline}
                                title={isOnline ? "Edit Customer" : "Offline - Edit tidak tersedia"}
                                style={{ padding: '8px', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Icons.Edit size={20} />
                            </button>
                        )}
                        {!isEditing && customer.id && (
                            <button
                                className={`action-btn ${isOnline ? 'danger' : 'disabled'}`}
                                onClick={handleDelete}
                                disabled={!isOnline}
                                title={isOnline ? "Hapus Customer" : "Offline - Hapus tidak tersedia"}
                                style={{ padding: '8px', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Icons.Trash size={20} />
                            </button>
                        )}
                        <button className="close-btn" onClick={isEditing ? () => setIsEditing(false) : handleManualClose}>
                            <Icons.Close size={24} />
                        </button>
                    </div>
                </div>

                {isEditing ? (
                    <div style={{ padding: 20 }}>
                        <div style={{ marginBottom: 15, padding: 10, background: '#fffbeb', borderRadius: 8, fontSize: 13, color: '#92400e', border: '1px solid #fcd34d' }}>
                            ⚠️ Perubahan akan langsung disimpan ke database utama. ID tidak dapat diubah.
                        </div>
                        <CustomerForm
                            initialValues={customer}
                            onSubmit={handleEditSubmit}
                            isLoading={isSaving}
                            submitLabel="Simpan Perubahan"
                            isEditMode={true}
                        />
                    </div>
                ) : (
                    <>
                        <div className="modal-tabs">
                            <button
                                className={`tab-btn ${activeTab === 'thermal' ? 'active' : ''}`}
                                onClick={() => setActiveTab('thermal')}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                            >
                                <Icons.Scan size={16} />
                                <span>Thermal Print</span>
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'digital' ? 'active' : ''}`}
                                onClick={() => setActiveTab('digital')}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                            >
                                <Icons.User size={16} />
                                <span>Digital ID</span>
                            </button>
                        </div>

                        <div className="modal-body">
                            {activeTab === 'thermal' ? (
                                <>
                                    <div className="customer-detail" style={{ width: '100%' }}>
                                        <p><strong>ID:</strong> {customer.id}</p>
                                        <p><strong>Nama:</strong> {customer.nama}</p>
                                        <p><strong>Kota:</strong> {customer.kota}</p>
                                        <p><strong>Cabang:</strong> {customer.cabang || customer.sales || customer.pabrik}</p>
                                        <p><strong>Telp:</strong> {customer.telp}</p>
                                    </div>
                                    <PrintPreview
                                        data={{
                                            it: customer.id,
                                            nt: customer.nama,
                                            at: customer.kota,
                                            pt: customer.sales || customer.pabrik,
                                            ws: customer.cabang,
                                            raw: customer.kode,
                                        }}
                                    />
                                </>
                            ) : (
                                <>
                                    <DigitalCard
                                        ref={digitalCardRef}
                                        customer={customer}
                                    />
                                    <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                                        <button
                                            className="download-btn"
                                            onClick={handleDownloadImage}
                                            disabled={isDownloading}
                                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                        >
                                            <Icons.Download size={18} />
                                            <span>Save Image</span>
                                        </button>
                                        {navigator.share && (
                                            <button
                                                className="download-btn"
                                                onClick={handleShareImage}
                                                disabled={isDownloading}
                                                style={{
                                                    flex: 1,
                                                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                                }}
                                            >
                                                <Icons.Share size={18} />
                                                <span>Share</span>
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
