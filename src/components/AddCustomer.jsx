import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { addCustomer } from '../services/customerService';
import { validateCustomer } from '../schemas/validationSchemas';
import { ApiError } from '../services/api';
import { addHistory } from '../utils/history';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useCustomer } from '../context/CustomerContext';
import { Icons } from './Icons';
import CustomerForm from './CustomerForm'; // Import reused component
import './AddCustomer.css';

export default function AddCustomer({ onAdd }) {
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { isOnline } = useNetworkStatus();
  const { syncCustomers } = useCustomer();

  // Auto-Sync on Mount (Silent) to ensure duplicate check is fresh
  useEffect(() => {
    if (isOnline) {
      syncCustomers(true);
    }
  }, [isOnline, syncCustomers]);

  const handleAddSubmit = async (upperCasedData) => {
    // Block submission if offline
    if (!isOnline) {
      toast.error('Tidak bisa menambah customer saat offline. Periksa koneksi internet.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Menambahkan customer...');

    try {
      // Validate with Zod schema
      const validatedData = validateCustomer(upperCasedData);

      // Call service layer (with automatic retry)
      const result = await addCustomer(validatedData);

      toast.success('Customer berhasil ditambahkan!', { id: toastId });

      addHistory('ADD', {
        customerId: result.id || 'AUTO',
        nama: validatedData.nama,
        kota: validatedData.kota,
        cabang: validatedData.cabang,
      });

      setFormKey(prev => prev + 1);
      if (onAdd) onAdd(result);

    } catch (error) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        const firstError = error.errors[0];
        toast.error(`Validasi gagal: ${firstError.message}`, { id: toastId });
      }
      // Handle API errors
      else if (error instanceof ApiError) {
        toast.error(`Gagal menambahkan: ${error.message}`, { id: toastId });
      }
      // Handle unexpected errors
      else {
        toast.error('Terjadi kesalahan: ' + error.message, { id: toastId });
        console.error('AddCustomer error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-customer page-card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icons.Plus size={24} />
        Tambah Customer Baru
      </h2>

      {/* Offline Warning Banner */}
      {!isOnline && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '10px 15px',
          borderRadius: 8,
          marginBottom: 15,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>⚠️</span>
          <span>Anda sedang offline. Fitur ini membutuhkan koneksi internet.</span>
        </div>
      )}

      <CustomerForm
        key={formKey}
        onSubmit={handleAddSubmit}
        isLoading={loading || !isOnline}
        submitLabel={isOnline ? "Tambah Customer" : "Offline - Tidak Tersedia"}
      />
    </div>
  );
}

