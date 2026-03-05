# Firebase Migration Plan (Instant Overhaul)

## 🚀 Overview

The transition from Google Sheets to Firebase is not just possible—it is **highly recommended** for scaling beyond ~2,000 customers. Firebase offers sub-second latency, offline persistence out-of-the-box (which we need), and real-time updates.

While "Instant" is ambitious, we can achieve a functional migration in **1-2 hours** of work.

---

## 🏗️ Architecture Comparison

| Feature | Current (Google Sheets) | New (Firebase / Firestore) | Benefit |
| :--- | :--- | :--- | :--- |
| **Database** | Spreadsheets (Rows/Cols) | Cloud Firestore (NoSQL JSON) | 🚀 10x Faster Read/Write |
| **Auth** | Custom SHA-256 in GAS | Firebase Authentication | 🔒 Standardized Security |
| **Offline** | Custom LocalStorage Cache | Native Firestore SDK Cache | ✅ Reliable Offline Mode |
| **Realtime** | Manual "Sync" Button | Real-time Listeners | ⚡ Instant Updates |
| **Cost** | Free (Quota Limits) | Free Spark Plan (Generous) | 💰 Scale Friendly |

---

## 🗺️ Migration Steps

### Phase 1: Setup (User Action Required)
1.  Create a Project at [console.firebase.google.com](https://console.firebase.google.com/).
2.  Enable **Firestore Database** (Start in **Test Mode** for easy dev).
3.  Enable **Authentication** (Email/Password provider).
4.  Copy **Firebase Config** keys (API Key, Project ID, etc.).

### Phase 2: Code Implementation (I will do this)
1.  **Install SDK**: `npm install firebase`
2.  **Create Adapter**: Create `src/utils/firebase.js` to mirror `googleSheets.js` methods (`getCustomers`, `addCustomer`, etc.).
3.  **Authentication Switch**: Update `AuthContext` to use Firebase Auth instead of GAS.
4.  **Feature Flag**: Add `VITE_USE_FIREBASE=true` to switch backends seamlessly.

### Phase 3: Data Migration (One-Time)
I will build a **One-Click Migration Tool** inside the app (Admin only) that does this safely:

1.  **Read**: App pulls all 2000+ rows from Google Sheets (using existing API).
2.  **Transform**: Converts rows to clean JSON objects.
3.  **Write**: Saves them to Firebase Firestore in batches.
4.  **Verify**: Compares the total count (e.g., "Sheet: 2150 rows" vs "Firebase: 2150 docs").

---

## 🛡️ Data Safety Guarantee

*   **No Data Loss**: The Google Sheet is **NOT deleted or touched**. It remains as a simpler read-only backup.
*   **Zero Downtime**: We can switch back to Google Sheets instantly by toggling one line of code if anything goes wrong.
*   **Audit**: You can compare the old Sheet vs the new App to ensure everything matches.

---

## 💾 Data Schema (NoSQL/JSON)

### Collection: `customers`
```json
{
  "id": "CUST001",
  "nama": "BUDI SANTOSO",
  "kota": "TEGAL",
  "cabang": "PASAR PAGI",
  "sales": "HARI",
  "searchKeywords": ["budi", "santoso", "tegal"] // For fast search
}
```

### Collection: `users`
```json
{
  "email": "gudang@bintangmas.com",
  "role": "admin",
  "username": "gudang"
}
```

---

## ⚡ "Instant" Switch Strategy

To make this feel instant:
1.  We keep the frontend **EXACTLY** the same.
2.  We just swap the "engine" under the hood.
3.  Users won't notice a difference, except it will be much faster.

## ❓ Decision Point

**Do you want to proceed with this migration now?**

*   **YES**: I will guide you to set up the Firebase project and verify the keys.
*   **NO**: We stick with Google Sheets for now.
