import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "@/styles/marketing.css";
import "@/styles/auth.css";
import "@/styles/home.css";
import "@/styles/generator.css";
import "@/styles/generator2.css";
import "@/styles/dokumen.css";
import "@/styles/ruang.css";
import "@/styles/billing.css";
import "@/styles/settings.css";
import { AppProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/toast";
import { OfflineBanner } from "@/components/system/offline-banner";
import { SwRegister } from "@/components/system/sw-register";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AjarKit — Buat Modul Ajar, RPS & soal dalam hitungan menit",
    template: "%s — AjarKit",
  },
  description:
    "Asisten AI perangkat ajar untuk guru & dosen Indonesia — sesuai Kurikulum & Profil Pelajar Pancasila terbaru.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2B59E0",
};

const themeInit = `(function(){try{var t=localStorage.getItem('ajarkit-theme');if(!t&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)t='dark';if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${jakarta.variable} ${inter.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <AppProvider>
          <ToastProvider>
            {children}
            <OfflineBanner />
            <SwRegister />
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
