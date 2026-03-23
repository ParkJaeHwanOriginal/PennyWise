import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pennywise",
  description: "현명한 자산 관리 서비스",
  manifest: "/manifest.json", // 브라우저가 이 경로에서 신분증을 찾게 함
  icons: {
    icon: "/pennywise_192.jpg",
    apple: "/pennywise_512.jpg", 
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // 사용자가 손가락으로 벌려 확대하는 걸 막아야 앱처럼 동작합니다.
  viewportFit: "cover", // 아이폰 상단 노치 영역까지 화면을 꽉 채우게 합니다.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
