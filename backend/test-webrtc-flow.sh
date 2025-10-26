#!/bin/bash

# Quick test script for WebRTC session end functionality

echo "🧪 Testing WebRTC Session End Flow"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
echo "1️⃣  Checking services..."

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis is not running. Start with: brew services start redis${NC}"
    exit 1
fi

# Check Backend
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running. Start with: cd backend && npm run dev${NC}"
    exit 1
fi

# Check WebRTC Server
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ WebRTC Server is running${NC}"
else
    echo -e "${YELLOW}⚠️  WebRTC Server might not be running${NC}"
fi

echo ""
echo "2️⃣  Testing backend configuration..."

# Test debug endpoint
DEBUG_RESPONSE=$(curl -s http://localhost:4000/api/webrtc-debug)
echo "$DEBUG_RESPONSE" | jq . 2>/dev/null || echo "$DEBUG_RESPONSE"

echo ""
echo "3️⃣  Creating test session mapping..."

# Generate random session ID
SESSION_ID="test-session-$(date +%s)"
echo "Session ID: $SESSION_ID"

# Store session in Redis
redis-cli HSET "session:$SESSION_ID" \
    sessionId "$SESSION_ID" \
    studentAddress "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" \
    tutorAddress "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" \
    languageId "0" \
    startTime "$(date +%s)000" > /dev/null

echo -e "${GREEN}✅ Session mapping created${NC}"

# Verify
echo ""
echo "Verifying session in Redis:"
redis-cli HGETALL "session:$SESSION_ID"

echo ""
echo "4️⃣  Simulating WebRTC session-ended event..."

RESPONSE=$(curl -s -X POST http://localhost:4000/api/webrtc-events \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"session-ended\",
    \"sessionId\": \"$SESSION_ID\",
    \"endedBy\": \"student\",
    \"userAddress\": \"0x70997970C51812dc3A010C7d01b50e0d17dc79C8\",
    \"timestamp\": $(date +%s)000
  }")

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "\"success\":true"; then
    echo -e "${GREEN}✅ Event accepted by backend${NC}"
else
    echo -e "${RED}❌ Event failed${NC}"
fi

echo ""
echo "5️⃣  Check backend logs for:"
echo "   - 📡 WebRTC Event received"
echo "   - 🔍 Looking up session mapping"
echo "   - 🔗 Calling endSession on smart contract"
echo "   - ✅ Session ended on blockchain"

echo ""
echo "6️⃣  Verify session was cleaned up:"
REMAINING=$(redis-cli EXISTS "session:$SESSION_ID")
if [ "$REMAINING" = "0" ]; then
    echo -e "${GREEN}✅ Session cleaned up from Redis${NC}"
else
    echo -e "${YELLOW}⚠️  Session still in Redis (TTL: $(redis-cli TTL session:$SESSION_ID)s)${NC}"
fi

echo ""
echo "======================================"
echo "🎉 Test complete! Check backend logs for transaction details."
