# IT Logbook

Aplikasi web untuk mencatat, mengelola, dan menganalisis aktivitas helpdesk / pekerjaan tim IT rumah sakit. Mendukung pencatatan logbook harian, riwayat perubahan (audit trail), dashboard performa staff, trend helpdesk, master data, manajemen pengguna berbasis role, serta export laporan ke Excel.

## Fitur Utama

- **Logbook Helpdesk** — catat tanggal, jam mulai/selesai (total menit dihitung otomatis), PIC pelapor, staff IT yang menangani (bisa lebih dari satu), kategori, unit kerja, isi helpdesk, tindakan, status (default `Proses`), dan jenis pelayanan.
- **Riwayat Perubahan (Audit Trail)** — setiap create/update logbook dicatat per-field (nilai lama → nilai baru), lengkap dengan siapa yang mengubah dan kapan.
- **Dashboard** — ringkasan statistik (StatsCards), aktivitas terbaru, grafik via Recharts.
- **Performa Staff** — dashboard analisis beban & kinerja tiap staff IT.
- **Trend Helpdesk** — visualisasi tren jumlah/jenis helpdesk per periode.
- **Export Excel** — unduh laporan `.xlsx` per rentang tanggal (nama sheet otomatis mengikuti bulan, mis. "Jul 26").
- **Master Data** (khusus super admin) — kelola PIC, Staff IT, Kategori, dan Unit Kerja (tambah, aktif/nonaktif, hapus).
- **Manajemen Pengguna** (khusus super admin) — CRUD user, reset password, aktif/nonaktif akun. Super admin tidak bisa menurunkan role atau menghapus akunnya sendiri.
- **Autentikasi JWT via HttpOnly Cookie** — login email + password (bcrypt), sesi 1 hari (konfigurable), auto-redirect ke login saat sesi habis.
- **Theme Switcher** — ganti tema tampilan dari UI.
- **Akses multi-jaringan** — localhost, LAN (IP lokal), dan internet via ngrok; CORS & cookie sudah menyesuaikan HTTP/HTTPS otomatis.

## Teknologi

| Bagian | Stack |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Axios, Recharts, Lucide Icons |
| Backend | Node.js, Express 5, MySQL (mysql2), JWT (jsonwebtoken), bcryptjs, cookie-parser, ExcelJS |
| Database | MySQL / MariaDB |
| Dev tools | nodemon, oxlint |
| Deploy opsional | Vercel (frontend), ngrok (tunnel backend) |

## Struktur Proyek

```
it-logbook.dev/
├── backend/
│   ├── server.js            # Entry point Express (CORS, routing, serve frontend build)
│   ├── db/pool.js           # Koneksi pool MySQL (mysql2/promise)
│   ├── middleware/auth.js   # verifyToken (JWT cookie) & requireRole
│   ├── routes/
│   │   ├── auth.js          # Login, logout, me
│   │   ├── logbook.js       # CRUD logbook, riwayat, export xlsx
│   │   ├── users.js         # Manajemen user (super_admin)
│   │   ├── pic.js           # Master data PIC
│   │   ├── staffIt.js       # Master data Staff IT
│   │   ├── kategori.js      # Master data Kategori
│   │   └── unitKerja.js     # Master data Unit Kerja
│   └── public/              # Hasil build frontend (di-serve Express sebagai SPA)
├── frontend/
│   ├── vite.config.js       # Dev server + proxy /api → localhost:5000
│   ├── vercel.json          # Rewrite SPA untuk deploy Vercel
│   └── src/
│       ├── api.js           # Axios instance + semua fungsi pemanggil API
│       ├── App.jsx          # Routing (lazy-loaded pages)
│       ├── context/AuthContext.jsx
│       ├── layouts/AppShell.jsx   # Layout utama + Sidebar + Suspense
│       ├── pages/           # Dashboard, Input, Data, TrendHelpdesk, Users, Login
│       └── components/      # Tabel, form, modal, toast, theme switcher, dll.
└── start-app.bat            # Jalankan backend + ngrok + frontend sekaligus (Windows)
```

## Persiapan & Instalasi

### Prasyarat

- Node.js (disarankan versi LTS terbaru)
- MySQL / MariaDB (mis. via Laragon)
- (Opsional) ngrok — untuk akses dari internet

### 1. Clone & install dependency

```bash
git clone <url-repo>
cd it-logbook.dev

cd backend && npm install
cd ../frontend && npm install
```

### 2. Siapkan database

Buat database MySQL lalu buat tabel-tabel berikut (skema inti yang dipakai aplikasi):

| Tabel | Isi |
|---|---|
| `it_users` | id, nama, email, password_hash, role (`super_admin` / `user`), is_active, created_at |
| `it_logbook` | id, tanggal, jam_mulai, jam_selesai, total_menit, pic_id, staff_it_id, kategori_id, unit_kerja_id, isi_helpdesk, tindakan, status, jenis_pelayanan, created_at |
| `it_logbook_staff_it` | logbook_id, staff_it_id (relasi many-to-many logbook ↔ staff IT) |
| `it_logbook_history` | id, logbook_id, aksi, changed_by, changed_by_nama, timestamp |
| `it_logbook_history_detail` | history_id, field_name, label_field, nilai_lama, nilai_baru |
| `it_pic` | id, nama, aktif |
| `it_staff_it` | id, nama, aktif |
| `it_kategori_it` | id, nama, aktif |
| `it_unit_kerja` | id, nama, aktif |

