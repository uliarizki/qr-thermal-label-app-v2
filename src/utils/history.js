// src/utils/history.js
// Utility untuk manage history di localStorage

// import { addHistoryToDB, getHistoryFromDB, initDB } from './db'; // DISABLED due to stability issues
import { deleteDoc, getDocs, orderBy, query, onSnapshot } from 'firebase/firestore';
import { logActivity } from './googleSheets'; // Import Cloud Logger
import { history } from '../config/firebase';

const LOCAL_STORAGE_KEY = 'qr:history_log';

/**
 * Tambah history baru (Syncs to Cloud + Local Storage)
 * @param {string} action - 'ADD', 'SEARCH', 'SCAN'
 * @param {object} details - detail action
 */
export async function addHistory(action, details = {}) {
  if (typeof window === 'undefined') return;

  try {
    const newItem = {
      action,
      details,
      timestamp: new Date().toISOString() // Ensure timestamp matches
    };

    // 1. Save Local (LocalStorage - More Stable than IndexedDB)
    const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    let history = existingStr ? JSON.parse(existingStr) : [];

    // Add to top
    history.unshift(newItem);

    // Limit to last 100 items to save space
    if (history.length > 100) {
      history = history.slice(0, 100);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));

    // 2. Sync to Cloud (Background)
    // We don't await this to keep UI snappy
    const userJson = localStorage.getItem('qr:auth_user');
    let username = 'guest';
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        username = user.username;
      } catch (e) { }
    }

    // Convert details to string for Sheet
    logActivity(username, action, details).catch(err => console.error("Cloud Sync Failed:", err));

  } catch (error) {
    console.error('Error saving history:', error);
  }
}

/**
 * Ambil semua history
 * @returns {Promise<Array>}
 */
export async function getHistory(role) {
  if (typeof window === 'undefined') return [];

  try {
    const str = role === 'admin' ? (await getDocs(query(history, orderBy('timestamp', 'desc')))).docs.map(doc => ({
      action: doc.data().activity,
      timestamp: doc.data().timestamp?.toDate(),
      details: doc.data().details,
      username: doc.data().user
    })) : localStorage.getItem(LOCAL_STORAGE_KEY);
    const data = typeof str === 'string' ? JSON.parse(str) : str;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error reading history locally:', error);
    return [];
  }
}

export function listenHistory(role, callback) {
  if (typeof window === 'undefined') return () => { };

  if (role === 'admin') {
    const q = query(history, orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        action: doc.data().activity,
        timestamp: doc.data().timestamp?.toDate(),
        details: doc.data().details,
        username: doc.data().user
      }));
      callback(data);
    }, (error) => {
      console.error('Error listening to history:', error);
      callback([]);
    });
  } else {
    // For non-admin, local storage
    const str = localStorage.getItem(LOCAL_STORAGE_KEY);
    const data = typeof str === 'string' ? JSON.parse(str) : (str || []);
    const arr = Array.isArray(data) ? data : [];
    callback(arr);

    // Simplistic local storage listener for same-tab updates
    const intervalId = setInterval(() => {
      const newStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      const newData = typeof newStr === 'string' ? JSON.parse(newStr) : (newStr || []);
      callback(Array.isArray(newData) ? newData : []);
    }, 5000);

    return () => clearInterval(intervalId);
  }
}

/**
 * Filter history berdasarkan action
 * @param {string} action - 'ADD', 'SEARCH', 'SCAN', atau 'ALL'
 * @returns {Promise<Array>}
 */
export async function filterHistoryByAction(action, role) {
  const history = await getHistory(role);
  if (action === 'ALL') return history;
  return history.filter(item => item.action === action);
}

/**
 * Clear semua history
 */
export async function clearHistory(role) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  if (role === 'admin')
    await fetch(`${import.meta.env.VITE_BACKEND_URL}history`, {
      method: 'DELETE'
    })
}

/**
 * Format timestamp untuk display
 * @param {string} isoString
 * @returns {string}
 */
export function formatTimestamp(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;

    // Format lengkap untuk lebih dari 7 hari
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return isoString;
  }
}


