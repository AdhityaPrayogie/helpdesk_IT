# IT Logbook – Panduan Deployment di Linux Mint

Dokumen ini menjelaskan langkah‑langkah lengkap untuk menjalankan aplikasi **IT Logbook** (React + Vite frontend + Node.js/Express backend dengan MySQL) pada sistem **Linux Mint** (Ubuntu‑based).

---

## Isi
1. [Persyaratan Sistem](#persyaratan-sistem)  
2. [Menyiapkan Direktori Proyek](#menyiapkan-direktori-proyek)  
3. [Backend – Instalasi & Konfigurasi](#backend---instalasi--konfigurasi)  
4. [Frontend – Build & Penyajian](#frontend---build--penyajian)  
5. [Database – Persiapan MySQL/MariaDB](#database---persiapan-mysqldb)  
6. [Reverse Proxy dengan Nginx (direkomendasikan)](#reverse-proxy-dengan-nginx-direkomendasikan)  
7. [Alternatif: Menyajikan Static File dari Express](#alternatif-menyajikan-static-file-dari-express)  
8. [Firewall (UFW)](#firewall-ufw)  
9. [HTTPS dengan Let’s Encrypt (opsional)](#https-dengan-lets-encrypt-opsional)  
10. [Menjalankan sebagai Layanan (PM2 / systemd)](#menjalankan-sebagai-layanan-pm2--systemd)  
11. [Verifikasi & Pemecahan Masalah](#verifikasi--pemecahan-masalah)  
12. [Catatan Penting](#catatan-penting)  

---

## Persyaratan Sistem

| Komponen | Versi yang Disarankan | Cara Instalasi (Linux Mint) |
|----------|----------------------|-----------------------------|
| Node.js | ≥ 18.x (LTS) | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash -`<br>`sudo apt-get install -y nodejs` |
| npm | (terserah Node.js) | Terinstal bersama Node.js |
| MySQL / MariaDB | 5.7+ / MariaDB 10.3+ | `sudo apt-get install -y mariadb-server` (atau `mysql-server`) |
| Nginx | 1.18+ | `sudo apt-get install -y nginx` |
| PM2 (process manager) | terbaru | `sudo npm install -g pm2` |
| UFW (firewall) | sudah ada | `sudo apt-get install -y ufw` (jika belum) |
| Git (opsional) | - | `sudo apt-get install -y git` |

Linux Mint menggunakan repositori yang sangat mirip dengan Ubuntu, sehingga perintah `apt-get` di atas bekerja tanpa perubahan.

---

## Menyiapkan Direktori Proyek

Jika Anda sudah memiliki kode secara lokal, cukup copy folder `backend` dan `frontend` ke server. Contoh lokasi:

```bash
sudo mkdir -p /opt/it-logbook
sudo cp -r /path/to/local/backend   /opt/it-logbook/
sudo cp -r /path/to/local/frontend  /opt/it-logbook/
sudo chown -R $USER:$USER /opt/it-logbook   # agar tidak perlu sudo saat develop
```

Struktur akhir harus terlihat seperti:

```
/opt/it-logbook/
│
├─ backend/
│   ├─ server.js
│   ├─ package.json
│   ├─ .env          ← akan dibuat di langkah berikutnya
│   ├─ routes/
│   ├─ db/
│   └─ middleware/
│
└─ frontend/
    ├─ package.json
    ├─ vite.config.js
    ├─ src/
    ├─ public/
    └─ dist/          ← hasil build produksi
```

---

## Backend – Instalasi & Konfigurasi

### 3.1. Install dependensi produksi

```bash
cd /opt/it-logbook/backend
# Pastikan mulai dari keadaan bersih
rm -rf node_modules package-lock.json
npm ci --only=production   # hanya menginstall production deps
```

### 3.2. Buat file `.env` (produksi)

File `.env` **tidak boleh di‑commit**. Buat baru di server:

```dotenv
PORT=5000

# Origin yang diizinkan oleh CORS (ubah sesuai domain Anda)
FRONTEND_URL=http://your-domain.com   # biarkan kosong untuk localhost

# Konfigurasi MySQL/MariaDB
DB_HOST=127.0.0.1
DB_USER=your_db_user
DB_PASSWORD=***
DB_NAME=it_logbook

# Jika ada JWT secret atau variabel lain yang digunakan oleh auth middleware:
JWT_SECRET=***
```

> **File yang perlu ditambahkan / diubah**: `backend/.env` (baru). Tidak ada perubahan kode lain diperlukan karena `server.js` membaca `process.env`.

### 3.3. Jalankan dengan PM2 (disarankan)

```bash
sudo npm install -g pm2          # jika belum terinstall
pm2 start server.js --name it-logbook-backend
pm2 save                         # menyimpan daftar proses untuk auto‑restart
pm2 startup                      # ikuti instruksi yang tercetak untuk membuat systemd service
```

#### Alternatif: systemd service manual

Buat file `/etc/systemd/system/it-logbook-backend.service`:

```ini
[Unit]
Description=IT Logbook Backend (Node.js)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/it-logbook/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
EnvironmentFile=/opt/it-logbook/backend/.env   # memuat .env

[Install]
WantedBy=multi-user.target
```

Lalu:

```bash
sudo systemctl daemon-reload
sudo systemctl enable it-logbook-backend
sudo systemctl start it-logbook-backend
sudo systemctl status it-logbook-backend   # verifikasi aktif
```

### 3.4. Verifikasi Backend

```bash
curl -I http://127.0.0.1:5000/
# Harusnya mengembalikan 200 OK dan teks "IT Logbook API is running"
```

---

## Frontend – Build & Penyajian

### 4.1. Install dependensi & build produksi

```bash
cd /opt/it-logbook/frontend
npm ci
npm run build   # menghasilkan folder ./dist
```

### 4.2. Sajikan via Nginx (direkomendasikan)

#### 4.2.1. Buat konfigurasi virtual host

Buat file `/etc/nginx/sites-available/it-logbook` dengan isi:

```nginx
server {
    listen 80;
    server_name your-domain.com;   # ganti dengan domain atau IP server Anda

    # ----- Frontend (static files) -----
    root /opt/it-logbook/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # dukung React Router
    }

    # ----- Backend API (reverse proxy) -----
    location /api/ {
        proxy_pass http://127.0.0.1:5000;   # backend berjalan di localhost:5000
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # ----- Header keamanan dasar (opsional tapi disarankan) -----
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

#### 4.2.2. Aktifkan situs dan reload Nginx

```bash
sudo ln -s /etc/nginx/sites-available/it-logbook /etc/nginx/sites-enabled/
sudo nginx -t               # test konfigurasi (harus berhasil)
sudo systemctl reload nginx
```

### 4.3. Alternatif: Sajikan static file dari Express (tanpa Nginx)

Jika Anda tidak ingin memakai Nginx, tambahkan dua baris ke `backend/server.js` **sebelum** `app.listen`:

```javascript
const path = require('path');
const frontendDist = path.join(__dirname, '../frontend/dist');

// serve static files
app.use(express.static(frontendDist));
// fallback ke index.html untuk semua route yang tidak terdefinisi (React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});
```

Lalu rebuild frontend (`npm run build` di folder `frontend`) dan restart backend:

```bash
pm2 restart it-logbook-backend   # atau
sudo systemctl restart it-logbook-backend
```

> **File yang perlu diubah**:  
> - `backend/server.js` (hika Anda memilih opsi ini)  
> - `/etc/nginx/sites-available/it-logbook` (jika memakai Nginx)  

---

## Database – Persiapan MySQL/MariaDB

Pastikan MySQL/MariaDB berjalan dan buat database serta user sesuai `.env`.

```bash
sudo systemctl start mariadb   # atau mysql
sudo mysql -u root -p
```

Dalam shell MySQL:

```sql
CREATE DATABASE IF NOT EXISTS it_logbook;
CREATE USER 'your_db_user'@'localhost' IDENTIFIED BY 'your_db_password';
GRANT ALL PRIVILEGES ON it_logbook.* TO 'your_db_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Jika ada skrip migrasi/seed di `backend/scripts/` atau `backend/db/`, jalankan sesuai petunjuknya (misalnya `node scripts/migrate.js`).

---

## Firewall (UFW) – Buka Port yang Diperlukan

```bash
# Jika menggunakan Nginx pada port 80/443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Jika mengakses backend langsung (tanpa Nginx) dan masih ingin membuka port 5000:
sudo ufw allow 5000/tcp

sudo ufw enable
sudo ufw status verbose   # pastikan aturan aktif
```

---

## HTTPS dengan Let’s Encrypt (opsional)

Jika Anda memiliki domain yang menunjuk ke alamat IP server Mint, gunakan Certbot untuk otomatik mendapatkan dan mengatur sertifikat Let's Encrypt bersama Nginx.

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot akan:

- Meminta sertifikat dari Let's Encrypt.  
- Mengubah konfigurasi Nginx agar menggunakan SSL (port 443).  
- Menambahkan otomatis renew via systemd timer.  

> **File yang berubah**: konfigurasi Nginx di `/etc/nginx/sites-available/it-logbook` (Certbot menambahkan blok `listen 443 ssl;` dan bagian sertifikat).  

---

## Menjalankan sebagai Layanan (PM2 / systemd)

- **PM2** (disarankan):  
  ```bash
  pm2 start server.js --name it-logbook-backend
  pm2 save
  pm2 startup   # ikuti instruksi tercetak
  ```

- **systemd** (jika tidak memakai PM2): lihat contoh service di bagian **3.3**.  

Pastikan layanan aktif setelah reboot:

```bash
systemctl is-enabled it-logbook-backend   # harus muncul 'enabled'
systemctl is-active it-logbook-backend    # harus muncul 'active'
```

---

## Verifikasi & Pemecahan Masalah

1. **Buka browser** dan akses `http://your-domain.com` (atau `http://IP-server` jika belum pakai domain).  
2. Pastikan frontend tampil tanpa error konsol.  
3. Buka DevTools → Network, verifikasi permintaan ke `/api/*` mengembalikan status 200 (bukan error CORS atau 404).  
4. **Log backend**:  
   ```bash
   pm2 logs it-logbook-backend          # jika memakai PM2
   # atau
   journalctl -u it-logbook-backend -f  # jika memakai systemd
   ```
5. **Log Nginx** (jika digunakan):  
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

### Masalah Umum

| Gejala | Kemungkinan Penyebab | Solusi |
|--------|----------------------|--------|
| Tidak bisa mengakses `/api/*` (404) | Backend tidak berjalan atau port salah | Periksa `pm2 status` atau `systemctl status it-logbook-backend`; pastikan `PORT` di `.env` sesuai dengan yang didengarkan (`app.listen`). |
| Error CORS di browser | `FRONTEND_URL` di `.env` tidak cocok dengan origin yang diakses | Atur `FRONTEND_URL` sesuai dengan domain/protokol yang digunakan (mis. `http://your-domain.com`). |
| Halaman kosong / blank page | Frontend tidak disajikan dengan benar | Pastikan `root` di konfigurasi Nginx menunjuk ke `/opt/it-logbook/frontend/dist` dan `try_files` mengarahkan ke `/index.html`. |
| Database connection error | Kredensial MySQL salah atau service tidak running | Periksa `sudo systemctl status mariadb`; coba koneksi manual dengan `mysql -u your_db_user -p`. |
| Situs tidak bisa diakses dari luar jaringan | Firewall menolak port | Pastikan UFW membuka port 80/443 (atau 5000 jika tanpa Nginx). Jalankan `sudo ufw status`. |

---

## Catatan Penting

- **Jangan commit `.env`** ke repositori. Gunakan contoh `.env.example` jika ingin menyertakan deskripsi variabel tanpa nilai sensitif.  
- Pastikan **Node.js versi** yang digunakan di produksi sama dengan yang Anda gunakan saat development (biasanya ≥ 18.x).  
- Untuk produksi, **matikan** semua `devDependencies` (hanya jalankan `npm ci --only=production` pada backend dan `npm ci` + `npm run build` pada frontend).  
- Jika Anda menggunakan **SELinux** atau **AppArmor**, pastikan profil tidak memblokir akses Node.js/Nginx ke port yang dibutuhkan.  
- Selalu **backup database** sebelum melakukan migrasi besar.  

---

Selamat mencoba! Jika Anda menemukan kesulitan atau memiliki pertanyaan lebih spesifik, silakan buat issue atau hubungi tim pengembang. 🚀