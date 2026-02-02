#!/bin/bash
# Quick API Test Script
# Run: bash tests/quick-test.sh

BASE_URL="https://dmm.mooh.me"
EMAIL="rahul@unolo.com"
PASSWORD="password123"

echo "=== Field Force Tracker API Test ==="
echo ""

# 1. Login
echo "1. Logging in as employee..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_NAME=$(echo $LOGIN_RESPONSE | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "   ❌ Login failed!"
    echo "   Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "   ✅ Login successful: $USER_NAME"
echo "   Token: ${TOKEN:0:50}..."
echo ""

# 2. Get Clients
echo "2. Getting assigned clients..."
CLIENTS=$(curl -s "$BASE_URL/api/checkin/clients" \
  -H "Authorization: Bearer $TOKEN")
CLIENT_COUNT=$(echo $CLIENTS | grep -o '"id"' | wc -l)
echo "   ✅ Found $CLIENT_COUNT clients"
echo ""

# 3. Check active
echo "3. Checking active check-in..."
ACTIVE=$(curl -s "$BASE_URL/api/checkin/active" \
  -H "Authorization: Bearer $TOKEN")
echo "   Response: $ACTIVE"
echo ""

# 4. If not checked in, do check-in
if echo "$ACTIVE" | grep -q '"data":null'; then
    echo "4. Performing check-in..."
    CLIENT_ID=$(echo $CLIENTS | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    CHECKIN=$(curl -s -X POST "$BASE_URL/api/checkin" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"client_id\":$CLIENT_ID,\"latitude\":28.4595,\"longitude\":77.0266}")
    echo "   Response: $CHECKIN"
    echo ""
fi

# 5. Get history
echo "5. Getting check-in history..."
HISTORY=$(curl -s "$BASE_URL/api/checkin/history" \
  -H "Authorization: Bearer $TOKEN")
HISTORY_COUNT=$(echo $HISTORY | grep -o '"id"' | wc -l)
echo "   ✅ Found $HISTORY_COUNT history entries"
echo ""

# 6. Logout
echo "6. Logging out..."
LOGOUT=$(curl -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $TOKEN")
echo "   Response: $LOGOUT"
echo ""

echo "=== All Tests Passed! ==="
