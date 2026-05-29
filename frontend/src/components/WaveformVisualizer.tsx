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

    phaseRef.current += 0.04;
    const phase = phaseRef.current;

    if (isActive) {
      // ── AI Speaking: pulsing rings ────────────────────────────────────
      const rings = 4;
      for (let i = 0; i < rings; i++) {
        const t = ((phase * 0.7 + i / rings) % 1);
        const radius = 20 + t * (Math.min(W, H) / 2 - 20);
        const alpha = (1 - t) * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;  // indigo-400
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      // Centre dot
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(129, 140, 248, 0.9)";
      ctx.fill();

    } else if (isListening && audioDataRef.current) {
      // ── Mic active: bar waveform ──────────────────────────────────────
      const data = audioDataRef.current;
      const barCount = 40;
      const barW = W / barCount - 2;
      const step = Math.floor(data.length / barCount);

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += Math.abs(data[i * step + j] || 0);
        }
        const amp = Math.min(sum / step, 1.0);
        const barH = Math.max(3, amp * (H * 0.9));
        const x = i * (barW + 2) + 1;
        const y = cy - barH / 2;

        const grad = ctx.createLinearGradient(x, cy - barH / 2, x, cy + barH / 2);
        grad.addColorStop(0, "rgba(52, 211, 153, 0.9)");  // emerald-400
        grad.addColorStop(1, "rgba(16, 185, 129, 0.5)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 2);
        ctx.fill();
      }

    } else {
      // ── Idle: smooth sine wave ────────────────────────────────────────
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y = cy + Math.sin((x / W) * Math.PI * 4 + phase) * 8;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";  // indigo-500
      ctx.lineWidth = 2;
      ctx.stroke();

      // Idle dot
      const dot = 6 + Math.sin(phase * 2) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, dot, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(99, 102, 241, 0.5)";
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
      width={320}
      height={120}
      className="w-full rounded-xl"
      style={{ background: "transparent" }}
    />
  );
}
