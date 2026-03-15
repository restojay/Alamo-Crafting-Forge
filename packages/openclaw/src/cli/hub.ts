import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHub } from "../hub/server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(process.env.DATA_DIR || resolve(__dirname, "..", "..", "data"), "hub.sqlite");
const PORT = parseInt(process.env.HUB_PORT || "7700", 10);

async function main(): Promise<void> {
  console.log(`Starting OpenClaw Hub on port ${PORT}...`);
  console.log(`Database: ${DB_PATH}`);

  const CONFIG_PATH = resolve(__dirname, "..", "..", "config", "telegram-config.json");
  const LOG_FILE = resolve(__dirname, "..", "..", ".boardroom", "telegram-log.md");

  const hub = await createHub({ dbPath: DB_PATH, port: PORT, configPath: CONFIG_PATH, logFile: LOG_FILE });

  console.log(`Hub running at http://127.0.0.1:${PORT}`);
  console.log(`Token file: ${resolve(DB_PATH, "..", "dashboard-token.json")}`);

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down...`);
    await hub.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Hub failed to start:", err.message);
  process.exit(1);
});
