"""
fastagi_server.py
─────────────────
Asterisk FastAGI server — receives calls from Asterisk over TCP,
drives the full STT → LLM → TTS pipeline, and plays audio back to the caller.

FastAGI protocol:
  1. Asterisk opens a TCP connection to us on FASTAGI_PORT (default 4573).
  2. Asterisk sends AGI environment variables (one per line, blank line to end).
  3. We send AGI commands; Asterisk replies with "200 result=N" lines.

Call flow:
  Answer → greet → loop(Record → STT → LLM → TTS → Play) → Hangup
"""

import asyncio
import io
import os
import re
import time
import uuid
import wave
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np

from app.config import settings
from app.database.sqlite import get_db
from app.database.repositories.call_repository import CallRepository
from app.database.repositories.conversation_repository import ConversationRepository
from app.llm.ollama_client import get_ollama_client
from app.memory.conversation_store import ConversationSession
from app.models.call import Call, CallStatus
from app.models.conversation import ConversationTurn
from app.stt.whisper_engine import get_whisper_engine
from app.tts.xtts_engine import get_xtts_engine
from app.utils.logger import logger

# Recordings are written to this directory (shared with Asterisk via volume)
RECORDINGS_DIR = Path(settings.RECORDINGS_DIR)

# AGI record format: WAV signed-linear 16-bit 8 kHz (Asterisk native)
RECORD_FORMAT = "wav"
RECORD_SAMPLE_RATE = 8000

# Maximum silence before Asterisk stops recording (seconds)
RECORD_SILENCE = "3"
# Absolute timeout per utterance (ms, 0 = unlimited)
RECORD_TIMEOUT = "10000"


# ── AGI connection handler ─────────────────────────────────────────────────────

