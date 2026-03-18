import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const ADMIN_COOKIE = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// In-memory rate limiter: 5 attempts per 15 minutes per IP
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false; // blocked
  }

  record.count += 1;
  return true; // allowed
}

export function createSessionToken(secret: string): string {
  const payload = `admin:${Date.now()}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  // Check expiry (7 days in ms)
  const timestamp = parseInt(payload.split(":")[1]);
  if (isNaN(timestamp) || Date.now() - timestamp > COOKIE_MAX_AGE * 1000) return false;
  return signature === expected;
}

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET not configured" },
      { status: 500 },
    );
  }

  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const { password } = await request.json();

  if (password !== secret) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const sessionToken = createSessionToken(secret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
