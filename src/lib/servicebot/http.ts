import { NextResponse } from "next/server";

export function jsonOk(data: unknown) {
  return NextResponse.json(data);
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function getSearchParam(url: string, key: string): string | null {
  const u = new URL(url);
  return u.searchParams.get(key);
}
