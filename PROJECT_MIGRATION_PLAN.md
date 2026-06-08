# Project Migration Plan

## 1. Current Architecture (Actual State)

The codebase has **already been migrated** from the cloud-API stack to a fully offline, open-source stack.
The README was outdated. Here is what the code actually uses:

| Layer | Current Implementation | File |
|---|---|---|
| STT | faster-whisper (local, CPU int8) | `backend/app/stt/whisper_engine.py` |
| LLM | Ollama REST client (llama3 etc.) | `backend/app/llm/ollama_client.py` |
| TTS | Coqui XTTS-v2 (local voice clone) | `backend/app/tts/xtts_engine.py` |
| VAD | WebRTC VAD (built into whisper_engine) | `backend/app/stt/whisper_engine.py` |
| Telephony | Asterisk FastAGI + Browser WebSocket | `backend/app/telephony/fastagi_server.py` |
| Database | SQLite (aiosqlite) | `backend/app/database/sqlite.py` |
| Frontend | Next.js 14 + Tailwind CSS | `frontend/` |

### Services no longer in code (already removed)
- ~~Twilio~~ → Asterisk + WebSocket
- ~~Deepgram~~ → faster-whisper
- ~~OpenAI GPT-4o~~ → Ollama
- ~~ElevenLabs~~ → Coqui XTTS-v2
- ~~MongoDB~~ → SQLite

---

## 2. Current Dependencies (requirements.txt)

```
fastapi, uvicorn, pydantic, pydantic-settings
aiosqlite
faster-whisper, webrtcvad-wheels
httpx, aiohttp              ← Ollama REST client
TTS (Coqui XTTS-v2), transformers==4.39.3
numpy, soundfile, scipy, librosa
websockets, aiofiles
datasets, evaluate, jiwer, accelerate, ctranslate2   ← Whisper fine-tuning
loguru, python-multipart
```

---

## 3. Previously Dependent Files (all now replaced)

### Twilio-dependent (removed)
- `backend/app/routes/twilio_routes.py` — empty stub, kept for import safety

### Deepgram-dependent (replaced)
- `backend/app/services/stt_service.py` — now a shim to `whisper_engine.py`

### OpenAI-dependent (replaced)
- `backend/app/services/llm_service.py` — now a shim to `ollama_client.py`

### ElevenLabs-dependent (replaced)
- `backend/app/services/tts_service.py` — now a shim to `xtts_engine.py`

---

## 4. Files That Can Be Fully Reused

| File | Status |
|---|---|
| `backend/app/main.py` | Reuse — minor additions for new routes |
| `backend/app/config.py` | Reuse — add new env vars |
| `backend/app/stt/whisper_engine.py` | Reuse — already complete |
| `backend/app/tts/xtts_engine.py` | Reuse — already complete |
| `backend/app/audio/processor.py` | Reuse — no changes |
| `backend/app/database/sqlite.py` | Reuse — no changes |
| `backend/app/memory/conversation_store.py` | Reuse — no changes |
| `backend/app/websocket/audio_pipeline.py` | Modify — use LLM factory |
| `backend/app/telephony/fastagi_server.py` | Modify — use LLM factory |
| `backend/app/routes/ws_routes.py` | Modify — use LLM factory + status update |
| `frontend/` | Modify — add Gemini/provider status display |

---

## 5. Migration Strategy

### Phase 2 — Add Gemini as LLM option
- Create `backend/app/llm/gemini_client.py` (same interface as OllamaClient)
- Update `config.py`: add `LLM_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`
- Update `llm_service.py`: factory that returns Gemini or Ollama based on `LLM_PROVIDER`
- Update `audio_pipeline.py`, `fastagi_server.py`, `ws_routes.py` to use factory

### Phase 3 — STT (No Change Needed)
- faster-whisper is already the STT engine

### Phase 4 — TTS (No Change Needed)
- Coqui XTTS-v2 is already the TTS engine

### Phase 5 — Telephony Abstraction
- Create `backend/app/telephony/base_provider.py` — abstract base class
- Create `backend/app/telephony/asterisk_provider.py` — wraps FastAGI
- Create `backend/app/telephony/android_gateway_provider.py` — Android stub
- Create `backend/app/telephony/twilio_provider.py` — future Twilio stub
- Add `TELEPHONY_PROVIDER` env var to config

### Phase 6 — Android SIM Gateway
- Create `backend/app/routes/android_gateway.py`
  - `POST /api/android/call-start`
  - `POST /api/android/call-end`
  - `WS  /ws/android/{call_id}`

### Phase 7 — Unified Conversation Pipeline
- Create `backend/app/services/conversation_pipeline.py`
- Transport-agnostic: VAD → Whisper → LLM → XTTS → audio bytes
- Used by both browser WebSocket and Android gateway

### Phase 8 — Silero VAD
- Create `backend/app/services/vad_service.py`
- Toggle via `USE_SILERO_VAD=true` in `.env`
- Falls back to WebRTC VAD if Silero unavailable

### Phase 9 — Database (No Change Needed)
- SQLite already has `calls`, `conversations`, `voice_profiles` tables

### Phase 10 — Dashboard Updates
- Add Gemini/LLM provider status to `ModelStatus` type
- Update status endpoint to reflect active provider
- Add provider status cards to dashboard

### Phase 11 — Environment Variables
- Create `backend/.env.example` with all new variables

### Phase 12 — Docker
- Add `GEMINI_API_KEY` env var to docker-compose backend service

### Phase 13 — Documentation
- Update README.md with Gemini setup + Android gateway instructions

---

## 6. Breaking Changes

| Change | Impact | Mitigation |
|---|---|---|
| `llm_service.py` now a real factory | `ws_routes.py`, `fastagi_server.py` must use `get_llm_client()` | Updated in this migration |
| `AudioPipeline` accepts `LLMClient` union type | No external breakage | Type annotation update only |
| New Android gateway routes | Additive — no breakage | New routes only |
| New env vars | Old deployments ignore unknown vars | Defaults provided for all |
