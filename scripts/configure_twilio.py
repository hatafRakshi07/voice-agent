"""
configure_twilio.py
────────────────────
Automatically sets the Twilio phone number webhook URLs
to the current BASE_URL from .env.

Usage:
    cd backend
    python ../scripts/configure_twilio.py
"""

import os
import sys
from pathlib import Path

# Load .env from backend/
env_path = Path(__file__).parent.parent / "backend" / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

from twilio.rest import Client

account_sid  = os.getenv("TWILIO_ACCOUNT_SID", "")
auth_token   = os.getenv("TWILIO_AUTH_TOKEN", "")
phone_number = os.getenv("TWILIO_PHONE_NUMBER", "")
base_url     = os.getenv("BASE_URL", "")

missing = [k for k, v in {
    "TWILIO_ACCOUNT_SID":  account_sid,
    "TWILIO_AUTH_TOKEN":   auth_token,
    "TWILIO_PHONE_NUMBER": phone_number,
    "BASE_URL":            base_url,
}.items() if not v or "your" in v or "xxxx" in v.lower()]

if missing:
    print(f"[ERROR] Missing or placeholder values in .env: {', '.join(missing)}")
    sys.exit(1)

voice_url  = f"{base_url}/api/twilio/voice"
status_url = f"{base_url}/api/twilio/status"

print(f"Connecting to Twilio as {account_sid[:8]}...")
client = Client(account_sid, auth_token)

numbers = client.incoming_phone_numbers.list(phone_number=phone_number)
if not numbers:
    print(f"[ERROR] Phone number {phone_number} not found in your Twilio account.")
    sys.exit(1)

numbers[0].update(
    voice_url=voice_url,
    voice_method="POST",
    status_callback=status_url,
    status_callback_method="POST",
)

print(f"[OK] Twilio webhook configured:")
print(f"     Voice URL  -> {voice_url}")
print(f"     Status URL -> {status_url}")
