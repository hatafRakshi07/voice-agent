/**
 * audio-processor.js
 * ──────────────────
 * AudioWorklet processor that downsamples browser mic audio to 16 kHz
 * and batches it into chunks for WebSocket transmission.
 *
 * Registered as: "voice-recorder-processor"
 *
 * Messages sent to main thread:
 *   { type: "audio", data: Float32Array, sampleRate: 16000 }
 */

class VoiceRecorderProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // Target sample rate for Whisper
    this._targetRate = 16000;
    // Accumulation buffer before downsampling
    this._buffer = [];
    // Send a chunk every ~200ms worth of samples (at 16 kHz = 3200 samples)
    this._chunkSamples = 3200;
    this._isRunning = true;

    this.port.onmessage = (e) => {
      if (e.data.type === "stop") {
        this._isRunning = false;
      }
    };
  }

  /**
   * Linearly interpolate / downsample a Float32Array from srcRate to dstRate.
   */
  _resample(input, srcRate, dstRate) {
    if (srcRate === dstRate) return input;
    const ratio = srcRate / dstRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const srcIdx = i * ratio;
      const lo = Math.floor(srcIdx);
      const hi = Math.min(lo + 1, input.length - 1);
      const t = srcIdx - lo;
      output[i] = input[lo] * (1 - t) + input[hi] * t;
    }
    return output;
  }

  process(inputs) {
    if (!this._isRunning) return false;

    const input = inputs[0];
    if (!input || !input[0]) return true;

    // Use first channel only (mono)
    const channelData = input[0];

    // Downsample to target rate
    const downsampled = this._resample(channelData, sampleRate, this._targetRate);

    // Accumulate
    for (let i = 0; i < downsampled.length; i++) {
      this._buffer.push(downsampled[i]);
    }

    // Emit chunk when enough data accumulated
    while (this._buffer.length >= this._chunkSamples) {
      const chunk = new Float32Array(this._buffer.splice(0, this._chunkSamples));
      this.port.postMessage({ type: "audio", data: chunk });
    }

    return true;
  }
}

registerProcessor("voice-recorder-processor", VoiceRecorderProcessor);
