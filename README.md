# 🤖 AI Voice Call Agent

A **production-ready**, real-time AI phone call agent that answers incoming calls, understands speech, generates intelligent replies with GPT-4o, and responds in a cloned human voice — all with sub-second latency.

---

## Architecture

```
Caller
  │  (PSTN)
  ▼
Twilio Phone Number
  │  POST /api/twilio/voice  →  TwiML (connect Media Stream)
  │  WSS  /api/twilio/stream/{call_sid}
  ▼
FastAPI Backend
  ├── Deepgram (STT)     μ-law 8 kHz → real-time transcript
  ├── OpenAI GPT-4o      transcript → conversational reply
  └── ElevenLabs (TTS)   reply → μ-law 8 kHz audio stream
  │
  ▼
MongoDB              call logs, conversation turns, voice profiles
  │
  ▼
Next.js Dashboard    live monitoring, call history, voice management
```

---

## Features

| Feature | Implementation |
|---|---|
| Real-time call handling | Twilio Media Streams + FastAPI WebSocket |
| Speech-to-text | Deepgram Nova-2 (μ-law 8 kHz, no conversion) |
| LLM conversation | OpenAI GPT-4o with rolling context window |
| Text-to-speech | ElevenLabs Turbo v2.5 (ulaw_8000 output) |
| Voice cloning | ElevenLabs Instant Voice Clone API |
| Interruption handling | Energy-based VAD + Twilio `clear` event |
| Conversation memory | Sliding window (configurable turns) |
| Call summaries | GPT-4o post-call summarisation |
| Database | MongoDB via Motor (async) |
| Dashboard | Next.js 14 + Tailwind CSS |
| Production deploy | Docker Compose + Nginx (TLS + WS upgrade) |

---

## Tech Stack

- **Backend**: Python 3.11, FastAPI, uvicorn
- **STT**: Deepgram Nova-2
- **LLM**: OpenAI GPT-4o
- **TTS / Voice Cloning**: ElevenLabs Turbo v2.5
- **Telephony**: Twilio Media Streams
- **Database**: MongoDB + Motor
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Infra**: Docker Compose, Nginx

---

## Quick Start (Local Dev)

### Prerequisites

- Python 3.11+
- Node.js 20+
- MongoDB (local or Atlas)
- [ngrok](https://ngrok.com) (to expose localhost to Twilio)
- Accounts: [Twilio](https://twilio.com), [OpenAI](https://platform.openai.com), [Deepgram](https://deepgram.com), [ElevenLabs](https://elevenlabs.io)

### 1. Clone & configure

```bash
git clone <this-repo>
cd "voice assitant"
cp backend/.env.example backend/.env
# Edit backend/.env and fill in all API keys
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev          # → http://localhost:3000
```

### 4. Expose backend with ngrok

```bash
ngrok http 8000
# Copy the HTTPS URL, e.g. https://abc123.ngrok.io
```

Set in `backend/.env`:
```
BASE_URL=https://abc123.ngrok.io
```

### 5. Configure Twilio

1. Go to your Twilio phone number settings
2. Set **Voice → A call comes in → Webhook** to:
   ```
   https://abc123.ngrok.io/api/twilio/voice
   ```
3. Set **Call status changes** to:
   ```
   https://abc123.ngrok.io/api/twilio/status
   ```

### 6. Make a test call

Call your Twilio number. The agent will:
1. Answer and greet you
2. Transcribe everything you say (Deepgram)
3. Reply intelligently (GPT-4o)
4. Speak back in the configured ElevenLabs voice

---

## Production Deploy (Docker)

```bash
# 1. Build and start all services
docker compose up --build -d

# 2. Place TLS certificates in nginx/certs/
#    fullchain.pem + privkey.pem

# 3. Update nginx/nginx.conf server_name with your domain

# 4. Restart nginx
docker compose restart nginx
```

---

## Voice Cloning

1. Open the dashboard → **Voices** tab
2. Click **Clone New Voice**
3. Upload 1–25 clear audio samples (WAV/MP3, 1–3 min total)
4. Give the voice a name and click **Clone Voice**
5. Once cloned, click **Set Default** to use it for all calls

You can also set a per-call voice by storing `voice_id` on the Call record.

---

## Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Model name (default: `gpt-4o`) |
| `DEEPGRAM_API_KEY` | Deepgram API key |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `ELEVENLABS_DEFAULT_VOICE_ID` | Voice ID used for TTS |
| `ELEVENLABS_MODEL_ID` | TTS model (default: `eleven_turbo_v2_5`) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number |
| `MONGODB_URL` | MongoDB connection string |
| `BASE_URL` | Public HTTPS URL (for TwiML WS URL) |
| `AGENT_NAME` | Agent's name spoken in greeting |
| `AGENT_SYSTEM_PROMPT` | System prompt for GPT-4o |
| `MAX_CONVERSATION_TURNS` | Conversation memory window |

---

## Project Structure

```
voice assitant/
├── backend/
│   ├── app/
│   │   ├── main.py                  FastAPI app + lifespan
│   │   ├── config.py                Pydantic settings
│   │   ├── routes/
│   │   │   ├── twilio_routes.py     Webhook + WebSocket
│   │   │   ├── call_routes.py       Call log API
│   │   │   ├── voice_routes.py      Voice clone API
│   │   │   └── dashboard_routes.py  Stats + SSE
│   │   ├── services/
│   │   │   ├── call_handler.py      ★ Core audio pipeline
│   │   │   ├── stt_service.py       Deepgram STT
│   │   │   ├── llm_service.py       OpenAI GPT-4o
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
