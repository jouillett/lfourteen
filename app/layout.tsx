import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "엘포틴 코디",
  description: "엘포틴 유산균과 발효동충하초의 밸런스 - 엘포틴 코디",
  icons: {
    icon: [
      { url: "https://capofcom.cafe24.com/l14_coordy/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "https://capofcom.cafe24.com/l14_coordy/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "https://capofcom.cafe24.com/l14_coordy/images/favicon-76x76.png", sizes: "76x76", type: "image/png" },
    ],
    apple: [
      { url: "https://capofcom.cafe24.com/l14_coordy/images/favicon-76x76.png", sizes: "76x76", type: "image/png" },
    ],
  },
};

import DisableCopy from "@/components/DisableCopy";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col bg-surface text-on-surface font-body-md overflow-x-hidden">
        <DisableCopy />
        {children}
      </body>
    </html>
  );
}
