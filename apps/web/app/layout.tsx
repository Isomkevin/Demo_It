import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Demo It",
  description: "Generate cinematic product demos from any URL.",
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
      <body className="min-h-screen bg-[#05040a] font-sans text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
