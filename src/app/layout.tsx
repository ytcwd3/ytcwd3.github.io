import "./globals.css";
import type { Metadata, Viewport } from "next";
import AuthGuard from "./components/AuthGuard";
import ImageHoverPreview from "./components/ImageHoverPreview";

export const metadata: Metadata = {
  metadataBase: new URL("https://ytcwd3.github.io"),
  title: "单游仓鼠搜索站",
  description: "单游仓鼠搜索站",
  applicationName: "单游仓鼠搜索站",
  icons: {
    icon: [{ url: "https://cloudflarecnimg.scdn.io/i/6a1c3148be2dc_1780232520.webp", type: "image/png", sizes: "512x512" }],
    shortcut: ["https://cloudflarecnimg.scdn.io/i/6a1c3148be2dc_1780232520.webp"],
    apple: [{ url: "https://cloudflarecnimg.scdn.io/i/6a1c3148be2dc_1780232520.webp", type: "image/png", sizes: "512x512" }],
  },
  openGraph: {
    title: "单游仓鼠搜索站",
    description: "单游仓鼠搜索站",
    images: [{ url: "https://cloudflarecnimg.scdn.io/i/6a1c314ee83c0_1780232526.webp", width: 865, height: 551 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "单游仓鼠搜索站",
    description: "单游仓鼠搜索站",
    images: ["https://cloudflarecnimg.scdn.io/i/6a1c314ee83c0_1780232526.webp"],
  },
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
        <link rel="preconnect" href="https://cloudflarecnimg.scdn.io" crossOrigin="" />
        <link rel="dns-prefetch" href="//cloudflarecnimg.scdn.io" />
        <link
          rel="preload"
          as="image"
          href="https://cloudflarecnimg.scdn.io/i/6a17f00cb1ad8_1779953676.webp"
        />
        <link
          rel="preload"
          as="image"
          href="https://cloudflarecnimg.scdn.io/i/6a1c314ee83c0_1780232526.webp"
        />
        <link rel="preload" as="fetch" href="/api/categories" crossOrigin="anonymous" />
        <link rel="icon" href="https://cloudflarecnimg.scdn.io/i/6a1c3148be2dc_1780232520.webp" type="image/png" sizes="512x512" />
        <link rel="shortcut icon" href="https://cloudflarecnimg.scdn.io/i/6a1c3148be2dc_1780232520.webp" type="image/png" />
        <link rel="apple-touch-icon" href="https://cloudflarecnimg.scdn.io/i/6a1c3148be2dc_1780232520.webp" />
        <script dangerouslySetInnerHTML={{ __html: polyfillScript }} />
        <script dangerouslySetInnerHTML={{ __html: disableDevToolsScript }} />
      </head>
      <body>
        <AuthGuard>{children}</AuthGuard>
        <ImageHoverPreview />
      </body>
    </html>
  );
}
