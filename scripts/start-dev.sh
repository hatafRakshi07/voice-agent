#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# start-dev.sh
# One-command dev launcher for the AI Voice Call Agent.
#
# What it does:
#   1. Validates .env is filled in
#   2. Starts FastAPI backend (port 8000)
#   3. Starts ngrok tunnel  (gets public HTTPS URL)
#   4. Patches BASE_URL in .env with the live ngrok URL
#   5. Auto-configures Twilio webhook via Twilio API
#   6. Starts Next.js frontend (port 3000)
#   7. Prints a call-ready summary
#
# Usage:
#   bash scripts/start-dev.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"
NGROK_BIN="$HOME/bin/ngrok.exe"

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC}  $*"; }
warn() { echo -e "${YELLOW}[!!]${NC}  $*"; }
err()  { echo -e "${RED}[ERR]${NC} $*"; exit 1; }

echo ""
echo "================================================"
echo "  AI Voice Call Agent - Dev Launcher"
echo "================================================"
echo ""

# ── 1. Validate .env ──────────────────────────────────────────────────────────
[[ -f "$ENV_FILE" ]] || err ".env not found. Run: cp backend/.env.example backend/.env"

check_env() {
  local val
  val=$(grep "^$1=" "$ENV_FILE" | cut -d= -f2-)
  if [[ -z "$val" || "$val" == *"your-"* || "$val" == *"xxxx"* || "$val" == *"sk-your"* ]]; then
    err "$1 is not set in backend/.env — please fill it in first."
  fi
}

check_env OPENAI_API_KEY
check_env DEEPGRAM_API_KEY
check_env ELEVENLABS_API_KEY
check_env TWILIO_ACCOUNT_SID
check_env TWILIO_AUTH_TOKEN
check_env TWILIO_PHONE_NUMBER
check_env MONGODB_URL

ok "backend/.env looks good"

# ── 2. Start backend ──────────────────────────────────────────────────────────
echo ""
echo "[1/5] Starting FastAPI backend on :8000 ..."
cd "$ROOT/backend"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
sleep 4

# Check it's alive
curl -sf http://localhost:8000/health > /dev/null || err "Backend failed to start. Check logs above."
ok "Backend running (PID $BACKEND_PID)"

# ── 3. Start ngrok ────────────────────────────────────────────────────────────
echo ""
echo "[2/5] Starting ngrok tunnel on :8000 ..."
[[ -f "$NGROK_BIN" ]] || err "ngrok not found at $NGROK_BIN. Run the setup again."

"$NGROK_BIN" http 8000 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
sleep 5  # give ngrok time to establish tunnel

# ── 4. Get ngrok HTTPS URL ────────────────────────────────────────────────────
echo "[3/5] Reading ngrok public URL ..."
NGROK_URL=$(curl -sf http://localhost:4040/api/tunnels \
  | python -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(next(x['public_url'] for x in t if x['proto']=='https'))" \
  2>/dev/null) || err "Could not read ngrok URL. Is ngrok authenticated? Run: $NGROK_BIN config add-authtoken <YOUR_TOKEN>"

ok "ngrok URL: $NGROK_URL"

# Patch BASE_URL in .env
if grep -q "^BASE_URL=" "$ENV_FILE"; then
  sed -i "s|^BASE_URL=.*|BASE_URL=$NGROK_URL|" "$ENV_FILE"
else
  echo "BASE_URL=$NGROK_URL" >> "$ENV_FILE"
fi
ok "BASE_URL updated in .env"

# ── 5. Configure Twilio webhook ───────────────────────────────────────────────
echo ""
echo "[4/5] Configuring Twilio webhook ..."
cd "$ROOT/backend"
BASE_URL="$NGROK_URL" python "$ROOT/scripts/configure_twilio.py" || {
  warn "Twilio auto-config failed — set the webhook manually:"
  warn "  $NGROK_URL/api/twilio/voice"
}

# ── 6. Start frontend ─────────────────────────────────────────────────────────
echo ""
echo "[5/5] Starting Next.js frontend on :3000 ..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
sleep 3

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "================================================"
echo -e "${GREEN}  All systems GO!${NC}"
echo "================================================"
echo ""
echo "  Backend API : http://localhost:8000"
echo "  API Docs    : http://localhost:8000/docs"
echo "  Dashboard   : http://localhost:3000"
echo "  ngrok URL   : $NGROK_URL"
echo ""
PHONE=$(grep "^TWILIO_PHONE_NUMBER=" "$ENV_FILE" | cut -d= -f2-)
echo -e "  ${GREEN}>> Call $PHONE to talk to your AI agent! <<${NC}"
echo ""
echo "  Press Ctrl+C to stop all services."
echo ""

# Cleanup on exit
cleanup() {
  echo ""
  echo "Stopping services..."
  kill "$BACKEND_PID" "$NGROK_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "Stopped."
}
trap cleanup INT TERM

# Keep alive
wait "$BACKEND_PID"
