import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Demo Copilot",
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
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
