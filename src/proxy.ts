import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limit map: IP -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 20; // max requests per window per IP

// Known bots to allow without rate limiting
const ALLOWED_BOTS = [
  "googlebot",
  "bingbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "telegrambot",
  "applebot",
];

function isAllowedBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return ALLOWED_BOTS.some((bot) => ua.includes(bot));
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip rate limiting for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  // Allow known bots without rate limiting
  const userAgent = request.headers.get("user-agent") || "";
  if (isAllowedBot(userAgent)) {
    return NextResponse.next();
  }

  const ip = getClientIP(request);
  const now = Date.now();

  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetAt + WINDOW_MS * 2) {
        rateLimitMap.delete(key);
      }
    }
  }

  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (record.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    const html = `<!DOCTYPE html><html><head><title>请求过于频繁</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5"><div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1)"><h1 style="color:#dc2626;margin:0 0 16px">🚫 请求过于频繁</h1><p style="color:#666;font-size:15px;margin:0">您的访问频率过高，请稍后再试。</p><p style="color:#999;font-size:13px;margin:16px 0 0">Please wait a moment before trying again.</p></div></body></html>`;
    return new NextResponse(html, {
      status: 429,
      statusText: "Too Many Requests",
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": String(retryAfter),
      },
    });
  }

  record.count++;
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
};