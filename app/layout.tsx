import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Nuggets — Repositório de insights de produto",
  description: "Centralize insights, oportunidades e problemas de pesquisa de produto.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
