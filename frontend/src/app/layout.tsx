import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "AI Voice Call Agent",
  description: "Real-time AI voice call agent dashboard",
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
      <body className="flex h-full overflow-hidden bg-scene text-slate-200 font-sans">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-scene">{children}</main>
      </body>
    </html>
  );
}

