import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomPlayer } from "@/components/layout/BottomPlayer";

export const metadata: Metadata = {
  title: "MelodyMix",
  description: "Hybrid Music Streaming Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex h-screen bg-background overflow-hidden selection:bg-accent selection:text-white">
        <Sidebar />
        <main className="flex-1 relative overflow-y-auto pb-32">
          {children}
        </main>
        <BottomPlayer />
      </body>
    </html>
  );
}