class FastAGIHandler(asyncio.Protocol):
    """One instance per incoming Asterisk call."""

    def __init__(self):
        self.transport: Optional[asyncio.Transport] = None
        self._buf = b""
        self.env: dict[str, str] = {}
        self._env_done = asyncio.Event()
        self._response_queue: asyncio.Queue = asyncio.Queue()
        self._task: Optional[asyncio.Task] = None

    # ── asyncio.Protocol callbacks ─────────────────────────────────────────────

    def connection_made(self, transport: asyncio.Transport) -> None:
        self.transport = transport
        peer = transport.get_extra_info("peername")
        logger.info(f"[AGI] New connection from {peer}")
        self._task = asyncio.create_task(self._run())

    def data_received(self, data: bytes) -> None:
        self._buf += data
        while b"\n" in self._buf:
            line, self._buf = self._buf.split(b"\n", 1)
            text = line.decode("utf-8", errors="replace").rstrip("\r")
            self._handle_line(text)

    def connection_lost(self, exc: Optional[Exception]) -> None:
        logger.info("[AGI] Connection closed")
        if self._task and not self._task.done():
            self._task.cancel()

    # ── Line processing ────────────────────────────────────────────────────────

    def _handle_line(self, line: str) -> None:
        if not self._env_done.is_set():
            if line == "":
                self._env_done.set()
            elif ": " in line:
                k, v = line.split(": ", 1)
                self.env[k.strip()] = v.strip()
        else:
            # Response from a previous AGI command
            asyncio.get_event_loop().create_task(
                self._response_queue.put(line)
            )

    # ── Command helpers ────────────────────────────────────────────────────────

    def _send(self, cmd: str) -> None:
        if self.transport and not self.transport.is_closing():
            self.transport.write((cmd + "\n").encode())

    async def _cmd(self, cmd: str) -> str:
        """Send an AGI command and await its response."""
        self._send(cmd)
        try:
            return await asyncio.wait_for(self._response_queue.get(), timeout=30)
        except asyncio.TimeoutError:
            logger.warning(f"[AGI] Timeout waiting for response to: {cmd}")
            return "200 result=-1"

    async def _answer(self) -> None:
        await self._cmd("ANSWER")

    async def _hangup(self) -> None:
        await self._cmd("HANGUP")

    async def _play(self, wav_path: str) -> None:
        """Play a WAV file. wav_path must be without extension for Asterisk."""
        path_no_ext = wav_path.removesuffix(".wav").removesuffix(".ulaw")
        resp = await self._cmd(f"STREAM FILE {path_no_ext} ''")
        logger.debug(f"[AGI] STREAM FILE → {resp}")

    async def _record(self, filepath: str) -> bool:
        """
        Record caller speech to `filepath` (without extension).
        Returns True if something was recorded.
        """
        resp = await self._cmd(
            f"RECORD FILE {filepath} {RECORD_FORMAT} '' "
            f"{RECORD_TIMEOUT} 0 s={RECORD_SILENCE}"
        )
        logger.debug(f"[AGI] RECORD FILE → {resp}")
        # result=0 = success, result=-1 = error/hangup
        m = re.search(r"result=(-?\d+)", resp)
        return m is not None and m.group(1) != "-1"

    # ── Main conversation loop ─────────────────────────────────────────────────

    async def _run(self) -> None:
        await self._env_done.wait()

        call_id   = self.env.get("agi_uniqueid", uuid.uuid4().hex[:12])
        caller    = self.env.get("agi_callerid", "unknown").split("<")[-1].rstrip(">")
        called    = self.env.get("agi_extension", "unknown")
        start_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        start_ts  = time.time()

        # Create recordings directory for this call
        rec_dir = RECORDINGS_DIR / call_id
        rec_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"[AGI] Call {call_id} from {caller}")

        # Persist call record
        try:
            db   = await get_db()
            repo = CallRepository(db)
            conv_repo = ConversationRepository(db)
            await repo.create(
                Call(
                    call_id=call_id,
                    phone_number=caller,
                    direction="inbound",
                    status=CallStatus.IN_PROGRESS,
                    start_time=start_iso,
                    voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None,
                )
            )
        except RuntimeError:
            repo = None  # type: ignore[assignment]
            conv_repo = None  # type: ignore[assignment]

        # Get ML singletons (already loaded at startup)
        whisper = get_whisper_engine()
        ollama  = get_ollama_client(host=settings.OLLAMA_HOST, model=settings.OLLAMA_MODEL)
        xtts    = get_xtts_engine()

        # Per-call conversation memory
        session = ConversationSession(
            session_id=call_id,
            system_prompt=settings.AGENT_SYSTEM_PROMPT,
            voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None,
            language=settings.TTS_LANGUAGE,
        )

        await self._answer()

        # Synthesise and play greeting
        try:
            greeting = f"Hello! I'm {settings.AGENT_NAME}, your AI voice assistant. How can I help you today?"
            greeting_wav = str(rec_dir / "greeting")
            await self._synthesize_to_file(xtts, greeting, greeting_wav)
            await self._play(greeting_wav)
        except Exception as exc:
            logger.error(f"[AGI] Greeting failed: {exc}")

        # ── Conversation loop ──────────────────────────────────────────────────
        turn = 0
        recording_path: Optional[str] = None

        while turn < settings.MAX_CONVERSATION_TURNS:
            # 1. Record utterance
            utt_base = str(rec_dir / f"utt_{turn:03d}")
            recorded = await self._record(utt_base)
            if not recorded:
                break  # Hangup or error

            utt_wav = utt_base + ".wav"
            if not Path(utt_wav).exists():
                break

            # Track first recording as call recording
            if recording_path is None:
                recording_path = str(rec_dir / "utt_000.wav")

            # 2. STT
            try:
                audio_f32 = _load_wav_as_float32(utt_wav)
                result    = await whisper.transcribe(audio_f32)
                text      = result["text"].strip()
            except Exception as exc:
                logger.error(f"[AGI] STT error: {exc}")
                continue

            if not text:
                continue

            logger.info(f"[AGI] [{call_id}] User: {text}")
            session.add_user(text)

            if repo and conv_repo:
                await conv_repo.add_turn(
                    ConversationTurn(
                        call_id=call_id,
                        role="user",
                        content=text,
                        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    )
                )
                await repo.increment_turn_count(call_id)

            # 3. LLM
            try:
                t0 = time.time()
                response = await ollama.get_response(
                    messages=session.get_messages(),
                    system_prompt=session.system_prompt,
                    temperature=settings.OLLAMA_TEMPERATURE,
                    max_tokens=settings.OLLAMA_MAX_TOKENS,
                )
                latency = int((time.time() - t0) * 1000)
            except Exception as exc:
                logger.error(f"[AGI] LLM error: {exc}")
                response = "I'm sorry, I couldn't generate a response right now."
                latency = 0

            logger.info(f"[AGI] [{call_id}] Agent: {response[:80]}…")
            session.add_assistant(response)

            if repo and conv_repo:
                await conv_repo.add_turn(
                    ConversationTurn(
                        call_id=call_id,
                        role="assistant",
                        content=response,
                        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                        latency_ms=latency,
                    )
                )

            # 4. TTS → play
            try:
                resp_base = str(rec_dir / f"resp_{turn:03d}")
                await self._synthesize_to_file(xtts, response, resp_base)
                await self._play(resp_base)
            except Exception as exc:
                logger.error(f"[AGI] TTS/play error: {exc}")

            turn += 1

        # ── End of call ────────────────────────────────────────────────────────
        end_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        duration = int(time.time() - start_ts)

        if repo:
            # Generate summary
            summary: Optional[str] = None
            try:
                msgs = session.get_messages()
                if msgs:
                    summary = await ollama.generate_summary(msgs)
            except Exception:
                pass

            await repo.complete_call(
                call_id=call_id,
                end_time=end_iso,
                duration_seconds=duration,
                recording_path=str(recording_path) if recording_path else None,
                summary=summary,
            )

        await self._hangup()
        logger.info(f"[AGI] Call {call_id} ended — {duration}s, {turn} turns")

    # ── TTS helper ─────────────────────────────────────────────────────────────

    async def _synthesize_to_file(
        self, xtts, text: str, base_path: str
    ) -> None:
        """Synthesise text to a WAV at `base_path`.wav (8 kHz for Asterisk)."""
        if not xtts.is_loaded:
            raise RuntimeError("XTTS not loaded")

        wav_bytes = await xtts.synthesize(
            text=text,
            voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None,
            language=settings.TTS_LANGUAGE,
        )
        # XTTS outputs 24 kHz; downsample to 8 kHz for Asterisk
        wav_8k = _resample_wav_to_8k(wav_bytes)
        out_path = base_path + ".wav"
        Path(out_path).write_bytes(wav_8k)


