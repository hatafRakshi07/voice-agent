# 🤖 AI Voice Call Agent

A **production-ready**, real-time AI phone call agent that answers incoming calls, understands speech, generates intelligent replies, and responds in a cloned human voice.

Supports **fully offline operation** (Ollama + Whisper + XTTS-v2) or **cloud LLM** (Google Gemini API — free tier).

---

## Architecture

```
Caller
  │
  ▼
Telephony Layer  (choose one)
  ├── Asterisk PBX  ←→  FastAGI server (port 4573)
  └── Android SIM Gateway  ←→  WS /ws/android/{call_id}
  │
  ▼
FastAPI Backend
  ├── Whisper STT     float32 16kHz → real-time transcript
  ├── Gemini / Ollama transcript → conversational reply (streaming)
  └── Coqui XTTS-v2  reply → cloned WAV audio (sentence-by-sentence)
  │
  ▼
SQLite              call logs, conversation turns, voice profiles
  │
  ▼
Next.js Dashboard   live monitoring, call history, voice management
```

---

## Features

| Feature | Implementation |
|---|---|
| Real-time call handling | Asterisk FastAGI or Android WS gateway |
| Speech-to-text | faster-whisper (local, CPU/GPU) |
| LLM conversation | **Gemini API** (free tier) **or** Ollama (offline) |
| Text-to-speech | Coqui XTTS-v2 (local voice cloning) |
| Voice Activity Detection | WebRTC VAD or **Silero VAD** (neural) |
| Interruption handling | VAD + pipeline cancellation |
| Conversation memory | Sliding window (configurable turns) |
| Database | SQLite (zero-config) |
| Dashboard | Next.js 14 + Tailwind CSS |

---

## Tech Stack

- **Backend**: Python 3.11, FastAPI, uvicorn
- **STT**: faster-whisper (CTranslate2, CPU int8)
- **LLM**: Google Gemini API *or* Ollama (llama3, mistral, etc.)
- **TTS / Voice Cloning**: Coqui XTTS-v2
- **VAD**: WebRTC VAD (default) or Silero VAD (neural)
- **Telephony**: Asterisk 20 FastAGI *or* Android SIM gateway
- **Database**: SQLite (aiosqlite)
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS

---

## Quick Start

### Option A — Docker Compose (Fully Offline, Recommended)

```bash
# 1. Pull Ollama model
docker compose up -d ollama
docker exec -it voice_agent_ollama ollama pull llama3

# 2. Start everything
docker compose up --build -d
```

Frontend → http://localhost:3000 | Backend → http://localhost:8000

### Option B — Gemini API (Free Tier, Simpler Setup)

Get a free key at https://aistudio.google.com/app/apikey, then:

```bash
cp backend/.env.example backend/.env
# Set in backend/.env:
#   LLM_PROVIDER=gemini
#   GEMINI_API_KEY=your_key_here
```

No Ollama needed. Gemini free tier: 15 RPM, 1M tokens/day.

---

## Local Dev Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # edit with your settings
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # → http://localhost:3000
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `ollama` | `ollama` or `gemini` |
| `GEMINI_API_KEY` | *(empty)* | Google AI Studio key |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Gemini model |
| `OLLAMA_HOST` | `http://ollama:11434` | Ollama server |
| `OLLAMA_MODEL` | `llama3` | Model name |
| `WHISPER_MODEL` | `base` | `tiny`/`base`/`small`/`medium` |
| `TELEPHONY_PROVIDER` | `asterisk` | `asterisk` or `android` |
| `ANDROID_GATEWAY_SECRET` | *(empty)* | Shared secret for Android app |
| `USE_SILERO_VAD` | `false` | Enable neural Silero VAD |
| `SILERO_VAD_THRESHOLD` | `0.5` | Silero confidence threshold |
| `LOCAL_DEFAULT_VOICE_ID` | *(empty)* | Default XTTS voice |
| `AGENT_NAME` | `Nova` | Agent's spoken name |
| `AGENT_SYSTEM_PROMPT` | *(Nova persona)* | LLM system prompt |

See [backend/.env.example](backend/.env.example) for all variables.

---

## Android SIM Gateway

When `TELEPHONY_PROVIDER=android`, the backend accepts calls from an Android phone via WebSocket:

