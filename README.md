# BINUSTRA — Digital School Portal (Frontend)

Antarmuka web resmi untuk **BINUSTRA (Digital School Portal)**, sistem informasi akademik berbasis web yang memfasilitasi interaksi antara **Siswa** dan **Guru / Wali Kelas** dalam pengelolaan Praktik Kerja Lapangan (PKL), Absensi & Kehadiran, serta Administrasi Keuangan.

## Fitur Utama

### Portal Siswa

* **Autentikasi Berbasis Peran (`siswa`):** Masuk menggunakan Nomor Induk (NIS) atau *username* dengan manajemen sesi JWT.

* **Dashboard Akademik:** Ringkasan status PKL terkini, persentase kehadiran bulan berjalan, dan ringkasan tagihan aktif.

* **Praktik Kerja Lapangan (PKL):**

  * Menampilkan informasi penempatan mitra industri aktif atau formulir pengajuan mitra baru (jika belum memiliki penempatan).

  * Unggah dan revisi berkas laporan akhir PKL dalam format PDF (maksimal 10 MB).

  * Melihat rincian nilai PKL (nilai sekolah, nilai industri, dan nilai akhir).

* **Absensi & Kehadiran:**

  * Statistik kehadiran bulanan (Hadir, Izin, Sakit, Alpa).

  * Pengajuan surat izin/sakit beserta lampiran gambar/PDF dan pemantauan riwayat keputusan wali kelas.

* **Keuangan & Tagihan:**

  * Rincian daftar tagihan (`Belum Lunas`, `Jatuh Tempo`, `Lunas`) beserta informasi rekening pembayaran resmi sekolah.

  * Unggah bukti transfer pembayaran (JPG/PNG maksimal 5 MB) dengan pelacakan status verifikasi Tata Usaha/Bendahara.

* **Pusat Notifikasi:** Pengingat otomatis terkait tagihan jatuh tempo/belum lunas, status review laporan PKL, dan keputusan pengajuan izin.

### Portal Guru & Wali Kelas

* **Autentikasi Berbasis Peran (`guru`):** Akses khusus tenaga pendidik dan wali kelas.

* **Dashboard Guru:** Ikhtisar jumlah siswa bimbingan PKL, pengajuan izin menunggu keputusan, dan status administrasi kelas.

* **Bimbingan & Penilaian PKL:**

  * Tinjauan pengajuan mitra PKL siswa (Setujui / Tolak dengan catatan).

  * Unduh dan review laporan akhir PKL siswa (`Setujui` atau `Minta Revisi` wajib catatan).

  * Input dan pembaruan komponen nilai akhir PKL siswa.

* **Absensi Kelas & Verifikasi Izin:**

  * Rekapitulasi dan input presensi harian kelas.

  * Verifikasi pengajuan izin siswa (`Disetujui` / `Ditolak`).

* **Monitoring Administrasi Kelas:**

  * Pemantauan status pembayaran siswa satu kelas secara *read-only* yang tersinkronisasi dari bagian Keuangan/TU.

  * Fitur **Salin Pengingat** untuk menyalin format pesan tagihan ke *clipboard* guna tindak lanjut pembinaan wali kelas.

## Teknologi yang Digunakan

* **Framework & Build Tool:** React 18, TypeScript, Vite

* **Routing:** React Router DOM

* **Styling:** CSS Modules (`*.module.css`) & CSS Custom Properties

* **Ikon:** React Icons (`react-icons/fi`)

* **HTTP Client:** Custom Fetch Wrapper (`src/services/api.ts`) dengan dukungan `FormData`, pembatalan request (`AbortSignal`), dan penanganan kode error terstandar.

## Struktur Direktori

```
src/
├── assets/
├── components/
│   └── layout/          # Sidebar, Footer, NotificationBell, Navbar, ProfileMenu
├── context/             # AuthContext (manajemen state sesi & token JWT)
├── hooks/               # useApi, useAuth, useNotifications
├── pages/
│   ├── auth/            # Halaman Login
│   ├── guru/            # Dashboard, PKL, Absensi Kelas, Monitoring Tagihan
│   └── siswa/           # Dashboard, PKL, Absensi & Izin, Info Tagihan
├── services/            # Integrasi REST API (auth, pkl, absensi, keuangan)
├── styles/              # Global CSS
├── types/               # Definisi kontrak tipe TypeScript (portal.types.ts)
└── utils/               # Formatter, helper validasi, dan persistensi lokal

```

## Instalasi & Menjalankan Proyek

### 1. Prasyarat

* **Node.js** versi 18 atau lebih baru

* **npm** (atau package manager yang setara)

### 2. Langkah Instalasi

```
# Clone repositori
git clone <url-repositori-frontend>
cd binustra

# Install seluruh dependensi
npm install

```

### 3. Konfigurasi Environment

Buat file `.env` di root direktori proyek dan sesuaikan alamat URL backend API:

```
VITE_API_BASE_URL=https://<domain-backend-anda>/api/v1

```

### 4. Menjalankan Server Pengembangan

```
npm run dev

```

Aplikasi akan berjalan secara lokal pada `http://localhost:5173`.

### 5. Build Produksi & Linting

```
# Pengecekan kualitas kode
npm run lint

# Build bundle produksi
npm run build

```

## Lisensi

© 2026 BINUSA — Portal Akademik Sekolah.