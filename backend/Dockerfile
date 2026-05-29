FROM python:3.11-slim

WORKDIR /app

# System dependencies:
#   - gcc/g++: compile C extensions (webrtcvad, soundfile)
#   - ffmpeg: decode WebM/MP3/OGG audio for XTTS
#   - libsndfile1: soundfile backend
#   - git: some TTS deps clone from git
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    ffmpeg \
    libsndfile1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .

# Install PyTorch CPU-only first (smaller image, ~800 MB vs ~3 GB with CUDA)
# Remove this line and let requirements.txt pick the default if you have a GPU
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p logs voices

EXPOSE 8000

# Use 1 worker — ML models are not fork-safe
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
