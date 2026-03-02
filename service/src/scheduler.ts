import type { ServiceBotDatabase, SubsidiaryConfig } from "@servicebot/core";
import { generateRecurringTasks } from "@servicebot/core";

export interface SchedulerDeps {
  db: ServiceBotDatabase;
  configs: SubsidiaryConfig[];
  intervalMs?: number;
  now?: () => Date;
}

export function runScheduler(deps: SchedulerDeps): { stop: () => void } {
  const { db, configs, intervalMs = 60_000, now = () => new Date() } = deps;

  function tick(): void {
    const lastRun = db.getSyncState("recurring:last_run");
    const since = lastRun ? new Date(lastRun) : new Date(0);
    const currentTime = now();

    generateRecurringTasks(configs, since, db, currentTime);
    db.saveSyncState("recurring:last_run", currentTime.toISOString());
  }

  // Run immediately on start
  tick();

  const handle = setInterval(tick, intervalMs);

  return {
    stop() {
      clearInterval(handle);
    },
  };
}
