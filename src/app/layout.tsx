import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MiHome Wallet | InversionesPro",
  description: "Tu billetera digital para inversiones inmobiliarias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark antialiased">
      <body className={`${inter.variable} font-sans min-h-full flex flex-col bg-slate-950 text-slate-50`}>
        {children}
      </body>
    </html>
  );
}
