#!/bin/bash

# Script untuk testing API endpoints secara manual
# Pastikan Flask server sudah running di http://localhost:5000

echo "=========================================="
echo "SHOP FLOOR DASHBOARD - API TESTING"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5000"

# Test 1: Health Check
echo "1. Testing Health Check Endpoint..."
curl -s -X GET "$BASE_URL/api/health" | python -m json.tool
echo ""
echo ""

# Test 2: Get All Machines
echo "2. Testing GET /api/machines..."
curl -s -X GET "$BASE_URL/api/machines" | python -m json.tool
echo ""
echo ""

# Test 3: Get All Production Orders
echo "3. Testing GET /api/production-orders..."
curl -s -X GET "$BASE_URL/api/production-orders" | python -m json.tool | head -50
echo "... (output dipotong untuk readability)"
echo ""
echo ""

# Test 4: Get Single Production Order
echo "4. Testing GET /api/production-orders/1..."
curl -s -X GET "$BASE_URL/api/production-orders/1" | python -m json.tool
echo ""
echo ""

# Test 5: Create New Production Order
echo "5. Testing POST /api/production-orders (Create)..."
curl -s -X POST "$BASE_URL/api/production-orders" \
  -H "Content-Type: application/json" \
  -d '{
    "machine_id": 1,
    "shift_name": "Morning",
    "order_date": "2024-01-20",
    "target_qty": 300,
    "completed_qty": 0,
    "wip_qty": 0
  }' | python -m json.tool
echo ""
echo ""

# Test 6: Update Production Order
echo "6. Testing PUT /api/production-orders/1 (Update)..."
curl -s -X PUT "$BASE_URL/api/production-orders/1" \
  -H "Content-Type: application/json" \
  -d '{
    "completed_qty": 250,
    "wip_qty": 40
  }' | python -m json.tool
echo ""
echo ""

# Test 7: Filter by Machine
echo "7. Testing GET /api/production-orders?machine_id=1..."
curl -s -X GET "$BASE_URL/api/production-orders?machine_id=1" | python -m json.tool | head -30
echo "... (output dipotong untuk readability)"
echo ""
echo ""

# Test 8: Error Handling - Invalid Data
echo "8. Testing Error Handling (Invalid Data)..."
curl -s -X POST "$BASE_URL/api/production-orders" \
  -H "Content-Type: application/json" \
  -d '{
    "machine_id": 999,
    "shift_name": "InvalidShift",
    "target_qty": -100
  }' | python -m json.tool
echo ""
echo ""

# Test 9: Error Handling - Not Found
echo "9. Testing Error Handling (Not Found)..."
curl -s -X GET "$BASE_URL/api/production-orders/99999" | python -m json.tool
echo ""
echo ""

echo "=========================================="
echo "API TESTING SELESAI"
echo "=========================================="
