# Asisten Kesejahteraan Diri - Frontend

Ini adalah bagian frontend untuk aplikasi "Asisten Kesejahteraan Diri". Aplikasi ini dirancang sebagai antarmuka web statis yang berinteraksi dengan backend API untuk menyediakan kuesioner kesehatan mental, manajemen profil pengguna, dan riwayat hasil.

## ✨ Fitur Utama

- **Otentikasi Pengguna**: Halaman login dan registrasi yang aman.
- **Manajemen Profil**: Pengguna dapat melengkapi dan melihat data identitas mereka.
- **Sistem Kuesioner Interaktif**: Alur pengisian beberapa kuesioner secara berurutan (WHO-5, GAD-7, MBI, NAQ-R, K10).
- **Riwayat Hasil**: Menampilkan semua riwayat hasil kuesioner yang pernah diisi oleh pengguna.
- **Desain Responsif**: Antarmuka yang dapat beradaptasi dengan baik di perangkat desktop maupun mobile.
- **Konfigurasi Dinamis**: URL API secara otomatis menyesuaikan antara lingkungan pengembangan lokal dan produksi (Vercel).

## 🛠️ Teknologi yang Digunakan

- **HTML5**: Struktur dasar halaman web.
- **TailwindCSS**: Framework CSS untuk styling yang cepat dan modern.
- **Vanilla JavaScript (ES6+)**: Logika aplikasi, interaksi dengan API, dan manipulasi DOM.
- **Vercel**: Platform untuk hosting dan deployment aplikasi frontend.

## 📂 Struktur Proyek

```
static/
├── 📄 index.html           # Halaman utama (dashboard kuesioner)
├── 📄 login.html           # Halaman login
├── 📄 register.html        # Halaman registrasi
├── 📄 identity_form.html   # Formulir untuk melengkapi biodata pengguna baru
├── 📄 profile.html         # Halaman profil dan riwayat hasil
├── 📜 script.js           # File JavaScript utama yang menangani semua logika
├── ⚙️ vercel.json          # Konfigurasi deployment untuk Vercel
└── 📖 README.md            # File ini
```

- **`script.js`**: Merupakan inti dari aplikasi ini. File ini menangani:
  - Routing sederhana berbasis path URL.
  - Proses otentikasi (login, register, logout).
  - Pengambilan dan pengiriman data ke backend API.
  - Render dinamis konten halaman (profil, riwayat, kuesioner).
  - Manajemen state kuesioner.

- **`vercel.json`**: Mengkonfigurasi Vercel untuk:
  - Menyajikan file sebagai situs statis.
  - Menggunakan URL yang bersih (tanpa `.html`).
  - Melakukan *rewrite* permintaan dari `/api/v1/...` ke backend API yang sebenarnya, menyembunyikan URL backend dari sisi klien di lingkungan produksi.

## 🚀 Menjalankan Proyek Secara Lokal

Untuk menjalankan frontend ini di komputer Anda, ikuti langkah-langkah berikut.

### Prasyarat

1.  **Backend Server**: Pastikan server backend API Anda sudah berjalan. Secara default, frontend ini akan mencoba terhubung ke `http://localhost:8010`.
2.  **Web Server Lokal**: Anda memerlukan web server sederhana untuk menyajikan file-file statis ini.

### Langkah-langkah

1.  **Buka Terminal**: Buka terminal atau command prompt di dalam direktori `static` ini.

2.  **Jalankan Web Server**: Pilih salah satu dari metode berikut.

    - **Menggunakan Python (Rekomendasi, biasanya sudah terinstall)**:
      ```bash
      # Untuk Python 3
      python -m http.server 3000
      ```
      Jika port 3000 sudah digunakan, Anda bisa menggunakan port lain (misal: `python -m http.server 3001`).

    - **Menggunakan `live-server` dari npm**:
      Jika Anda memiliki Node.js, Anda bisa menginstall `live-server` untuk fitur *hot-reloading*.
      ```bash
      # Install live-server secara global (hanya sekali)
      npm install -g live-server

      # Jalankan server
      live-server --port=3000
      ```

3.  **Buka Aplikasi**: Buka browser Anda dan akses `http://localhost:3000`.

    Aplikasi sekarang akan berjalan dan berkomunikasi dengan backend Anda di `http://localhost:8010`.

## 🌐 Deployment ke Vercel

Proyek ini sudah siap untuk di-deploy ke Vercel.

1.  **Hubungkan ke Vercel**: Hubungkan repositori Git Anda ke proyek baru di Vercel.

2.  **Konfigurasi Proyek**: Vercel akan secara otomatis mendeteksi `vercel.json` dan mengkonfigurasi proyek sebagai "Static Site".

3.  **Atur Environment Variable**: Ini adalah langkah paling penting. Di pengaturan proyek Vercel Anda, tambahkan *Environment Variable* berikut:
    - **Name**: `BACKEND_API_URL`
    - **Value**: `https://url-backend-api-anda.com` (Ganti dengan URL publik backend API Anda)

    Variabel ini akan digunakan oleh aturan `rewrite` di `vercel.json` untuk meneruskan semua permintaan API ke server backend Anda.

4.  **Deploy**: Jalankan proses deployment. Setelah selesai, frontend Anda akan aktif dan terhubung dengan backend.

---