import { ServiceBotDatabase, loadConfigs, createClaudeClient, fetchNewMessages, createLogger } from "@servicebot/core";
import type { GmailAuthOptions } from "@servicebot/core";
import { runPoller } from "../poller";
import { runScheduler } from "../scheduler";

const logger = createLogger("servicebot");

async function main() {
  const dbPath = process.env.SERVICEBOT_DB_PATH || "./servicebot.db";
  const pollInterval = parseInt(process.env.POLL_INTERVAL_MS || "120000", 10);
  const configDir = process.env.SERVICEBOT_CONFIG_DIR || "./subsidiaries";

  logger.info(`Starting ServiceBot service (db: ${dbPath}, poll: ${pollInterval}ms)`);

  const db = new ServiceBotDatabase(dbPath);
  // WAL mode is already enabled by ServiceBotDatabase constructor

  const configResult = await loadConfigs(configDir);

  if (configResult.errors.length > 0) {
    for (const err of configResult.errors) {
      logger.error(`Config error in ${err.file}: ${err.messages.join(", ")}`);
    }
  }

  const configs = configResult.configs;

  if (configs.length === 0) {
    logger.error("No valid subsidiary configs found. Exiting.");
    process.exit(1);
  }

  logger.info(`Loaded ${configs.length} subsidiary config(s)`);

  const claude = createClaudeClient();

  const authOptions: GmailAuthOptions = {
    credentialsPath: process.env.GMAIL_CREDENTIALS_PATH || "./credentials.json",
    tokenPath: process.env.GMAIL_TOKEN_PATH || "./token.json",
  };

  const poller = runPoller({
    db,
    configs,
    claude,
    fetchMessages: (maxResults?: number) => fetchNewMessages(authOptions, maxResults),
    intervalMs: pollInterval,
  });

  const scheduler = runScheduler({
    db,
    configs,
    intervalMs: 60_000,
  });

  logger.info("ServiceBot service running. Press Ctrl+C to stop.");

  process.on("SIGINT", () => {
    logger.info("Shutting down...");
    poller.stop();
    scheduler.stop();
    db.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    poller.stop();
    scheduler.stop();
    db.close();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error("Fatal error", err);
  process.exit(1);
});
