"use client";

import { useEffect, useRef, useCallback } from "react";

interface Props {
  isActive: boolean;       // true while AI is speaking
  isListening: boolean;    // true while mic is capturing
  audioData?: Float32Array; // optional live mic waveform data
}

/**
 * Canvas-based real-time waveform / animation component.
 *
 * - Idle:      gentle sine pulse
 * - Listening: mic amplitude bars
 * - Speaking:  outward ring animation
 */
export default function WaveformVisualizer({ isActive, isListening, audioData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const phaseRef = useRef(0);
  const audioDataRef = useRef<Float32Array | undefined>(audioData);

  useEffect(() => {
    audioDataRef.current = audioData;
  }, [audioData]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    ctx.clearRect(0, 0, W, H);

    phaseRef.current += 0.03;
    const phase = phaseRef.current;

    if (isActive) {
      // ── AI Speaking: layered pulsing rings ───────────────────────────
      const rings = 5;
      for (let i = 0; i < rings; i++) {
        const t = ((phase * 0.65 + i / rings) % 1);
        const maxR = Math.min(W, H) / 2 - 8;
        const radius = 16 + t * maxR;
        const alpha = (1 - t) * 0.55;
        
        // Outer ring - indigo
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner ring - violet (offset phase)
        const t2 = ((phase * 0.65 + 0.5 + i / rings) % 1);
        const r2 = 10 + t2 * maxR * 0.7;
        const a2 = (1 - t2) * 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, r2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(167, 139, 250, ${a2})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Centre pulsing dot
      const pulse = 10 + Math.sin(phase * 3) * 3;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulse * 1.5);
      grad.addColorStop(0, "rgba(129, 140, 248, 1)");
      grad.addColorStop(0.5, "rgba(99, 102, 241, 0.7)");
      grad.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, pulse * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

    } else if (isListening && audioDataRef.current) {
      // ── Mic active: mirrored bar waveform ────────────────────────────
      const data = audioDataRef.current;
      const barCount = 48;
      const gap = 2;
      const barW = (W - gap * (barCount - 1)) / barCount;
      const step = Math.floor(data.length / barCount);

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += Math.abs(data[i * step + j] || 0);
        }
        const amp = Math.min(sum / step, 1.0);
        const barH = Math.max(4, amp * (H * 0.85));
        const x = i * (barW + gap);

        const grad = ctx.createLinearGradient(x, cy - barH / 2, x, cy + barH / 2);
        grad.addColorStop(0,   "rgba(52, 211, 153, 0.5)");
        grad.addColorStop(0.5, "rgba(52, 211, 153, 1.0)");
        grad.addColorStop(1,   "rgba(52, 211, 153, 0.5)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, cy - barH / 2, barW, barH, 2);
        ctx.fill();
      }

    } else {
      // ── Idle: smooth dual sine wave ───────────────────────────────────
      // Secondary wave
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y = cy + Math.sin((x / W) * Math.PI * 6 + phase * 1.2) * 5;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Primary wave
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y = cy + Math.sin((x / W) * Math.PI * 4 + phase) * 10;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
      lineGrad.addColorStop(0,   "rgba(99, 102, 241, 0.1)");
      lineGrad.addColorStop(0.5, "rgba(99, 102, 241, 0.5)");
      lineGrad.addColorStop(1,   "rgba(99, 102, 241, 0.1)");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Idle glowing dot
      const dotR = 5 + Math.sin(phase * 1.5) * 2;
      const dotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 2);
      dotGrad.addColorStop(0, "rgba(99, 102, 241, 0.8)");
      dotGrad.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, dotR * 2, 0, Math.PI * 2);
      ctx.fillStyle = dotGrad;
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [isActive, isListening]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={100}
      className="w-full"
      style={{ background: "transparent" }}
    />
  );
}
