// src/utils/googleSheets.js

// API URL from environment variable (see .env file)
const WEB_APP_URL = import.meta.env.VITE_GAS_WEBAPP_URL;
// Feature Guest Book: Attendance
const CACHE_ATTENDANCE_KEY = 'qr:attendance'; // Minimal caching for offline
const CACHE_KEY = 'qr:customersData';
const CACHE_TIME_KEY = 'qr:cacheTime';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 jam (kita gunakan manual sync untuk update)

let customerCache = null;

// Load initial cache from storage
if (typeof window !== 'undefined') {
  try {
    const savedData = localStorage.getItem(CACHE_KEY);
    if (savedData) {
      customerCache = JSON.parse(savedData);
    }
  } catch (e) {
    console.error('Error loading cache', e);
  }
}

async function callApi(action, payload = null) {
  if (!WEB_APP_URL || WEB_APP_URL === 'undefined') {
    return { success: false, error: 'Configuration Error: VITE_GAS_WEBAPP_URL is missing or invalid' };
  }

  // 0. STRICT OFFLINE CHECK
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, error: 'OFFLINE_MODE: Tidak ada koneksi internet.' };
  }

  try {
    // 1. Setup Parameters
    // We send 'action' via URL query param for maximum reliability with Google Apps Script
    // and the rest of the data in the POST body.
    const url = new URL(WEB_APP_URL);
    url.searchParams.set('action', action);

    const res = await fetch(url.toString(), {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const json = await res.json();

    if (!json.success) {
      throw new Error(json.error || 'Unknown error from Apps Script'); // API returns { success: false, error: 'msg' }
    }

    return { success: true, data: json.data };
  } catch (error) {
    console.error('Error callApi:', error);

    // --- GRACEFUL FALLBACK FOR CORS/NETWORK ERROR ---
    // Only apply fallback if we are ONLINE. If offline, it's a real error.
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (isOnline && (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))) {
      console.warn('⚠️ CORS/Network Error detected on', action, '- Assuming success via Fallback.');
      return {
        success: true,
        data: { message: 'Saved via Fallback' },
        isFallback: true
      };
    }

    return { success: false, error: error.message };
  }
}

function formatCustomer(row) {
  return {
    no: row.no,
    id: row.id,
    nama: row.nama,
    kota: row.kota,
    sales: row.sales,
    pabrik: row.pabrik,
    cabang: row.cabang,
    telp: row.telp,
    kode: row.kode,
  };
}

// === EXPORTS ===

/* --- AUTHENTICATION API --- */

export async function loginUser(username, password) {
  return await callApi('login', { username, password });
}

export async function registerUser(username, password, role, creatorRole) {
  return await callApi('register', { username, password, role, creatorRole });
}

export async function getUsers(role) {
  return await callApi('getUsers', { role });
}

export async function deleteUser(username, role, targetUser) {
  return await callApi('deleteUser', { username, role, targetUser });
}

export async function requestPasswordReset(username) {
  return await callApi('requestPasswordReset', { username });
}

export async function verifyOTPAndReset(username, otp, newPassword) {
  return await callApi('resetPasswordWithOTP', { username, otp, newPassword });
}

/* --- HISTORY & LOGGING --- */

export async function logActivity(user, activity, details) {
  // Fire and forget, don't await blocking UI
  callApi('logActivity', { user, activity, details });
}

export async function getGlobalHistory(userRole) {
  return await callApi('getGlobalHistory', { userRole });
}

/* --- GUEST BOOK / ATTENDANCE --- */

export async function checkInCustomer(customer) {
  return await callApi('checkIn', { customer });
}

export async function addAndCheckIn(customer) {
  return await callApi('addAndCheckIn', { customer });
}

export async function getAttendanceList() {
  return await callApi('getAttendance');
}

/* --- CUSTOMER DATA --- */

export function getLastUpdate() {
  if (typeof window === 'undefined') return null;
  const time = localStorage.getItem(CACHE_TIME_KEY);
  return time ? new Date(parseInt(time)) : null;
}

export function getCachedCustomers() {
  // Debug: Check memory cache
  if (customerCache) {
    return customerCache;
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(CACHE_KEY);
    // Debug: Check local storage

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        customerCache = parsed; // Populate memory cache
        return parsed;
      } catch (e) {
        console.error('❌ getCachedCustomers: Failed to parse localStorage', e);
        return null;
      }
    }
  }
  return null;
}

// Ambil semua customer (Cache First Strategy)
export async function getCustomers(forceReload = false) {
  // 1. Return cache jika ada dan tidak force reload
  if (!forceReload) {
    const cached = getCachedCustomers();
    if (cached) {
      return { success: true, data: cached, source: 'cache' };
    }
  }

  // 2. Fetch from API
  const result = await callApi('getCustomers');

  if (result.success) {
    const formattedData = result.data.map(formatCustomer);

    // 3. Update Memory & LocalStorage
    customerCache = formattedData;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      } catch (e) {
        console.error('❌ Failed to save to localStorage', e);
      }
    }

    return { success: true, data: formattedData, source: 'api' };
  }


  // Jika error fetching tapi ada cache lama, kembalikan cache lama saja (fail-safe)
  if (customerCache) {
    console.warn('Fetch failed, falling back to cache');
    return { success: true, data: customerCache, error: result.error, source: 'cache-fallback' };
  }

  return { success: false, error: result.error };
}

export async function getCustomersLite(forceReload = false) {
  // 1. Return cache if available
  const CACHE_KEY_LITE = 'qr:customersLite';
  if (!forceReload && typeof window !== 'undefined') {
    const cached = localStorage.getItem(CACHE_KEY_LITE);
    if (cached) return { success: true, data: JSON.parse(cached), source: 'cache' };
  }

  // 2. Fetch from API
  const result = await callApi('getCustomersLite');

  if (result.success) {
    // 3. Save to LocalStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY_LITE, JSON.stringify(result.data));
    }
    return { success: true, data: result.data, source: 'api' };
  }
  return { success: false, error: result.error };
}

// Tambah customer baru
export async function addCustomer(customerData) {
  if (!customerData.nama || !customerData.kota || !customerData.cabang) {
    return {
      success: false,
      error: 'Nama, Kota, dan Cabang wajib diisi',
    };
  }

  const result = await callApi('addCustomer', { customer: customerData });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Merge input data with result data (so if result is fallback, we still have the input)
  return { success: true, data: { ...customerData, ...result.data } };
}

// Edit existing customer
export async function editCustomer(customerData) {
  if (!customerData.id) {
    return { success: false, error: 'Customer tanpa ID tidak dapat diedit.' };
  }

  const result = await callApi('editCustomer', { customer: customerData });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Clear cache to force reload next time
  clearCache();

  return { success: true, data: result.data };
}

// Delete existing customer
export async function deleteCustomer(id) {
  if (!id) return { success: false, error: 'ID required' };

  const result = await callApi('deleteCustomer', { id });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  clearCache();
  return { success: true };
}

export function clearCache() {
  customerCache = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
  }
}
