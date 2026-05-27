"use client";

import { useState, useRef } from "react";
import { cloneVoice } from "@/lib/api";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function VoiceUploader({ onSuccess, onCancel }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Voice name is required.");
    if (files.length === 0) return setError("Upload at least one audio sample.");
    setLoading(true);
    try {
      await cloneVoice(name.trim(), description.trim(), files);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Clone failed");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all duration-150 focus:ring-2 focus:ring-indigo-500/50";

  return (
    <div className="surface-uploader rounded-2xl p-6 anim-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="icon-indigo-soft w-9 h-9 rounded-xl flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Clone a Voice</h3>
            <p className="text-xs text-slate-500">Upload audio samples to create a custom voice</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="btn-close-sm w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors"
          title="Cancel"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Voice Name <span className="text-indigo-400">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`input-dark ${inputCls}`}
            placeholder="e.g. Sarah Sales Agent"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`input-dark ${inputCls}`}
            placeholder="Optional description"
          />
        </div>

        {/* Drop zone */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Audio Samples <span className="text-indigo-400">*</span>
            <span className="ml-1 normal-case font-normal text-slate-600">(wav / mp3, 1–25 files)</span>
          </label>
          <div
            onClick={() => inputRef.current?.click()}
            className={`drop-zone rounded-xl p-6 text-center cursor-pointer transition-all duration-200${files.length > 0 ? " has-files" : ""}`}
            onMouseLeave={(e) => {
              if (files.length === 0)
                (e.currentTarget as HTMLDivElement).style.borderColor = "";
            }}
          >
            {files.length === 0 ? (
              <div>
                <div
                  className="icon-indigo-xs w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p className="text-slate-400 text-sm font-medium">Click to upload audio files</p>
                <p className="text-slate-600 text-xs mt-1">or drag and drop</p>
              </div>
            ) : (
              <ul className="text-left space-y-1.5">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-slate-600 text-xs ml-auto">
                      {(f.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={handleFiles}
              title="Upload audio samples for voice cloning"
              aria-label="Upload audio samples for voice cloning"
            />
          </div>
        </div>

        {error && (
          <div className="error-strip flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="btn-cancel-soft px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary-grad px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50"
          >
            {loading ? "Cloning…" : "Clone Voice"}
          </button>
        </div>
      </form>
    </div>
  );
}
