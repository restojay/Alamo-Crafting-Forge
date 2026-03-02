import { readFileSync } from "node:fs";
import { ServiceBotDatabase, registerClientFromConfig } from "@servicebot/core";

/**
 * CLI: Register a new client from a JSON config file.
 *
 * Usage:
 *   npx tsx service/src/cli/register-client.ts <config-path> [--db <db-path>]
 */
async function main() {
  const args = process.argv.slice(2);
  const configPath = args[0];
  const dbFlag = args.indexOf("--db");
  const dbPath = dbFlag >= 0 ? args[dbFlag + 1] : process.env.SERVICEBOT_DB_PATH || "./servicebot.db";

  if (!configPath) {
    console.error("Usage: register-client <config.json> [--db <path>]");
    process.exit(1);
  }

  const raw = readFileSync(configPath, "utf-8");
  const config = JSON.parse(raw);

  const db = new ServiceBotDatabase(dbPath);
  try {
    const result = await registerClientFromConfig({
      config,
      db,
      now: () => new Date(),
    });

    if (result.created) {
      console.log(`Registered client: ${result.clientId}`);
    } else {
      console.log(`Client already registered: ${result.clientId}`);
    }
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error("Registration failed:", err.message);
  process.exit(1);
});
