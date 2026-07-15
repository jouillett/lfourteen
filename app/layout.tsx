import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lfourteen-lfourteen.mycafe24.ai"),
  title: "엘포틴 코디",
  description: "특허 종균 엘포틴 유산균과 차세대 원료 발효 동충하초를 균형있게 담은 프리미엄 듀얼 포뮬러. 서울대학교 바이오 연구진의 독자적 유산균 발효 기술과 20년 이상의 동충하초 연구ㆍ개발ㆍ가공 기술이 만나 완성된 프리미엄 건강 솔루션",
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
  openGraph: {
    title: "엘포틴 코디와 함께라면 늘 즐겁고 기쁜 하루",
    description: "특허 종균 엘포틴 유산균과 차세대 원료 발효 동충하초를 균형있게 담은 프리미엄 듀얼 포뮬러. 서울대학교 바이오 연구진의 독자적 유산균 발효 기술과 20년 이상의 동충하초 연구ㆍ개발ㆍ가공 기술이 만나 완성된 프리미엄 건강 솔루션",
    url: "https://lfourteen-lfourteen.mycafe24.ai/",
    siteName: "엘포틴 코디",
    locale: "ko_KR",
    type: "website",
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
