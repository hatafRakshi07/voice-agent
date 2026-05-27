#!/usr/bin/env bash
# setup.sh — Quick-start script for local development
set -euo pipefail

echo "=== AI Voice Call Agent — Setup ==="

# ── 1. Copy .env if not present ───────────────────────────────────────────────
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "✅  Created backend/.env — fill in your API keys before running."
else
  echo "ℹ️   backend/.env already exists."
fi

# ── 2. Python virtual env ─────────────────────────────────────────────────────
echo ""
echo "Setting up Python virtual environment..."
cd backend
python -m venv .venv
# shellcheck disable=SC1091
source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
echo "✅  Python dependencies installed."
cd ..

# ── 3. Node dependencies ──────────────────────────────────────────────────────
echo ""
echo "Installing frontend Node dependencies..."
cd frontend
npm install --silent
echo "✅  Node dependencies installed."
cd ..

# ── 4. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your API keys"
echo "  2. Start MongoDB:  docker run -d -p 27017:27017 mongo:7"
echo "  3. Start backend:  cd backend && uvicorn app.main:app --reload"
echo "  4. Start frontend: cd frontend && npm run dev"
echo "  5. Expose backend: ngrok http 8000"
echo "     Then set BASE_URL in .env to the ngrok HTTPS URL"
echo "  6. Set Twilio webhook: https://<ngrok>/api/twilio/voice"
