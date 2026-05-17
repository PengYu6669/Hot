import type { Metadata } from "next";
import "./globals.css";
import { AIAssistant } from "./components/shared/AIAssistant";
import { ToastContainer } from "./components/shared/Toast";

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
      <body className="min-h-full flex flex-col">
        {children}
        <AIAssistant />
        <ToastContainer />
      </body>
    </html>
  );
}
