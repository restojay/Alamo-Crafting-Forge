import { NextResponse } from "next/server";

const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function validateContactForm(data: Record<string, unknown>) {
  const errors: string[] = [];
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2)
    errors.push("Name is required (min 2 chars)");
  if (!data.email || typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.push("Valid email is required");
  if (!data.message || typeof data.message !== "string" || data.message.trim().length < 10)
    errors.push("Message is required (min 10 chars)");
  if (data.honeypot) errors.push("Bot detected");
  return errors;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, errors: ["Too many requests. Please try again later."] },
      { status: 429 },
    );
  }

  const origin = request.headers.get("origin");
  if (origin && !origin.includes("alamocraftingforge.com") && !origin.includes("localhost")) {
    return NextResponse.json({ success: false, errors: ["Invalid origin"] }, { status: 403 });
  }

  try {
    const body = await request.json();
    const errors = validateContactForm(body);

    if (errors.length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    const { name, email, message, subject } = body as {
      name: string;
      email: string;
      message: string;
      subject?: string;
    };

    console.log("[Contact Form]", { name, email, subject, message: message.slice(0, 100) });

    return NextResponse.json({ success: true, message: "Message received. We'll be in touch." });
  } catch {
    return NextResponse.json({ success: false, errors: ["Invalid request body"] }, { status: 400 });
  }
}