Buat minimal satu user `super_admin` secara manual (password di-hash bcrypt) agar bisa login pertama kali.

### 3. Konfigurasi environment

Buat file `backend/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=it_logbook
DB_SSL=false            # true jika DB butuh SSL (mis. cloud DB)

# Server
PORT=5000

# Auth
JWT_SECRET=ganti-dengan-string-acak-yang-panjang
JWT_EXPIRES_IN=1d
COOKIE_SECURE=false     # true hanya jika diakses lewat HTTPS

# CORS (pisahkan dengan koma jika lebih dari satu)
FRONTEND_URL=http://localhost:5173
```

(Opsional) `frontend/.env` untuk menunjuk backend non-default:

```env
VITE_API_URL=http://localhost:5000
```

> Jika `VITE_API_URL` tidak diisi, frontend memakai path relatif `/api` — cocok untuk dev (via proxy Vite) maupun produksi (frontend di-serve backend).

## Menjalankan Aplikasi

### Mode Development

Dua terminal:

```bash
# Terminal 1 — backend (port 5000, auto-reload)
cd backend
npm run dev

# Terminal 2 — frontend (port 5173, proxy /api ke backend)
cd frontend
npm run dev
```

Buka `http://localhost:5173`.

### Mode Produksi (satu server)

```bash
# Build frontend
cd frontend
npm run build

# Copy isi frontend/dist ke backend/public, lalu:
cd ../backend
node server.js
```

Express akan men-serve frontend + API dari satu port: `http://localhost:5000`. Routing SPA sudah ditangani (semua path non-`/api` diarahkan ke `index.html`).

### Jalankan semua sekaligus (Windows)

`start-app.bat` menjalankan backend, ngrok (untuk akses internet), dan frontend dev (`--host`, bisa diakses dari HP/laptop se-WiFi) dalam satu klik.

> **Catatan:** sesuaikan variabel `BACKEND_PATH` dan `FRONTEND_PATH` di dalam file dengan lokasi project kamu, serta path config ngrok jika dipakai.

## API Endpoint

Semua endpoint berprefix `/api`. Kecuali `POST /auth/login`, semua butuh login (JWT cookie). Endpoint bertanda 🔒 khusus role `super_admin`.

### Auth — `/api/auth`

| Method | Path | Deskripsi |
|---|---|---|
| POST | `/login` | Login (email, password) → set cookie `token` |
| POST | `/logout` | Hapus cookie sesi |
| GET | `/me` | Data user yang sedang login |

### Logbook — `/api/logbook`

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/` | Daftar logbook; filter `?start=&end=&limit=&offset=` |
| POST | `/` | Tambah entri (total_menit dihitung otomatis, riwayat dicatat) |
| PUT | `/:id` | Ubah entri (perubahan per-field dicatat ke riwayat) |
| DELETE | `/:id` | Hapus entri |
| GET | `/:id/history` | Riwayat perubahan entri |
| GET | `/export/xlsx` | Export Excel per rentang tanggal |

### Master Data — `/api/pic`, `/api/staff-it`, `/api/kategori`, `/api/unit-kerja`

Pola sama untuk keempatnya:

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/` | Daftar data aktif; `?all=1` untuk semua |
| POST 🔒 | `/` | Tambah data |
| PUT 🔒 | `/:id` | Ubah (umumnya toggle `aktif`) |
| DELETE 🔒 | `/:id` | Hapus data |

### Users — `/api/users` (semua 🔒)

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/` | Daftar user |
| POST | `/` | Tambah user (role: `super_admin` / `user`) |
| PUT | `/:id` | Ubah nama/email/role/status aktif |
| PUT | `/:id/password` | Reset password |
| DELETE | `/:id` | Hapus user (tidak bisa hapus diri sendiri) |

### Lainnya

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/api/health` | Cek API hidup |

## Role & Hak Akses

| Halaman / Aksi | `user` | `super_admin` |
|---|---|---|
| Dashboard, Input, Data, Performa Staff, Trend Helpdesk | ✅ | ✅ |
| Master Data (PIC, Staff IT, Kategori, Unit Kerja) | ❌ | ✅ |
| Kelola Pengguna | ❌ | ✅ |

## Catatan Keamanan & Jaringan

- Token JWT disimpan di **HttpOnly cookie** (tidak bisa dibaca JavaScript), masa berlaku default 1 hari.
- Cookie otomatis `secure: true` + `sameSite: none` saat diakses lewat HTTPS (ngrok/SSL), dan `secure: false` + `sameSite: lax` di HTTP biasa — jangan set `COOKIE_SECURE=true` di HTTP karena browser akan menolak cookie.
- CORS mengizinkan: origin di `FRONTEND_URL`, semua `localhost`/`127.0.0.1`, serta domain `*.ngrok-free.app` dan `*.ngrok.io`.
- Password user di-hash dengan **bcrypt**.
- Ganti `JWT_SECRET` dengan string acak yang kuat sebelum dipakai di produksi.

## Lisensi

ISC.
