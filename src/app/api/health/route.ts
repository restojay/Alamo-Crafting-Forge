import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Health check endpoint for ServiceBot.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    servicebot: {
      version: "0.2.0",
      phase: 2,
    },
  });
}
