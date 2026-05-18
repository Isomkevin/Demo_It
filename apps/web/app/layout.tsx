import type { Metadata } from "next";
import "./globals.css";
import { OrgInitializer } from "@/components/billing/OrgInitializer";

export const metadata: Metadata = {
  title: "Demo It — Cinematic product demos from any URL",
  description:
    "Generate polished demo videos with AI scripting, browser capture, and ElevenLabs narration. Benchmarked against Google Pomelli for video-first storytelling.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <OrgInitializer />
        {children}
      </body>
    </html>
  );
}
