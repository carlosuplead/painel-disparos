import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel de Disparos",
  description: "Disparos WhatsApp via n8n",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#0d0d0d] text-gray-200 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
