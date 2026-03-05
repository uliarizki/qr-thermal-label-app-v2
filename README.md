# 🌟 Bintang Mas - QR Thermal Label App

Aplikasi web modern untuk manajemen data customer, scan QR code, dan pencetakan label thermal otomatis. Dibangun untuk efisiensi tinggi dengan desain premium "Gold & Black".

![Bintang Mas App](public/logo_brand.png)

> **Untuk Developer / Teknis:**
> Silakan baca [📘 TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md) untuk mempelajari arsitektur kode, API, dan cara kerja sistem secara mendalam.

## ✨ Fitur Utama (Ultimate Edition)

### 1. 📱 Dual Mode Operation
- **Scan Mode**: Gunakan kamera laptop/HP untuk memindai QR code produk/customer.
- **Search Mode**: Pencarian pintar (Smart Search) berdasarkan Nama, ID, atau Kota.
- **Dual Output**: Pilih antara **Thermal Print** (untuk label fisik) atau **Digital ID Card** (untuk share via WA).

### 2. 👑 Admin Panel & Security
- **User Management**: Admin bisa membuat account, melihat list user, dan menghapus user (CRUD).
- **Secure Auth**: Password di-hash (SHA-256) untuk keamanan maksimal.
- **Audit Log**: Semua aktivitas (Login, Scan, Add, Search) tercatat otomatis di Google Sheets Admin.

### 3. 📡 Offline-Ready (PWA)
- **Installable**: Bisa diinstall sebagai aplikasi Desktop/Android (Add to Home Screen).
- **Offline Cache**: Tetap berjalan meski internet terputus (untuk fitur view & history).
- **Workbox Sync**: Aset statis & font tersimpan otomatis di browser.

### 4. 🖨️ Smart Printing
- **Auto-Format**: Label otomatis disesuaikan dengan ukuran 55x40mm (atau custom).
- **One-Click PDF**: Sekali klik tombol "Print", file PDF langsung ter-download tanpa popup mengganggu.
- **Sharp Vector Quality**: Hasil cetak tajam menggunakan teknologi Vector PDF.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, PWA
- **Styling**: Modern CSS (Premium Gold Theme), React Hot Toast
- **Database (Cloud)**: Google Sheets + Google Apps Script (GAS)
- **Database (Local)**: LocalStorage (Snapshot Data)
- **Cetak**: jsPDF (Vector), html2canvas (Digital ID)

---

## 🚀 Panduan Penggunaan

### A. Login
Masukkan username & password yang telah didaftarkan oleh Admin.
- **Admin**: Bisa akses menu "Admin Panel" untuk kelola user.
- **User**: Hanya bisa akses fitur operasional scan & print.

### B. Menambah Customer Baru
1. Masuk menu **"Baru"** (`+`).
2. Isi data wajib: Nama, Kota, Cabang.
3. Klik "Simpan".
4. **Otomatis**: Anda akan diarahkan ke halaman "Preview" untuk langsung cetak label customer baru tersebut.

### C. Mencetak Label
1. Dari hasil Scan atau Pencarian, klik customer.
2. Muncul popup detail.
3. Pilih tab **"Thermal Print"**.
4. Klik tombol **"Generate PDF & Print"**.
5. File PDF akan terdownload. Buka dan Print ke printer thermal (Setting: 55x40mm).

---

## 📦 Deployment

Cara build untuk hosting (cPanel/Vercel):

```bash
# 1. Build Project
npm run build

# 2. Setup Environment
# Pastikan VITE_GAS_WEBAPP_URL sudah benar

# 3. Upload dist/ folder
```

Untuk detail deployment lebih teknis, lihat [📘 TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md).

---

© 2024 Bintang Mas Software Team. All Rights Reserved.
