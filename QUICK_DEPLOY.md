# ⚡ Quick Deploy ke GCP Cloud Run

Panduan singkat untuk deployment cepat ke Google Cloud Platform.

## 🚀 Prerequisites

```bash
# Install gcloud CLI (jika belum)
# macOS: brew install --cask google-cloud-sdk
# Linux: curl https://sdk.cloud.google.com | bash

# Login
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID
```

## 📝 Setup Variables

```bash
# Set environment variables
export PROJECT_ID="your-project-id"
export REGION="asia-southeast2"
export SERVICE_NAME="shopfloor-dashboard"
export DB_PASSWORD="your-secure-password"
```

## ⚙️ One-Time Setup (Pertama Kali)

### 1. Enable APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 2. Buat Cloud SQL

```bash
# Buat instance (5-10 menit)
gcloud sql instances create shopfloor-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=$DB_PASSWORD

# Buat database
gcloud sql databases create shopfloor_db --instance=shopfloor-db

# Dapatkan connection name
export CLOUD_SQL_CONNECTION_NAME=$(gcloud sql instances describe shopfloor-db --format="value(connectionName)")
```

### 3. Seeding Database

```bash
# Download Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Jalankan proxy
./cloud-sql-proxy $CLOUD_SQL_CONNECTION_NAME &

# Set DATABASE_URL dan run seeder
export DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@127.0.0.1:5432/shopfloor_db"
python seed.py

# Stop proxy
pkill cloud-sql-proxy
```

### 4. Setup Artifact Registry

```bash
# Buat repository
gcloud artifacts repositories create shopfloor \
  --repository-format=docker \
  --location=$REGION

# Configure Docker auth
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

### 5. Setup Secrets

```bash
# Database password
echo -n "$DB_PASSWORD" | gcloud secrets create shopfloor-db-password --data-file=-

# Flask secret key
python -c "import secrets; print(secrets.token_hex(32))" | gcloud secrets create shopfloor-secret-key --data-file=-

# Grant access
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
export CLOUD_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding shopfloor-db-password \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding shopfloor-secret-key \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

## 🚢 Deploy (Setiap Update)

### Build dan Deploy dalam 1 Command

```bash
# Build di Cloud dan deploy
gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/shopfloor/${SERVICE_NAME}:latest && \
gcloud run deploy $SERVICE_NAME \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/shopfloor/${SERVICE_NAME}:latest \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME \
  --set-env-vars="CLOUD_SQL_CONNECTION_NAME=${CLOUD_SQL_CONNECTION_NAME},DB_USER=postgres,DB_NAME=shopfloor_db,FLASK_ENV=production,CORS_ORIGINS=*" \
  --set-secrets="DB_PASS=shopfloor-db-password:latest,SECRET_KEY=shopfloor-secret-key:latest" \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=10 \
  --min-instances=0
```

### Dapatkan URL

```bash
# Get service URL
gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)"
```

## ✅ Verifikasi

```bash
# Set URL
export SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

# Test health
curl ${SERVICE_URL}/api/health

# Test API
curl ${SERVICE_URL}/api/machines

# Buka di browser
echo "Dashboard: ${SERVICE_URL}/index.html"
```

## 🔄 Update Deployment

```bash
# Rebuild dan redeploy
gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/shopfloor/${SERVICE_NAME}:latest && \
gcloud run deploy $SERVICE_NAME \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/shopfloor/${SERVICE_NAME}:latest \
  --region=$REGION
```

## 📊 Monitoring

```bash
# View logs
gcloud run services logs tail $SERVICE_NAME --region=$REGION

# View metrics
echo "https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}"
```

## 🛑 Rollback

```bash
# List revisions
gcloud run revisions list --service=$SERVICE_NAME --region=$REGION

# Rollback
gcloud run services update-traffic $SERVICE_NAME \
  --region=$REGION \
  --to-revisions=REVISION_NAME=100
```

## 💰 Cost Optimization

```bash
# Scale to zero (default, hemat biaya)
gcloud run services update $SERVICE_NAME --region=$REGION --min-instances=0

# Reduce memory
gcloud run services update $SERVICE_NAME --region=$REGION --memory=256Mi
```

## 🗑️ Cleanup (Testing Only)

```bash
# Delete everything
gcloud run services delete $SERVICE_NAME --region=$REGION --quiet
gcloud sql instances delete shopfloor-db --quiet
gcloud artifacts repositories delete shopfloor --location=$REGION --quiet
gcloud secrets delete shopfloor-db-password --quiet
gcloud secrets delete shopfloor-secret-key --quiet
```

---

## 📚 Full Documentation

Lihat `GCP_DEPLOYMENT_GUIDE.md` untuk dokumentasi lengkap dan troubleshooting.

---

**⚡ Total waktu deployment: ~15-20 menit (pertama kali)**  
**⚡ Update deployment: ~3-5 menit**
