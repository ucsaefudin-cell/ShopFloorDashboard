#!/bin/bash

# Script helper untuk testing Docker container secara local
# Sebelum deploy ke GCP, test dulu dengan Docker Compose

set -e

echo "=========================================="
echo "SHOP FLOOR DASHBOARD - DOCKER TEST"
echo "=========================================="
echo ""

# Warna untuk output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function untuk print dengan warna
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Step 1: Build dan start containers
echo "Step 1: Building dan starting containers..."
docker-compose up -d --build

if [ $? -eq 0 ]; then
    print_success "Containers berhasil dijalankan"
else
    print_error "Gagal menjalankan containers"
    exit 1
fi

echo ""

# Step 2: Tunggu database ready
echo "Step 2: Menunggu database ready..."
sleep 5

# Check database health
DB_READY=$(docker-compose exec -T db pg_isready -U postgres | grep "accepting connections")
if [ -n "$DB_READY" ]; then
    print_success "Database ready"
else
    print_warning "Database belum ready, tunggu 5 detik lagi..."
    sleep 5
fi

echo ""

# Step 3: Run seeder
echo "Step 3: Running database seeder..."
docker-compose exec -T app python seed.py

if [ $? -eq 0 ]; then
    print_success "Database seeding berhasil"
else
    print_error "Database seeding gagal"
fi

echo ""

# Step 4: Tunggu app ready
echo "Step 4: Menunggu aplikasi ready..."
sleep 3

# Step 5: Test health check
echo "Step 5: Testing health check endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8080/api/health)

if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
    print_success "Health check passed"
    echo "Response: $HEALTH_RESPONSE"
else
    print_error "Health check failed"
    echo "Response: $HEALTH_RESPONSE"
fi

echo ""

# Step 6: Test API endpoints
echo "Step 6: Testing API endpoints..."

# Test machines endpoint
echo "Testing GET /api/machines..."
MACHINES_RESPONSE=$(curl -s http://localhost:8080/api/machines)
MACHINES_COUNT=$(echo $MACHINES_RESPONSE | grep -o '"id"' | wc -l)

if [ $MACHINES_COUNT -gt 0 ]; then
    print_success "Machines endpoint OK ($MACHINES_COUNT machines found)"
else
    print_error "Machines endpoint failed"
fi

# Test production orders endpoint
echo "Testing GET /api/production-orders..."
ORDERS_RESPONSE=$(curl -s http://localhost:8080/api/production-orders)
ORDERS_COUNT=$(echo $ORDERS_RESPONSE | grep -o '"id"' | wc -l)

if [ $ORDERS_COUNT -gt 0 ]; then
    print_success "Production orders endpoint OK ($ORDERS_COUNT orders found)"
else
    print_error "Production orders endpoint failed"
fi

echo ""

# Step 7: Show logs
echo "Step 7: Menampilkan logs aplikasi (5 detik terakhir)..."
echo "----------------------------------------"
docker-compose logs --tail=20 app
echo "----------------------------------------"

echo ""

# Summary
echo "=========================================="
echo "TESTING SELESAI"
echo "=========================================="
echo ""
echo "Dashboard URLs:"
echo "  - Home: http://localhost:8080/index.html"
echo "  - TV Mode: http://localhost:8080/tv.html"
echo "  - Supervisor Mode: http://localhost:8080/supervisor.html"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f app"
echo "  - Stop containers: docker-compose down"
echo "  - Restart: docker-compose restart"
echo "  - Clean up: docker-compose down -v"
echo ""
print_success "Buka browser dan test dashboard!"