# ── Audio helpers ──────────────────────────────────────────────────────────────

def _load_wav_as_float32(path: str) -> np.ndarray:
    """Read a WAV file and return a float32 array at 16 kHz (Whisper format)."""
    import soundfile as sf  # noqa: PLC0415
    from scipy.signal import resample_poly  # noqa: PLC0415
    from math import gcd  # noqa: PLC0415

    audio, sr = sf.read(path, always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    audio = audio.astype(np.float32)

    if sr != 16000:
        g = gcd(sr, 16000)
        audio = resample_poly(audio, 16000 // g, sr // g).astype(np.float32)

    return audio


def _resample_wav_to_8k(wav_bytes: bytes) -> bytes:
    """Resample a WAV (any rate) to 8 kHz PCM16 for Asterisk playback."""
    import soundfile as sf  # noqa: PLC0415
    from scipy.signal import resample_poly  # noqa: PLC0415
    from math import gcd  # noqa: PLC0415

    audio, sr = sf.read(io.BytesIO(wav_bytes), always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    audio = audio.astype(np.float32)

    if sr != 8000:
        g = gcd(sr, 8000)
        audio = resample_poly(audio, 8000 // g, sr // g).astype(np.float32)

    # Normalise
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio = audio / peak * 0.95

    pcm16 = (audio * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(8000)
        wf.writeframes(pcm16.tobytes())
    return buf.getvalue()


# ── Server lifecycle ───────────────────────────────────────────────────────────

_server: Optional[asyncio.Server] = None


async def start_fastagi_server() -> None:
    """Start the FastAGI TCP server and keep it running."""
    global _server
    host = settings.FASTAGI_HOST
    port = settings.FASTAGI_PORT

    loop = asyncio.get_event_loop()
    _server = await loop.create_server(
        FastAGIHandler,
        host=host,
        port=port,
    )
    logger.info(f"[AGI] FastAGI server listening on {host}:{port}")
    async with _server:
        await _server.serve_forever()


async def stop_fastagi_server() -> None:
    global _server
    if _server:
        _server.close()
        await _server.wait_closed()
        logger.info("[AGI] FastAGI server stopped")
