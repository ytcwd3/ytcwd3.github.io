import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '游戏数据库',
  description: '游戏资源数据库',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
