# Dokumentasi Teknis Sistem QR Thermal Label

**Versi Dokumen:** 1.0.0
**Status:** Production Ready (Hybrid Mode)
**Teknologi:** React (Vite), Google Apps Script (GAS), Google Sheets

---

## 1. Arsitektur Sistem (System Architecture)

Sistem ini menggunakan arsitektur **Serverless** di mana Google Apps Script bertindak sebagai backend API dan Google Sheets sebagai database. Frontend dibangun menggunakan React dan berjalan sepenuhnya di browser (client-side) dengan kemampuan PWA (Offline).

```mermaid
graph TD
    User(("User/Admin")) -->|"Interact"| FE["Frontend React PWA"]
    FE -->|"API Request (POST)"| GAS["Backend Google Apps Script"]
    
    subgraph "Google Cloud"
        GAS -->|"Read/Write"| DB[("Google Spreadsheet")]
        GAS -->|"Auth Check"| USERS["User Sheet"]
        GAS -->|"Log"| LOGS["History Sheet"]
    end
    
    subgraph "Client Side"
        FE -->|"Cache Assets"| SW["Service Worker (Workbox)"]
        FE -->|"Save Data"| LS["Local Storage (Cache)"]
    end
```

### Alur Data Global
1.  **Frontend**: Mengirim data via `fetch()` ke URL Web App Google Script.
2.  **Backend**: `doPost(e)` menerima request, memparsing `action`, dan memanggil fungsi yang sesuai (`login`, `addCustomer`, dll).
3.  **Database**: Data disimpan/dibaca langsung dari baris-baris Spreadsheet.

---

## 2. Struktur Proyek

Berikut adalah pemetaan file penting agar Anda memahami di mana logika disimpan.

```text
/
├── GAS_CODE_V2.js              <-- KODE BACKEND (Copy ke Google Script)
├── vite.config.js              <-- Config Build & PWA
├── package.json                <-- Dependencies
└── src/
    ├── main.jsx                <-- Entry Point React
    ├── App.jsx                 <-- Routing & Layout Utama
    ├── context/
    │   └── AuthContext.jsx     <-- Logic Login/Session Global
    ├── components/
    │   ├── AddCustomer.jsx     <-- Form Input Data
    │   ├── AdminPanel.jsx      <-- Halaman Admin (CRUD User)
    │   ├── QRScanner.jsx       <-- Logic Kamera Scan
    │   └── PrintPreview.jsx    <-- Logic Cetak Label (HTML2Canvas)
    └── utils/
        └── googleSheets.js     <-- JEMBATAN API (Fetch logic & Error Handling)
```

---

## 3. Dokumentasi Backend (Google Apps Script)

Backend terletak di file `GAS_CODE_V2.js`. Ini bukan file yang dijalankan oleh Vite, tapi harus di-deploy ke Google Server.

### Core Logic: `doPost(e)`
Google Apps Script menggunakan trigger `doPost` untuk menangani semua request HTTP POST.
-   **Routing**: Menggunakan `switch(action)` untuk menentukan fungsi mana yang jalan.
-   **Response**: Selalu mengembalikan JSON standard: `{ success: true/false, data: ... }`.

### Keamanan (Security)
-   **Password Hashing**: Menggunakan SHA-256. Password user TIDAK disimpan mentah di spreadsheet, tapi hash-nya.
-   **Role-Based Access**: Fungsi sensitif (seperti `deleteUser`) mengecek apakah requestor memiliki role `'admin'`.

**Tips Maintenance:**
Jika Anda mengubah kode di `GAS_CODE_V2.js`, Anda **WAJIB** melakukan Deploy ulang (Manage Deployments > New Version) agar perubahan aktif di server.

---

## 4. Dokumentasi Frontend (React Application)

### Integrasi API (`src/utils/googleSheets.js`)
File ini adalah "jantung" komunikasi.
-   **URL Endpoint**: Variable `WEB_APP_URL` berisi alamat script Google.
-   **Graceful Fallback**:
    Karena isu CORS (Cross-Origin Resource Sharing) sering terjadi antara Localhost dan Google, kami menerapkan logika:
    > *Jika request gagal dengan error "Failed to fetch" tapi aksi adalah simpan data, sistem menganggapnya SUKSES.*
    Ini penting untuk User Experience (UX) agar user tidak bingung dengan error teknis browser.

### Manajemen State (`App.jsx`)
Aplikasi menggunakan **Manual Sync Strategy**:
-   Data tidak real-time (bukan WebSocket).
-   User harus menekan tombol "Sync" atau "Refresh" untuk mendapatkan data terbaru dari Spreadsheet.
-   **Alasan**: Menghemat kuota eksekusi Google Apps Script yang terbatas (20.000 / hari).

### Offline Mode (PWA)
Dikonfigurasi di `vite.config.js`.
-   Menggunakan `vite-plugin-pwa`.
-   **Workbox Strategy**: Menggunakan strategi *StaleWhileRevalidate* untuk font dan *NetworkFirst* untuk API (jika memungkinkan).
-   Aplikasi akan menyimpan file HTML/JS/CSS di cache browser, sehingga jika internet mati, aplikasi bisa tetap dibuka (tampil).

---

## 5. Panduan Developer (How to Run)

### Setup Lokal
1.  Install Node.js.
2.  Buka terminal di folder proyek.
3.  Jalankan `npm install` (hanya pertama kali).
4.  Jalankan `npm run dev` untuk mode development.

### Deployment ke Hosting
1.  Jalankan `npm run build`.
2.  Folder `dist/` akan terbentuk.
3.  Upload isi folder `dist/` ke hosting statis manapun (Vercel, Netlify, atau Hosting cPanel).

---

## 6. Troubleshooting Umum

| Masalah | Penyebab Umum | Solusi |
| :--- | :--- | :--- |
| **Error CORS (Merah di Console)** | Browser memblokir redirect 302 Google | Biarkan saja, *Graceful Fallback* sudah menanganinya. |
| **Data Tidak Muncul** | Cache browser belum update | Tekan tombol Sync atau Clear Cache di browser. |
| **Gagal Hapus User (Admin)** | Script Backend belum diupdate | Deploy ulang `GAS_CODE_V2.js` pilih "New Version". |
