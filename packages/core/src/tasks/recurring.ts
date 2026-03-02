import CronExpressionParser from "cron-parser";
import { randomUUID } from "node:crypto";
import type { SubsidiaryConfig } from "../config/types";
import type { Task } from "../db/types";
import type { ServiceBotDatabase } from "../db/database";
import { computeDedupeHash } from "./dedupe";

/**
 * Returns the next occurrence for a cron expression from now.
 */
export function getNextRun(cronExpression: string): Date {
  const expr = CronExpressionParser.parse(cronExpression);
  return expr.next().toDate();
}

/**
 * Returns true if there is a cron occurrence between `since` and now.
 */
export function isDue(cronExpression: string, since: Date, now?: Date): boolean {
  const expr = CronExpressionParser.parse(cronExpression, {
    currentDate: since,
  });
  const next = expr.next().toDate();
  return next.getTime() <= (now ?? new Date()).getTime();
}

/**
 * Iterate all subsidiary recurring rules, check if due since last run,
 * and create tasks if not duplicates.
 */
export function generateRecurringTasks(
  configs: SubsidiaryConfig[],
  since: Date,
  db: ServiceBotDatabase,
  now?: Date,
): Task[] {
  const created: Task[] = [];
  const effectiveNow = now ?? new Date();
  const nowIso = effectiveNow.toISOString();

  for (const config of configs) {
    for (const rule of config.tasks.recurring) {
      if (!isDue(rule.cron, since, effectiveNow)) continue;

      const occurrenceDate = effectiveNow.toISOString().slice(0, 10); // YYYY-MM-DD
      const hash = computeDedupeHash(config.id, `${rule.label}:${occurrenceDate}`, "recurring");
      if (db.isTaskDuplicate(hash)) continue;

      const task: Task = {
        id: randomUUID(),
        subsidiaryId: config.id,
        category: "recurring",
        state: "new",
        description: rule.label,
        urgency: 0,
        dedupeHash: hash,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.saveTask(task);
      created.push(task);
    }
  }

  return created;
}
