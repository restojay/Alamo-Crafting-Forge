import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const HEADER = `| Timestamp | Thread | Type | Status | Details |
|-----------|--------|------|--------|---------|
`;

export type LogFn = (thread: string, type: string, status: string, details?: string) => void;

export function createLogger(logFile: string): LogFn {
  let initialized = false;

  return function log(thread: string, type: string, status: string, details?: string): void {
    if (!initialized) {
      const dir = dirname(logFile);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      if (!existsSync(logFile)) {
        appendFileSync(logFile, HEADER);
      }
      initialized = true;
    }

    const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
    const line = `| ${ts} | ${thread} | ${type} | ${status} | ${details || ""} |\n`;
    appendFileSync(logFile, line);
  };
}
