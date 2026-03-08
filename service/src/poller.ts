import type { ServiceBotDatabase, SubsidiaryConfig, ClaudeClient, RawEmail } from "@servicebot/core";
import { processNewEmails } from "./index";
import { createLogger } from "@servicebot/core";

export interface PollerDeps {
  db: ServiceBotDatabase;
  configs: SubsidiaryConfig[];
  claude: ClaudeClient;
  fetchMessages: (maxResults?: number) => Promise<RawEmail[]>;
  intervalMs?: number;
  maxResults?: number;
}

export function runPoller(deps: PollerDeps): { stop: () => void } {
  const { db, configs, claude, fetchMessages, intervalMs = 120_000, maxResults = 10 } = deps;
  const logger = createLogger("poller");
  let stopped = false;
  let running = false;

  async function tick(): Promise<void> {
    if (stopped || running) return;
    running = true;
    try {
      const result = await processNewEmails({
        db,
        configs,
        claude,
        fetchMessages,
        maxResults,
        logger,
      });
      if (result.processed > 0 || result.errors > 0) {
        logger.info(`Poll complete: ${result.processed} processed, ${result.errors} errors, ${result.skipped} skipped`);
      }
    } catch (err) {
      logger.error("Poll tick failed", err instanceof Error ? { error: err.message } : { error: String(err) });
    } finally {
      running = false;
    }
  }

  // Run immediately, then on interval
  tick();
  const handle = setInterval(tick, intervalMs);

  return {
    stop() {
      stopped = true;
      clearInterval(handle);
    },
  };
}
