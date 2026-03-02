export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

/**
 * Create a structured JSON logger.
 * Uses console with JSON format for now. Replace with pino when added as dependency.
 */
export function createLogger(name: string): Logger {
  const log = (level: string, msg: string, data?: Record<string, unknown>) => {
    const entry = {
      level,
      name,
      msg,
      time: new Date().toISOString(),
      ...data,
    };
    if (level === "error") {
      console.error(JSON.stringify(entry));
    } else if (level === "warn") {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  };

  return {
    info: (msg, data) => log("info", msg, data),
    warn: (msg, data) => log("warn", msg, data),
    error: (msg, data) => log("error", msg, data),
  };
}
