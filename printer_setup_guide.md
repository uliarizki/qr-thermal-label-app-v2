# Panduan Setup Printer USB (Windows)

Jika saat klik **Connect Printer** muncul pesan *"No compatible devices found"*, itu karena Windows "memonopoli" koneksi USB printer Anda sebagai printer biasa.

Agar Aplikasi Web (Chrome) bisa mengontrol printer secara langsung (supaya lebih cepat dan rapi), kita perlu mengubah mode drivernya menjadi **WinUSB**. Ini hanya perlu dilakukan **satu kali** di setiap komputer.

---

## Solusi: Ganti Driver ke WinUSB (1 Menit)

Alat yang digunakan: **Zadig** (Gratis & Aman).

### Langkah-langkah:

1.  **Download Zadig**
    *   Buka: [https://zadig.akeo.ie/](https://zadig.akeo.ie/)
    *   Download versi terbaru.

2.  **Buka Zadig**
    *   Colokkan Printer USB ke Komputer & Nyalakan.
    *   Jalankan `zadig.exe`.

3.  **Temukan Printer Anda**
    *   Di menu atas, klik **Options** > **List All Devices**.
    *   Di daftar dropdown utama, cari nama printer Anda.
        *   *Contoh nama:* "Micro Printer", "POS-58", "RPP02", "USB Printing Support", atau "Unknown Device".
        *   *Tips:* Cabut-colok kabel USB jika bingung mana yang printer, lihat mana yang hilang-muncul.

4.  **Ganti Driver**
    *   Lihat kotak di sebelah kanan panah hijau. Pastikan pilih **WinUSB**.
    *   Klik tombol besar **Replace Driver** (atau "Install Driver").
    *   Tunggu sampai sukses.

5.  **Selesai!**
    *   Tutup Zadig.
    *   Refresh halaman Aplikasi Label ini.
    *   Klik **Connect Printer** lagi.
    *   Nama printer Anda sekarang akan muncul di daftar! 🎉

---

### Tanya Jawab (FAQ)

**Q: Apakah saya masih bisa print dari Word/Excel setelah ini?**
A: Tidak. Setelah diganti ke WinUSB, printer ini khusus "milik" aplikasi web ini. Jika ingin balik print dari Word, Anda harus uninstall driver di Device Manager.

**Q: Kenapa harus ribet begini?**
A: Karena browser (Chrome) butuh akses langsung ke "kabel" USB untuk mengirim perintah khusus (agar hasil cetak tajam & pas). Driver bawaan Windows menghalangi akses langsung ini.

**Q: Bagaimana di HP Android?**
A: Lebih gampang! Cukup nyalakan Bluetooth, pairing, lalu di aplikasi pilih "Connect" > Pilih Bluetooth. Tidak perlu install driver apa-apa.
