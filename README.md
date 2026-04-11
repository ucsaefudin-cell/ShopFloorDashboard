# Shop Floor Dashboard MVP

Dashboard monitoring produksi real-time untuk lingkungan manufaktur dengan dua mode operasi: TV Mode (zero-touch) dan Supervisor Mode (interaktif).

## Tech Stack

- **Backend**: Python 3.x, Flask 3.0, SQLAlchemy 2.0
- **Database**: PostgreSQL 14+
- **Frontend**: Vanilla JavaScript (ES6+), Chart.js, Tailwind CSS

## Setup Awal

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Setup Database PostgreSQL

Buat database baru di PostgreSQL:

```sql
CREATE DATABASE shopfloor_db;
```

### 3. Konfigurasi Environment Variables

Copy file `.env.example` menjadi `.env` dan sesuaikan dengan konfigurasi Anda:

```bash
cp .env.example .env
```

Edit file `.env`:

```
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/shopfloor_db
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=*
```

### 4. Inisialisasi Database dan Seeding

Jalankan script seeder untuk membuat tabel dan mengisi data dummy:

```bash
python seed.py
```

Output yang diharapkan:
```
==================================================
SHOP FLOOR DASHBOARD - DATABASE SEEDER
==================================================

✓ Database tables created successfully
Menghapus data existing...
✓ Data lama berhasil dihapus
Seeding data mesin...
✓ 5 mesin berhasil dibuat
Seeding data production orders...
✓ 20 production orders berhasil dibuat

==================================================
✓ SEEDING SELESAI!
==================================================
```

### 5. Jalankan Backend Server

```bash
python app.py
```

Server akan berjalan di `http://localhost:5000`

## Struktur Project

```
.
├── app.py                 # Flask application entry point
├── config.py              # Konfigurasi aplikasi
├── database.py            # Database connection dan session management
├── models.py              # SQLAlchemy ORM models
├── seed.py                # Database seeder script
├── requirements.txt       # Python dependencies
├── .env.example          # Template environment variables
└── README.md             # Dokumentasi ini
```

## Database Schema

### Table: mst_machine
- `id` (PK, Integer)
- `machine_code` (String, Unique)
- `machine_name` (String)
- `is_active` (Boolean)

### Table: trx_production_order
- `id` (PK, Integer)
- `machine_id` (FK -> mst_machine.id)
- `shift_name` (String)
- `order_date` (Date)
- `target_qty` (Integer)
- `completed_qty` (Integer)
- `wip_qty` (Integer)
- `created_at` (DateTime)

## Calculated Fields

- **pending_qty**: `target_qty - completed_qty - wip_qty`
- **efficiency_percent**: `(completed_qty / target_qty) * 100`

## Next Steps

Task 1 (Backend Scaffolding) telah selesai. Selanjutnya:
- Task 2: Implement business logic services
- Task 3: Implement REST API endpoints
- Task 4: Configure Flask and CORS
- Task 5: Backend validation checkpoint

## Development Notes

- Semua komentar kode dalam Bahasa Indonesia
- Nama variabel dan fungsi dalam Bahasa Inggris (standar engineering)
- Database menggunakan PostgreSQL dengan SQLAlchemy ORM
- CORS enabled untuk development (batasi di production)
