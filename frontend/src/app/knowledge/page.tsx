"use client";

import { useState } from "react";

type DocType = "pdf" | "docx" | "faq" | "txt" | "url";
type DocStatus = "indexed" | "processing" | "failed";

interface KnowledgeDoc {
  id: string;
  title: string;
  type: DocType;
  status: DocStatus;
  sizeKB: number;
  chunkCount: number;
  uploadedAt: string;
  agentNames: string[];
  description: string;
}

const d = (daysAgo: number) => {
  const dt = new Date(Date.now() - daysAgo * 86400000);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const SEED_DOCS: KnowledgeDoc[] = [
  {
    id: "k1",
    title: "Product Documentation v2.4",
    type: "pdf",
    status: "indexed",
    sizeKB: 2847,
    chunkCount: 142,
    uploadedAt: d(15),
    agentNames: ["Priya — Customer Support", "Kavya — Tech Support"],
    description: "Complete product guide covering features, pricing, and technical specifications.",
  },
  {
    id: "k2",
    title: "Sales Playbook Q2 2026",
    type: "docx",
    status: "indexed",
    sizeKB: 1024,
    chunkCount: 67,
    uploadedAt: d(10),
    agentNames: ["Rohan — Sales Qualifier"],
    description: "Quarterly sales strategies, objection handling, and conversion scripts.",
  },
  {
    id: "k3",
    title: "FAQ — Billing & Accounts",
    type: "faq",
    status: "indexed",
    sizeKB: 312,
    chunkCount: 45,
    uploadedAt: d(7),
    agentNames: ["Priya — Customer Support"],
    description: "Common billing queries, payment methods (UPI, Netbanking, Cards), and account management.",
  },
  {
    id: "k4",
    title: "Hindi Phrases & Greetings",
    type: "txt",
    status: "indexed",
    sizeKB: 89,
    chunkCount: 28,
    uploadedAt: d(5),
    agentNames: ["Priya — Customer Support", "Rohan — Sales Qualifier"],
    description: "Standard Hindi and Hinglish phrases for professional customer interactions.",
  },
  {
    id: "k5",
    title: "API Integration Guide",
    type: "pdf",
    status: "processing",
    sizeKB: 768,
    chunkCount: 0,
    uploadedAt: d(1),
    agentNames: ["Kavya — Tech Support"],
    description: "REST API documentation for enterprise integration with the platform.",
  },
  {
    id: "k6",
    title: "Refund Policy — India",
    type: "url",
    status: "indexed",
    sizeKB: 45,
    chunkCount: 12,
    uploadedAt: d(3),
    agentNames: ["Priya — Customer Support"],
    description: "Refund and cancellation policies as per Indian consumer protection laws.",
  },
];

const TYPE_CFG: Record<DocType, { label: string; color: string; bg: string }> = {
  pdf:   { label: "PDF",  color: "text-red-600",   bg: "bg-red-50 border-red-100" },
  docx:  { label: "DOCX", color: "text-blue-600",  bg: "bg-blue-50 border-blue-100" },
  faq:   { label: "FAQ",  color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
  txt:   { label: "TXT",  color: "text-gray-600",  bg: "bg-gray-50 border-gray-200" },
  url:   { label: "URL",  color: "text-green-600", bg: "bg-green-50 border-green-100" },
};

const STATUS_CFG: Record<DocStatus, { label: string; bg: string; text: string }> = {
  indexed:    { label: "Indexed",    bg: "bg-green-100",  text: "text-green-700" },
  processing: { label: "Processing", bg: "bg-amber-100",  text: "text-amber-700" },
  failed:     { label: "Failed",     bg: "bg-red-100",    text: "text-red-700" },
};

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(SEED_DOCS);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | DocType>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected] = useState<KnowledgeDoc | null>(null);

  const filtered = docs.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || d.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalChunks = docs.filter(d => d.status === "indexed").reduce((s, d) => s + d.chunkCount, 0);
  const totalSizeMB = (docs.reduce((s, d) => s + d.sizeKB, 0) / 1024).toFixed(1);

  return (
    <div className="min-h-full bg-[#f5f5f5] px-6 py-8 anim-fade-up">

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-400 mt-1">
            Upload documents, FAQs, and URLs to power your AI agents
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="btn-primary-grad text-white text-sm px-5 py-2.5 rounded-xl font-semibold"
        >
          + Upload Document
        </button>
      </div>

      {/* ── Stats strip ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Documents", value: docs.length.toString() },
          { label: "Indexed",         value: docs.filter(d => d.status === "indexed").length.toString() },
          { label: "Total Chunks",    value: totalChunks.toLocaleString("en-IN") },
          { label: "Total Size",      value: `${totalSizeMB} MB` },
        ].map(({ label, value }) => (
          <div key={label} className="surface-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Search & Filters ─────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-xs">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge base..."
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none flex-1"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "pdf", "docx", "faq", "txt", "url"] as ("all" | DocType)[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-xs px-3.5 py-2 rounded-xl font-medium transition-all uppercase ${
                typeFilter === t
                  ? "bg-[#E40443] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-[#E40443]/30 hover:text-[#E40443]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Documents Grid ───────────────────────── */}
      {filtered.length === 0 ? (
        <div className="surface-card rounded-2xl p-16 text-center">
          <p className="text-gray-400 font-medium">No documents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((doc) => {
            const tc = TYPE_CFG[doc.type];
            const sc = STATUS_CFG[doc.status];
            return (
              <div
                key={doc.id}
                className="knowledge-card p-5 cursor-pointer"
                onClick={() => setSelected(doc)}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 ${tc.bg} ${tc.color}`}>
                    {tc.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{doc.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{doc.uploadedAt}</p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium shrink-0 ${sc.bg} ${sc.text}`}>
                    {sc.label}
                  </span>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{doc.description}</p>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{(doc.sizeKB / 1024).toFixed(1)} MB</span>
                  <span className="text-gray-200">•</span>
                  <span>{doc.chunkCount > 0 ? `${doc.chunkCount} chunks` : "Processing..."}</span>
                </div>

                {doc.agentNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {doc.agentNames.map((name) => (
                      <span key={name} className="text-[11px] bg-[#E40443]/08 border border-[#E40443]/15 text-[#E40443] px-2 py-0.5 rounded-full">
                        {name.split(" — ")[0]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Document Detail Modal ────────────────── */}
      {selected && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="surface-deeper rounded-2xl max-w-md w-full p-6 anim-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-sm font-bold ${TYPE_CFG[selected.type].bg} ${TYPE_CFG[selected.type].color}`}>
                  {TYPE_CFG[selected.type].label}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">{selected.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Uploaded {selected.uploadedAt}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn-close-sm w-8 h-8 rounded-lg flex items-center justify-center text-gray-400">
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{selected.description}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "File Size", value: `${(selected.sizeKB / 1024).toFixed(1)} MB` },
                { label: "Chunks",    value: selected.chunkCount > 0 ? selected.chunkCount.toString() : "Processing" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-base font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assigned to Agents</p>
              <div className="flex flex-wrap gap-2">
                {selected.agentNames.map((name) => (
                  <span key={name} className="text-xs bg-[#E40443]/10 border border-[#E40443]/20 text-[#E40443] px-3 py-1 rounded-full font-medium">
                    {name.split(" — ")[0]}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setSelected(null)} className="btn-ghost flex-1 py-2.5 rounded-xl text-sm font-semibold">
                Close
              </button>
              <button className="btn-danger-soft flex-1 py-2.5 rounded-xl text-sm font-semibold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Modal ─────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="surface-deeper rounded-2xl max-w-md w-full p-6 anim-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Upload Document</h3>
            <p className="text-sm text-gray-400 mb-5">Add documents to power your AI agents</p>
            <div
              className="drop-zone rounded-xl p-10 text-center cursor-pointer mb-4"
              onClick={() => {}}
            >
              <div className="w-12 h-12 icon-primary-soft rounded-xl mx-auto mb-3 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E40443" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700">Drop files here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT up to 50 MB</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Document Title</label>
                <input type="text" placeholder="e.g. FAQ — Customer Support Hindi" className="w-full input-dark rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Assign to Agents</label>
                <input type="text" placeholder="Select agents..." className="w-full input-dark rounded-xl px-3 py-2.5 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowUpload(false)} className="btn-ghost flex-1 py-2.5 rounded-xl text-sm font-semibold">
                Cancel
              </button>
              <button className="btn-primary-grad text-white flex-1 py-2.5 rounded-xl text-sm font-semibold">
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
