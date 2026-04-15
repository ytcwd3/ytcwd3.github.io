import "./globals.css";
import type { Metadata, Viewport } from "next";
import AuthGuard from "./components/AuthGuard";

export const metadata: Metadata = {
  title: "单游仓鼠搜索站",
  description: "单游仓鼠搜索站",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#d857e8",
};

// 老浏览器兼容 polyfill - globalThis 兜底
const polyfillScript =
  "if(typeof globalThis==='undefined'){" +
  "Object.defineProperty(Object.prototype,'__mg__',{get:function(){return this},configurable:true});" +
  "__mg__.globalThis=__mg__;" +
  "delete Object.prototype.__mg__;" +
  "}";

// 禁用F12和右键
const disableDevToolsScript =
  "document.addEventListener('contextmenu',e=>e.preventDefault());" +
  "document.addEventListener('keydown',e=>{if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&['I','J','C'].includes(e.key)))e.preventDefault();});";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{ __html: polyfillScript }} />
        <script dangerouslySetInnerHTML={{ __html: disableDevToolsScript }} />
      </head>
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
