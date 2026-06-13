import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#681984",
};

export const metadata: Metadata = {
  title: "MiHome Wallet | InversionesPro",
  description: "Tu billetera digital para inversiones inmobiliarias",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Billetera",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark antialiased">
      <body className={`${inter.variable} font-sans min-h-full flex flex-col bg-slate-950 text-slate-50`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
