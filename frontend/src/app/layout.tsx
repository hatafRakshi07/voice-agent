import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "VoiceAgent — AI Calling Platform",
  description: "AI Voice Agent Platform — Whisper STT, Ollama LLM, XTTS-v2 | Indian Business Suite",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="flex h-full overflow-hidden bg-[#f5f5f5] text-gray-900 font-sans">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-scene">{children}</main>
      </body>
    </html>
  );
}

