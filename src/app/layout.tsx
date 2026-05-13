import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HotAgent",
  description: "AI 行业热点运营 Agent 工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
