# 🚀 Panduan Deployment ke Google Cloud Platform (GCP)

## 📋 Daftar Isi
1. [Persiapan Awal](#persiapan-awal)
2. [Setup GCP Project](#setup-gcp-project)
3. [Setup Cloud SQL (PostgreSQL)](#setup-cloud-sql-postgresql)
4. [Setup Artifact Registry](#setup-artifact-registry)
5. [Build dan Push Docker Image](#build-dan-push-docker-image)
6. [Deploy ke Cloud Run](#deploy-ke-cloud-run)
7. [Verifikasi Deployment](#verifikasi-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Persiapan Awal

### 1. Install Google Cloud SDK

```bash
# Download dan install gcloud CLI
# Untuk macOS (via Homebrew)
brew install --cask google-cloud-sdk

# Untuk Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Untuk Windows
# Download installer dari: https://cloud.google.com/sdk/docs/install
```

### 2. Login ke GCP

```bash
# Login dengan akun Google Anda
gcloud auth login

# Set default project (ganti dengan PROJECT_ID Anda)
gcloud config set project YOUR_PROJECT_ID

# Verifikasi konfigurasi
gcloud config list
```

### 3. Enable Required APIs

```bash
# Enable API yang diperlukan
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

---

## Setup GCP Project

### 1. Set Environment Variables

```bash
# Set project ID (ganti dengan project ID Anda)
export PROJECT_ID="your-project-id"
export REGION="asia-southeast2"  # Jakarta region
export SERVICE_NAME="shopfloor-dashboard"

# Verifikasi
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
```

### 2. Set Default Region

```bash
# Set default region untuk Cloud Run
gcloud config set run/region $REGION

# Set default region untuk Artifact Registry
gcloud config set artifacts/location $REGION
```

---

## Setup Cloud SQL (PostgreSQL)

### 1. Buat Cloud SQL Instance

```bash
# Buat PostgreSQL instance (tier db-f1-micro untuk testing, upgrade untuk production)
gcloud sql instances create shopfloor-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=YOUR_SECURE_ROOT_PASSWORD \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04

# Catatan: Proses ini memakan waktu 5-10 menit
```

**PENTING**: Simpan password root dengan aman!

### 2. Buat Database

```bash
# Buat database shopfloor_db
gcloud sql databases create shopfloor_db \
  --instance=shopfloor-db

# Verifikasi database terbuat
gcloud sql databases list --instance=shopfloor-db
```

### 3. Buat User Database (Optional)

```bash
# Buat user khusus untuk aplikasi (lebih secure daripada root)
gcloud sql users create shopfloor_user \
  --instance=shopfloor-db \
  --password=YOUR_SECURE_USER_PASSWORD

# List users
gcloud sql users list --instance=shopfloor-db
```

### 4. Dapatkan Connection Name

```bash
# Dapatkan connection name (format: PROJECT_ID:REGION:INSTANCE_NAME)
gcloud sql instances describe shopfloor-db --format="value(connectionName)"

# Simpan ke environment variable
export CLOUD_SQL_CONNECTION_NAME=$(gcloud sql instances describe shopfloor-db --format="value(connectionName)")
echo "Connection Name: $CLOUD_SQL_CONNECTION_NAME"
```

### 5. Setup Database Schema (Via Cloud SQL Proxy)

```bash
# Download Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Jalankan proxy di background
./cloud-sql-proxy $CLOUD_SQL_CONNECTION_NAME &

# Tunggu beberapa detik, lalu connect ke database
psql "host=127.0.0.1 port=5432 dbname=shopfloor_db user=postgres"

# Di dalam psql, jalankan seeder atau create tables
# Atau gunakan Python script untuk seeding
```

**Alternatif: Seeding via Python Script**

```bash
# Set environment variables untuk local connection via proxy
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/shopfloor_db"

# Jalankan seeder
python seed.py

# Stop proxy setelah selesai
pkill cloud-sql-proxy
```

---

## Setup Artifact Registry

### 1. Buat Repository untuk Docker Images

```bash
# Buat repository di Artifact Registry
gcloud artifacts repositories create shopfloor \
  --repository-format=docker \
  --location=$REGION \
  --description="Shop Floor Dashboard Docker images"

# Verifikasi repository terbuat
gcloud artifacts repositories list --location=$REGION
```

### 2. Configure Docker Authentication

```bash
# Configure Docker untuk authenticate ke Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

---

## Setup Secret Manager (Untuk Credentials)

### 1. Buat Secrets untuk Sensitive Data

```bash
# Buat secret untuk database password
echo -n "YOUR_SECURE_DB_PASSWORD" | \
  gcloud secrets create shopfloor-db-password \
    --data-file=- \
    --replication-policy="automatic"

# Buat secret untuk Flask secret key
# Generate secret key dulu
python -c "import secrets; print(secrets.token_hex(32))" > /tmp/secret_key.txt

# Upload ke Secret Manager
gcloud secrets create shopfloor-secret-key \
  --data-file=/tmp/secret_key.txt \
  --replication-policy="automatic"

# Hapus file temporary
rm /tmp/secret_key.txt

# Verifikasi secrets
gcloud secrets list
```

### 2. Grant Access ke Cloud Run Service Account

```bash
# Dapatkan service account Cloud Run
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
export CLOUD_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant access ke secrets
gcloud secrets add-iam-policy-binding shopfloor-db-password \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding shopfloor-secret-key \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Build dan Push Docker Image

### 1. Build Docker Image Locally (Testing)

```bash
# Build image
docker build -t shopfloor-dashboard:local .

# Test run locally
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5432/shopfloor_db" \
  shopfloor-dashboard:local

# Test di browser: http://localhost:8080
# Ctrl+C untuk stop
```

### 2. Build dan Push ke Artifact Registry

```bash
# Set image name
export IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/shopfloor/${SERVICE_NAME}"

# Build image dengan tag
docker build -t ${IMAGE_NAME}:latest .

# Push ke Artifact Registry
docker push ${IMAGE_NAME}:latest

# Verifikasi image ter-upload
gcloud artifacts docker images list ${REGION}-docker.pkg.dev/${PROJECT_ID}/shopfloor
```

**Alternatif: Build di Cloud (Recommended untuk Production)**

```bash
# Build menggunakan Cloud Build (lebih cepat dan reliable)
gcloud builds submit \
  --tag ${IMAGE_NAME}:latest \
  --timeout=20m

# Cloud Build akan otomatis build dan push image
```

---

## Deploy ke Cloud Run

### 1. Deploy Service ke Cloud Run

```bash
# Deploy dengan semua konfigurasi
gcloud run deploy $SERVICE_NAME \
  --image=${IMAGE_NAME}:latest \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME \
  --set-env-vars="CLOUD_SQL_CONNECTION_NAME=${CLOUD_SQL_CONNECTION_NAME},DB_USER=postgres,DB_NAME=shopfloor_db,FLASK_ENV=production,CORS_ORIGINS=*" \
  --set-secrets="DB_PASS=shopfloor-db-password:latest,SECRET_KEY=shopfloor-secret-key:latest" \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=10 \
  --min-instances=0 \
  --port=8080

# Catatan: Deployment memakan waktu 2-5 menit
```

**Penjelasan Parameter:**
- `--allow-unauthenticated`: Izinkan akses public (untuk dashboard)
- `--add-cloudsql-instances`: Connect ke Cloud SQL via Unix Socket
- `--set-env-vars`: Set environment variables
- `--set-secrets`: Mount secrets dari Secret Manager
- `--memory=512Mi`: Alokasi memory (sesuaikan dengan kebutuhan)
- `--cpu=1`: Alokasi CPU
- `--timeout=300`: Request timeout 5 menit
- `--max-instances=10`: Auto-scaling max 10 instances
- `--min-instances=0`: Scale to zero saat tidak ada traffic (hemat biaya)

### 2. Dapatkan Service URL

```bash
# Dapatkan URL service yang ter-deploy
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="value(status.url)"

# Simpan ke variable
export SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
echo "Service URL: $SERVICE_URL"
```

---

## Verifikasi Deployment

### 1. Test Health Check Endpoint

```bash
# Test health check
curl ${SERVICE_URL}/api/health

# Expected response:
# {"status":"ok","message":"Shop Floor Dashboard API is healthy"}
```

### 2. Test API Endpoints

```bash
# Test get machines
curl ${SERVICE_URL}/api/machines

# Test get production orders
curl ${SERVICE_URL}/api/production-orders

# Test create production order
curl -X POST ${SERVICE_URL}/api/production-orders \
  -H "Content-Type: application/json" \
  -d '{
    "machine_id": 1,
    "shift_name": "Morning",
    "order_date": "2024-01-20",
    "target_qty": 500,
    "completed_qty": 0,
    "wip_qty": 0
  }'
```

### 3. Test Frontend Pages

```bash
# Buka di browser
echo "Home Page: ${SERVICE_URL}/index.html"
echo "TV Mode: ${SERVICE_URL}/tv.html"
echo "Supervisor Mode: ${SERVICE_URL}/supervisor.html"
```

### 4. Monitor Logs

```bash
# Stream logs real-time
gcloud run services logs tail $SERVICE_NAME --region=$REGION

# View logs di Cloud Console
echo "Logs URL: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/logs?project=${PROJECT_ID}"
```

---

## Update CORS Origins (Production)

Setelah deployment, update CORS untuk security:

```bash
# Update CORS ke domain spesifik
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --update-env-vars="CORS_ORIGINS=https://yourdomain.com"

# Atau multiple domains
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --update-env-vars="CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com"
```

---

## Setup Custom Domain (Optional)

### 1. Map Custom Domain ke Cloud Run

```bash
# Map domain ke service
gcloud run domain-mappings create \
  --service=$SERVICE_NAME \
  --domain=dashboard.yourdomain.com \
  --region=$REGION

# Ikuti instruksi untuk update DNS records
```

### 2. Enable HTTPS (Automatic)

Cloud Run otomatis provision SSL certificate untuk custom domain.

---

## Setup CI/CD dengan Cloud Build (Optional)

### 1. Connect Repository ke Cloud Build

```bash
# Connect GitHub/GitLab repository
gcloud builds triggers create github \
  --repo-name=shopfloor-dashboard \
  --repo-owner=your-github-username \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml

# Setiap push ke main branch akan trigger auto-deployment
```

---

## Monitoring dan Maintenance

### 1. View Metrics

```bash
# View metrics di Cloud Console
echo "Metrics URL: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}"
```

### 2. Setup Alerts (Recommended)

```bash
# Setup alert untuk high error rate, latency, dll via Cloud Console
# Monitoring > Alerting > Create Policy
```

### 3. Database Backup

```bash
# Cloud SQL otomatis backup daily
# Verifikasi backup settings
gcloud sql instances describe shopfloor-db --format="value(settings.backupConfiguration)"

# Manual backup
gcloud sql backups create --instance=shopfloor-db
```

---

## Troubleshooting

### Issue: Container Failed to Start

```bash
# Check logs untuk error
gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=50

# Common issues:
# - Port mismatch (pastikan PORT=8080)
# - Database connection error (check Cloud SQL connection name)
# - Missing environment variables
```

### Issue: Database Connection Error

```bash
# Verifikasi Cloud SQL connection name
gcloud sql instances describe shopfloor-db --format="value(connectionName)"

# Pastikan Cloud Run service punya akses ke Cloud SQL
gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(spec.template.spec.containers[0].env)"

# Test connection via Cloud SQL Proxy
./cloud-sql-proxy $CLOUD_SQL_CONNECTION_NAME
psql "host=127.0.0.1 port=5432 dbname=shopfloor_db user=postgres"
```

### Issue: 502 Bad Gateway

```bash
# Biasanya karena container crash atau timeout
# Check logs
gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=100

# Increase memory/CPU jika perlu
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --memory=1Gi \
  --cpu=2
```

### Issue: Slow Performance

```bash
# Check metrics
gcloud run services describe $SERVICE_NAME --region=$REGION

# Increase min instances untuk reduce cold start
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --min-instances=1

# Increase max instances untuk handle traffic spike
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --max-instances=20
```

---

## Cost Optimization

### 1. Monitor Costs

```bash
# View billing di Cloud Console
echo "Billing URL: https://console.cloud.google.com/billing"

# Set budget alerts
```

### 2. Optimize Resources

```bash
# Scale to zero saat tidak ada traffic (default)
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --min-instances=0

# Reduce memory jika tidak diperlukan
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --memory=256Mi

# Downgrade Cloud SQL tier untuk development
gcloud sql instances patch shopfloor-db \
  --tier=db-f1-micro
```

---

## Rollback Deployment

### Rollback ke Revision Sebelumnya

```bash
# List revisions
gcloud run revisions list --service=$SERVICE_NAME --region=$REGION

# Rollback ke revision spesifik
gcloud run services update-traffic $SERVICE_NAME \
  --region=$REGION \
  --to-revisions=REVISION_NAME=100
```

---

## Cleanup Resources (Untuk Testing)

**PERINGATAN**: Ini akan menghapus semua resources!

```bash
# Delete Cloud Run service
gcloud run services delete $SERVICE_NAME --region=$REGION --quiet

# Delete Cloud SQL instance
gcloud sql instances delete shopfloor-db --quiet

# Delete Artifact Registry repository
gcloud artifacts repositories delete shopfloor --location=$REGION --quiet

# Delete secrets
gcloud secrets delete shopfloor-db-password --quiet
gcloud secrets delete shopfloor-secret-key --quiet
```

---

## 📚 Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)

---

## ✅ Checklist Deployment

- [x] Install gcloud CLI
- [x] Login dan set project
- [x] Enable required APIs
- [x] Buat Cloud SQL instance
- [x] Buat database dan user
- [ ] Setup database schema (seeding)
- [x] Buat Artifact Registry repository
- [ ] Setup Secret Manager
- [ ] Build Docker image
- [ ] Push image ke Artifact Registry
- [ ] Deploy ke Cloud Run
- [ ] Verifikasi health check
- [ ] Test API endpoints
- [ ] Test frontend pages
- [ ] Update CORS origins
- [ ] Setup monitoring alerts
- [ ] Setup custom domain (optional)
- [ ] Setup CI/CD (optional)

---

**🎉 Selamat! Shop Floor Dashboard berhasil di-deploy ke GCP Cloud Run!**

**Service URL**: Lihat output dari `gcloud run services describe`  
**Status**: Production Ready ✅  
**Auto-scaling**: Enabled  
**HTTPS**: Enabled (automatic)
