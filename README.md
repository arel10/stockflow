# StockFlow

Sistem manajemen inventaris dan pesanan penjualan (Sales Order) yang mencakup pengelolaan stok produk, riwayat pergerakan stok, dan transaksi penjualan secara terintegrasi.

---

## Tech Stack

- **Backend**: Go (net/http standar, pgx/v5)
- **Database**: PostgreSQL 17
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Container**: Docker Compose (untuk database)

---

## Fitur Utama

- **Katalog Produk**: Manajemen produk (tambah, lihat, ubah, hapus) dengan pencarian dan filter status/stok rendah.
- **Ringkasan Inventaris**: Dashboard ringkasan total produk, produk aktif, nilai total aset stok, dan peringatan stok menipis (≤ 10).
- **Penyesuaian Stok (Stock Adjustment)**: Penyesuaian stok masuk (*Stock In*) dan keluar (*Stock Out*) disertai pencatatan catatan/alasan.
- **Transaksi Pesanan (Sales Order)**:
  - Pembuatan pesanan penjualan dengan validasi ketersediaan stok produk.
  - Perhitungan total otomatis dari sisi backend.
  - Pembatalan pesanan (*Cancel Order*) dengan pengembalian stok otomatis.

---

## Struktur Proyek

```text
stockflow/
├── backend/            # Source code server Go
│   ├── cmd/api/        # Entry point aplikasi
│   ├── internal/       # Handler, service, repository, model, router
│   └── migrations/     # Skema DDL dan seed database
├── frontend/           # Aplikasi React + Vite + Tailwind CSS
│   ├── src/            # Komponen, halaman, API client, tipe data
│   └── vite.config.ts
├── docker-compose.yml  # Layanan PostgreSQL
├── .env.example        # Contoh environment variable root/DB
└── README.md
```

---

## Panduan Instalasi & Menjalankan

### 1. Database (PostgreSQL via Docker)

Pastikan Docker Desktop aktif, lalu jalankan:

```bash
docker compose up -d
```

Database akan berjalan pada port `5433` (atau sesuai konfigurasi `DB_PORT`). Skema migrasi pada `backend/migrations` akan dieksekusi otomatis saat inisialisasi awal kontainer.

### 2. Backend (Go)

1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Buat file `.env` (atau salin dari `.env.example` root):
   ```env
   PORT=8080
   DB_HOST=localhost
   DB_PORT=5433
   DB_NAME=stockflow_db
   DB_USER=stockflow_user
   DB_PASSWORD=admin
   ```
3. Unduh dependensi dan jalankan server:
   ```bash
   go mod download
   go run ./cmd/api/main.go
   ```
   Server backend berjalan di `http://localhost:8080`.

### 3. Frontend (React + Vite)

1. Masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Salin environment variable:
   ```bash
   cp .env.example .env
   ```
3. Instal dependensi dan jalankan development server:
   ```bash
   npm install
   npm run dev
   ```
   Aplikasi frontend dapat diakses melalui `http://localhost:5173`.

---

## API Endpoints

### Products
- `GET /api/products` - Daftar produk (query: `search`, `filter`, `page`, `limit`)
- `POST /api/products` - Tambah produk baru
- `PUT /api/products/{id}` - Perbarui data produk
- `DELETE /api/products/{id}` - Hapus produk
- `GET /api/products/summary` - Statistik ringkasan inventaris

### Stock
- `POST /api/products/{id}/adjust` - Penyesuaian stok (`in` / `out`)
- `GET /api/products/{id}/movements` - Riwayat pergerakan stok produk

### Orders
- `POST /api/orders` - Buat sales order baru
- `GET /api/orders/{id}` - Detail sales order
- `POST /api/orders/{id}/cancel` - Batalkan pesanan dan pulihkan stok
