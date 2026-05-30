// Anti-scraping utilities for API protection

const ALLOWED_ORIGINS = [
  "https://ytcwd3.github.io",
  "https://www.ytcwd3.com",
  "http://localhost:3000",
  "http://192.168.3.41:3000",
  "http://192.168.3.41:3001",
];

// Rate limiter using in-memory store (for Vercel serverless, use KV/Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 200; // per IP per minute

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateRequest(request: Request): ValidationResult {
  // 1. Validate Origin (allow if no origin header or from allowed origins)
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Skip origin check if origin is null (same-origin requests) or from allowed origins
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    // Check if referer is from allowed origins
    if (!referer || (!referer.includes("ytcwd3.github.io") && !referer.includes("localhost"))) {
      // Don't block - just log for monitoring
      console.warn("Origin check warning:", origin, referer);
    }
  }

  // 2. Validate User-Agent (must contain browser keywords, but don't block headless entirely)
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";
  if (!userAgent || userAgent.length < 10) {
    return { valid: false, error: "Invalid user agent" };
  }

  return { valid: true };
}

export function checkRateLimit(ip: string): ValidationResult {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { valid: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { valid: false, error: "Rate limit exceeded" };
  }

  record.count++;
  return { valid: true };
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || realIP || "unknown";
}