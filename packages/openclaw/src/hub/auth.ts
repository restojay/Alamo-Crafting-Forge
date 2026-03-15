import { randomBytes } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "fs";
import { dirname } from "path";

export function loadOrCreateToken(tokenPath: string): string {
  if (existsSync(tokenPath)) {
    try {
      const data = JSON.parse(readFileSync(tokenPath, "utf-8"));
      if (data.token) return data.token;
    } catch {
      // Regenerate
    }
  }

  const token = randomBytes(32).toString("hex");
  const dir = dirname(tokenPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(tokenPath, JSON.stringify({ token }, null, 2), "utf-8");
  try { chmodSync(tokenPath, 0o600); } catch { /* Windows may not support chmod */ }
  return token;
}

export function validateToken(authHeader: string | undefined, expectedToken: string): boolean {
  if (!authHeader) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return !!match && match[1] === expectedToken;
}