1. Android app calls `POST /api/android/call-start` → gets `call_id` + WebSocket URL
2. Android app connects `WS /ws/android/{call_id}`
3. Android streams PCM audio (int16, 16 kHz) → server returns WAV chunks
4. Call ends: `POST /api/android/call-end`

**Security**: Set `ANDROID_GATEWAY_SECRET` in `.env` to authenticate the Android app.

---

## Telephony (Asterisk)

See [telephony/asterisk/conf/pjsip.conf](telephony/asterisk/conf/pjsip.conf) for SIP trunk configuration.

For Indian numbers, use Plivo or Exotel as SIP trunk providers and fill in:
- `YOUR_SIP_USERNAME`, `YOUR_SIP_PASSWORD`, `YOUR_SIP_SERVER`

---

## Voice Cloning

1. Open dashboard → **Voices** tab
2. Upload 6–30 seconds of clean speech (WAV/MP3)
3. Set as default → all calls use that voice

---

## Project Structure

```
voice-clone/
├── backend/
│   ├── app/
│   │   ├── llm/
│   │   │   ├── ollama_client.py      Ollama LLM client
│   │   │   └── gemini_client.py      ★ Gemini API client (NEW)
│   │   ├── services/
│   │   │   ├── llm_service.py        ★ LLM factory (NEW)
│   │   │   ├── conversation_pipeline.py ★ Unified pipeline (NEW)
│   │   │   └── vad_service.py        ★ Silero VAD (NEW)
│   │   ├── routes/
│   │   │   └── android_gateway.py    ★ Android gateway endpoints (NEW)
│   │   └── telephony/
│   │       ├── base_provider.py      ★ Abstract telephony (NEW)
│   │       ├── asterisk_provider.py  ★ Asterisk wrapper (NEW)
│   │       ├── android_gateway_provider.py ★ Android (NEW)
│   │       └── twilio_provider.py    ★ Twilio stub (NEW)
├── frontend/
│   └── src/app/page.tsx              ★ Updated provider status display
├── telephony/asterisk/conf/
│   └── pjsip.conf                    Indian SIP trunk config
└── PROJECT_MIGRATION_PLAN.md         ★ Migration analysis
```

│   │   │   ├── tts_service.py       ElevenLabs TTS
│   │   │   └── context_manager.py   Conversation memory
│   │   ├── models/                  Pydantic models
│   │   └── database/                Motor + repositories
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                     Next.js App Router pages
│   │   ├── components/              React components
│   │   └── lib/                     API client + types
│   ├── package.json
│   └── Dockerfile
├── nginx/
│   └── nginx.conf                   Reverse proxy + WS
├── docker-compose.yml
└── scripts/setup.sh
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/twilio/voice` | Twilio incoming call webhook |
| `WS` | `/api/twilio/stream/{call_sid}` | Media Stream WebSocket |
| `POST` | `/api/twilio/status` | Call status callback |
| `GET` | `/api/calls` | List call logs |
| `GET` | `/api/calls/active` | Active calls |
| `GET` | `/api/calls/{sid}` | Single call record |
| `GET` | `/api/calls/{sid}/conversation` | Full transcript |
| `GET` | `/api/voices` | List voices |
| `POST` | `/api/voices/clone` | Create voice clone |
| `POST` | `/api/voices/{id}/default` | Set default voice |
| `DELETE` | `/api/voices/{id}` | Delete voice |
| `GET` | `/api/dashboard/stats` | Aggregate stats |
| `GET` | `/api/dashboard/live-events` | SSE live stats stream |
| `GET` | `/health` | Health check |

---

## Latency Optimisations

- **Deepgram** receives μ-law 8 kHz directly — no resampling
- **ElevenLabs** outputs `ulaw_8000` — no conversion before sending to Twilio
- **Streaming TTS** — first audio chunks sent before synthesis is complete
- **Interruption handling** — `clear` event stops playback instantly
- **GPT-4o** — fastest OpenAI model for conversational responses

---

## Security Notes

- Add Twilio request signature validation in production (`twilio.request_validator`)
- Store secrets in environment variables only — never commit `.env`
- Restrict `CORS_ORIGINS` to your dashboard domain in production
- Use HTTPS/WSS everywhere — Twilio requires it for Media Streams

---

## License

MIT
