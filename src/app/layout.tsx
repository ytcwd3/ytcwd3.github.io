import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "单游仓鼠搜索站",
  description: "单游仓鼠搜索站",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
