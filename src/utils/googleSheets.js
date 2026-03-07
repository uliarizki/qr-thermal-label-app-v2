import { addDoc, doc, getDocs, updateDoc, deleteDoc, query, where, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { attendance, customers, db, history, users } from "../config/firebase";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getHistory } from "./history";

// API URL from environment variable (see .env file)
const WEB_APP_URL = import.meta.env.VITE_GAS_WEBAPP_URL;

const CACHE_ATTENDANCE_KEY = 'qr:attendance'; // Minimal caching for offline
const CACHE_KEY = 'qr:customersData';
const CACHE_TIME_KEY = 'qr:cacheTime';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 jam (kita gunakan manual sync untuk update)'
const DOMAIN = '@bintangmas.local'

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
  const user = (await signInWithEmailAndPassword(getAuth(), username + DOMAIN, password)).user
  const userData = await getDoc(doc(db, 'users', user.uid))

  return {
    success: true, data: {
      token: user.accessToken,
      username: userData.data().username,
      role: userData.data().role,
    }
  } // await callApi('login', { username, password });
}

export async function registerUser(username, password, role, creatorRole) {
  if (creatorRole !== 'admin')
    return { success: false, error: 'Unauthorized' }
  const email = username + DOMAIN
  try {
    const user = (await createUserWithEmailAndPassword(getAuth(), email, password)).user
    await setDoc(doc(db, 'users', user.uid), {
      email,
      username,
      role,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });

    return {
      success: true
    } // await callApi('register', { username, password, role, creatorRole });}
  } catch (e) {
    return {
      success: false,
      error: e.code === 'auth/email-already-in-use' ? 'Username telah digunakan' : e.message
    }
  }
}

export async function getUsers(role) {
  if (role !== 'admin')
    return { success: false, error: 'Unauthorized' }
  const userDocs = (await getDocs(users)).docs
  const user = userDocs.map(doc => ({ id: doc.id, ...doc.data() }))
  return {
    success: true,
    data: user
  } // await callApi('getUsers', { role });
}

export async function deleteUser(username, role, targetUser) {
  if (role !== 'admin')
    return { success: false, error: 'Unauthorized' }
  try {
    const q = query(users, where('username', '==', targetUser))
    const snapshot = await getDocs(q)
    const deletePromises = snapshot.docs.map(user => {
      fetch(`${import.meta.env.VITE_BACKEND_URL}user/${user.id}`, {
        method: 'DELETE'
      })
      deleteDoc(user.ref)
    });
    await Promise.all(deletePromises);
    return {
      success: true
    } // await callApi('deleteUser', { username, role, targetUser });}
  } catch (e) {
    return {
      success: false,
      error: e.message
    }
  }
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
  // callApi('logActivity', { user, activity, details });
  addDoc(history, { user, activity, details, timestamp: serverTimestamp() })
}

export async function getGlobalHistory(userRole) {
  return {
    success: true,
    data: await getHistory(userRole)
  } // await callApi('getGlobalHistory', { userRole });
}

/* --- GUEST BOOK / ATTENDANCE --- */

export async function checkInCustomer(customer) {
  const uppercaseCustomer = uppercasedCustomer(customer)
  await addDoc(attendance, { ...uppercaseCustomer, timestamp: serverTimestamp() })
  return {
    success: true
  }// await callApi('checkIn', { customer });
}

export const uppercasedCustomer = (customer) => Object.fromEntries(Object.entries(customer).map(([k, v]) => (k !== 'id' && k !== 'kode' && k !== 'telp') ? [k, (v || "").trim().toUpperCase()] : [k, v])) 

export async function addAndCheckIn(customer) {
  const customerQuery = query(customers, where('id', '==', customer.id))
  const customerSnapshot = await getDocs(customerQuery)
  if (customerSnapshot.docs.length === 0)
    await addCustomer(customer)
  return checkInCustomer(customer)// await callApi('addAndCheckIn', { customer });
}

export async function getAttendanceList() {
  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const endToday = new Date()
  endToday.setHours(23, 59, 59, 999)
  const startTimestamp = Timestamp.fromDate(startToday)
  const endTimestamp = Timestamp.fromDate(endToday)
  const q = query(attendance, where('timestamp', '>=', startTimestamp), where('timestamp', '<=', endTimestamp))
  const attendances = await getDocs(q)
  return {
    success: true,
    data: attendances.docs.map(doc => ({ ...doc.data(), timestamp: doc.data().timestamp.toDate() }))
  }// await callApi('getAttendance');
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
  // const result = await callApi('getCustomers');
  const result = await getDocs(customers);

  if (!result.empty) {
    const formattedData = result.docs.map(customer => ({
      no: customer.data().no,
      id: customer.data().id,
      nama: customer.data().nama,
      kota: customer.data().kota,
      sales: customer.data().sales,
      pabrik: customer.data().pabrik,
      cabang: customer.data().cabang,
      telp: customer.data().telp,
      kode: customer.data().kode
    }));

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

// Tambah customer baru
export async function addCustomer(customerData) {
  if (!customerData.nama || !customerData.kota || !customerData.cabang) {
    return {
      success: false,
      error: 'Nama, Kota, dan Cabang wajib diisi',
    };
  }

  if (!customerData.kode) customerData.kode = ""
  if (!customerData.telp) customerData.telp = ""

  try {
    const result = await addDoc(customers, uppercasedCustomer(customerData))

    // Merge input data with result data (so if result is fallback, we still have the input)
    return { success: true, data: { ...customerData, ...result.data } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Edit existing customer
export async function editCustomer(customerData) {
  if (!customerData.id) {
    return { success: false, error: 'Customer tanpa ID tidak dapat diedit.' };
  }

  try {
    // updateDoc tidak mengembalikan value (undefined jika sukses)
    const q = query(customers, where('id', '==', customerData.id))
    const snapshot = await getDocs(q)

    // Hapus field yang bernilai undefined dari data (Firebase tidak mensupport value undefined)
    const cleanedData = Object.fromEntries(
      Object.entries(customerData).filter(([_, v]) => v !== undefined)
    );

    snapshot.forEach(document => {
      updateDoc(document.ref, uppercasedCustomer(cleanedData))
    })

    clearCache();
    // Clear cache to force reload next time

    return { success: true, data: customerData };
  } catch (e) {
    return { success: false, error: e.message || 'Gagal mengubah data' };
  }
}

// Delete existing customer
export async function deleteCustomer(id) {
  if (!id) return { success: false, error: 'ID required' };

  try {
    const q = query(customers, where('id', '==', id))
    const snapshot = await getDocs(q)

    // Gunakan Promise.all untuk menunggu semua proses delete selesai
    const deletePromises = snapshot.docs.map(document => deleteDoc(document.ref));
    await Promise.all(deletePromises);

    clearCache();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || 'Gagal menghapus data' };
  }
}

export function clearCache() {
  customerCache = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
    window.location.reload()
  }
}
