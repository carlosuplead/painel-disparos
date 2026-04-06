import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Disparos API OFC",
  description: "Painel de disparos WhatsApp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        {/* Prevent flash: read stored theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t === 'light') document.documentElement.classList.remove('dark');
            else document.documentElement.classList.add('dark');
          } catch(e){}
        ` }} />
      </head>
      <body
        className="min-h-screen antialiased"
        style={{ background: 'var(--bg)', color: 'var(--text)' }}
      >
        {children}
      </body>
    </html>
  );
}
