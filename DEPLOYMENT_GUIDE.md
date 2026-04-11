# 🚀 Panduan Deployment - Shop Floor Dashboard MVP

## ✅ Status: READY FOR DEPLOYMENT

Semua komponen backend dan frontend telah selesai diimplementasi dan siap untuk deployment.

## 📋 Checklist Pre-Deployment

### Backend ✅
- [x] Database models (Machine, ProductionOrder)
- [x] Business logic services (CalculationService, ValidationService)
- [x] REST API endpoints (machines, production-orders, health)
- [x] Flask configuration dengan CORS
- [x] Database seeder dengan data dummy

### Frontend ✅
- [x] HTML templates (index, tv, supervisor)
- [x] API client dengan retry logic
- [x] Theme switcher (day/night auto)
- [x] TV Mode dengan auto-refresh
- [x] Shift handover event
- [x] Supervisor Mode dengan CRUD
- [x] Chart.js visualizations
- [x] Responsive layout (Tailwind CSS)
- [x] Sonoco branding (dark blue + lime green)

## 🛠️ Setup dan Deployment

### 1. Persiapan Environment

#### Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### Setup PostgreSQL Database
```bash
# Buat database baru
createdb shopfloor_db

# Atau via psql
psql -U postgres
CREATE DATABASE shopfloor_db;
\q
```

#### Konfigurasi Environment Variables
```bash
# Copy template
cp .env.example .env

# Edit .env dengan konfigurasi Anda
nano .env
```

Isi `.env`:
```
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/shopfloor_db
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=*
```

### 2. Inisialisasi Database

```bash
# Jalankan seeder untuk membuat tabel dan mengisi data dummy
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

### 3. Jalankan Backend Server

```bash
python app.py
```

Server akan berjalan di: `http://localhost:5000`

Output yang diharapkan:
```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://0.0.0.0:5000
```

### 4. Akses Dashboard

Buka browser dan akses:

- **Home Page**: http://localhost:5000/index.html
- **TV Mode**: http://localhost:5000/tv.html
- **Supervisor Mode**: http://localhost:5000/supervisor.html

## 🧪 Testing

### Backend API Testing

```bash
# Test health check
curl http://localhost:5000/api/health

# Test get machines
curl http://localhost:5000/api/machines

# Test get production orders
curl http://localhost:5000/api/production-orders

# Jalankan automated test script
bash test_api.sh
```

### Frontend Testing

1. **TV Mode Testing**:
   - Buka http://localhost:5000/tv.html
   - Verifikasi auto-refresh setiap 30 detik
   - Verifikasi theme switching (dark/light)
   - Verifikasi shift handover event (test di jam 1:45 PM, 9:45 PM, atau 5:45 AM)

2. **Supervisor Mode Testing**:
   - Buka http://localhost:5000/supervisor.html
   - Test create production order baru
   - Test edit production order existing
   - Verifikasi charts ter-update setelah perubahan data
   - Test responsive layout (resize browser)

## 📱 Responsive Breakpoints

- **Mobile**: < 768px (1 kolom)
- **Tablet**: 768px - 1024px (2 kolom)
- **Desktop**: > 1024px (3 kolom untuk TV Mode, full layout untuk Supervisor)

## 🎨 Branding

### Color Palette (Sonoco)
- **Primary Blue**: #1e3a8a (Dark Blue)
- **Primary Blue Dark**: #0f172a
- **Accent Green**: #84cc16 (Lime Green)
- **Accent Green Dark**: #65a30d

### Typography
- **TV Mode**: Large typography (24px+) untuk visibility dari jarak jauh
- **Supervisor Mode**: Standard typography untuk interactive use

## ⚙️ Konfigurasi Shift Times

Shift times dikonfigurasi di `static/js/tv-mode.js`:

```javascript
const SHIFT_TIMES = {
    Morning: { start: 6, end: 14 },      // 6 AM - 2 PM
    Afternoon: { start: 14, end: 22 },   // 2 PM - 10 PM
    Night: { start: 22, end: 6 }         // 10 PM - 6 AM
};
```

Shift handover trigger: **15 menit sebelum shift berakhir**
- Morning → Afternoon: 1:45 PM
- Afternoon → Night: 9:45 PM
- Night → Morning: 5:45 AM

## 🔧 Troubleshooting

### Database Connection Error
```
Error: could not connect to server
```
**Solusi**: 
- Pastikan PostgreSQL service running
- Cek DATABASE_URL di .env
- Cek username/password PostgreSQL

### CORS Error di Browser
```
Access to fetch at 'http://localhost:5000/api/...' has been blocked by CORS policy
```
**Solusi**:
- Pastikan Flask-CORS terinstall
- Cek CORS_ORIGINS di .env
- Restart Flask server

### Port Already in Use
```
OSError: [Errno 48] Address already in use
```
**Solusi**:
```bash
# Kill process di port 5000
lsof -ti:5000 | xargs kill -9

# Atau gunakan port lain
# Edit app.py, ganti port=5000 ke port lain
```

### Seeder Error
```
sqlalchemy.exc.IntegrityError
```
**Solusi**:
- Drop dan recreate database
- Atau jalankan seeder lagi (idempotent)

## 📊 Production Deployment

### Untuk Production Environment:

1. **Update .env untuk Production**:
```
FLASK_ENV=production
SECRET_KEY=<generate-strong-secret-key>
CORS_ORIGINS=https://yourdomain.com
DATABASE_URL=postgresql://user:pass@prod-db-host:5432/shopfloor_db
```

2. **Gunakan Production WSGI Server**:
```bash
# Install Gunicorn
pip install gunicorn

# Run dengan Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:create_app()
```

3. **Setup Reverse Proxy (Nginx)**:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /static {
        alias /path/to/shop-floor-dashboard/static;
    }
}
```

4. **Enable HTTPS** (recommended):
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

## 📈 Monitoring

### Health Check Endpoint
```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "ok",
  "message": "Shop Floor Dashboard API is healthy"
}
```

### Logs
- Flask development server: Output di terminal
- Production (Gunicorn): Configure logging di app.py

## 🎯 Next Steps (Future Enhancements)

- [ ] User authentication & authorization
- [ ] WebSocket untuk real-time updates (tanpa polling)
- [ ] Historical data tracking & trend analysis
- [ ] Export functionality (CSV, PDF reports)
- [ ] Mobile app version
- [ ] Push notifications untuk alerts
- [ ] Multi-language support
- [ ] Advanced filtering & search

## 📞 Support

Jika ada pertanyaan atau issue, silakan buat issue di repository atau hubungi tim development.

---

**Dashboard Version**: 1.0.0 (MVP)  
**Last Updated**: 2024  
**Status**: ✅ Production Ready
