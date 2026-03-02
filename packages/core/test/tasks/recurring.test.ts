import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getNextRun, isDue, generateRecurringTasks } from "../../src/tasks/recurring.js";
import { ServiceBotDatabase } from "../../src/db/database.js";
import type { SubsidiaryConfig } from "../../src/config/types.js";

function makeConfig(overrides: Partial<SubsidiaryConfig> = {}): SubsidiaryConfig {
  return {
    id: "sub-1",
    name: "Test Sub",
    sector: "services",
    email: {
      inbound: "test@example.com",
      smtp: "smtp://localhost",
      credentialKey: "test-key",
      pollIntervalMinutes: 5,
    },
    agent: {
      businessContext: "Test business",
      tone: "professional",
      faq: [],
      services: [],
    },
    operations: {
      businessHours: "9-5 M-F",
      escalationContact: "admin@example.com",
    },
    tasks: {
      recurring: [{ label: "Weekly inventory check", cron: "0 9 * * 1" }],
      categories: ["recurring"],
    },
    webhooks: [],
    ...overrides,
  };
}

describe("getNextRun", () => {
  it("returns a Date in the future", () => {
    const next = getNextRun("0 0 * * *"); // daily at midnight
    expect(next).toBeInstanceOf(Date);
    expect(next.getTime()).toBeGreaterThan(Date.now());
  });

  it("throws on invalid cron expression", () => {
    expect(() => getNextRun("not a cron")).toThrow();
  });
});

describe("isDue", () => {
  it("returns true when a cron occurrence falls between since and now", () => {
    // Fixed reference: "now" is 2025-06-15 12:00, "since" is 1 hour before
    const now = new Date("2025-06-15T12:00:00Z");
    const since = new Date("2025-06-15T11:00:00Z");
    // Every minute — many occurrences between since and now
    expect(isDue("* * * * *", since, now)).toBe(true);
  });

  it("returns false when no occurrence falls in the window", () => {
    // "since" is after "now" — next occurrence after since can't be <= now
    const now = new Date("2025-06-15T12:00:00Z");
    const since = new Date("2026-06-15T12:00:00Z");
    expect(isDue("0 0 * * *", since, now)).toBe(false);
  });
});

describe("generateRecurringTasks", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    db = new ServiceBotDatabase(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("creates tasks for due recurring rules", () => {
    const config = makeConfig({
      tasks: {
        recurring: [{ label: "Daily check", cron: "* * * * *" }], // every minute = always due
        categories: ["recurring"],
      },
    });

    const now = new Date("2025-06-15T12:00:00Z");
    const oneHourAgo = new Date("2025-06-15T11:00:00Z");
    const tasks = generateRecurringTasks([config], oneHourAgo, db, now);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].description).toBe("Daily check");
    expect(tasks[0].category).toBe("recurring");
    expect(tasks[0].state).toBe("new");
    expect(tasks[0].subsidiaryId).toBe("sub-1");
  });

  it("skips rules that are not due", () => {
    const config = makeConfig({
      tasks: {
        recurring: [{ label: "Yearly check", cron: "0 0 1 1 *" }], // Jan 1 midnight
        categories: ["recurring"],
      },
    });

    const now = new Date("2025-06-15T12:00:00Z");
    // since is after now — nothing can be due
    const farFuture = new Date("2026-06-15T12:00:00Z");
    const tasks = generateRecurringTasks([config], farFuture, db, now);
    expect(tasks).toHaveLength(0);
  });

  it("deduplicates — does not create the same task twice", () => {
    const config = makeConfig({
      tasks: {
        recurring: [{ label: "Daily check", cron: "* * * * *" }],
        categories: ["recurring"],
      },
    });

    const now = new Date("2025-06-15T12:00:00Z");
    const oneHourAgo = new Date("2025-06-15T11:00:00Z");

    const first = generateRecurringTasks([config], oneHourAgo, db, now);
    expect(first).toHaveLength(1);

    const second = generateRecurringTasks([config], oneHourAgo, db, now);
    expect(second).toHaveLength(0);
  });

  it("creates separate tasks for the same rule on different days", () => {
    const config = makeConfig({
      tasks: {
        recurring: [{ label: "Daily check", cron: "* * * * *" }],
        categories: ["recurring"],
      },
    });

    const day1 = new Date("2025-06-15T12:00:00Z");
    const day1Since = new Date("2025-06-15T11:00:00Z");
    const first = generateRecurringTasks([config], day1Since, db, day1);
    expect(first).toHaveLength(1);

    const day2 = new Date("2025-06-16T12:00:00Z");
    const day2Since = new Date("2025-06-16T11:00:00Z");
    const second = generateRecurringTasks([config], day2Since, db, day2);
    expect(second).toHaveLength(1);
    expect(second[0].id).not.toBe(first[0].id);
  });

  it("handles multiple subsidiaries", () => {
    const configs = [
      makeConfig({
        id: "sub-1",
        tasks: {
          recurring: [{ label: "Check A", cron: "* * * * *" }],
          categories: ["recurring"],
        },
      }),
      makeConfig({
        id: "sub-2",
        tasks: {
          recurring: [{ label: "Check B", cron: "* * * * *" }],
          categories: ["recurring"],
        },
      }),
    ];

    const now = new Date("2025-06-15T12:00:00Z");
    const oneHourAgo = new Date("2025-06-15T11:00:00Z");
    const tasks = generateRecurringTasks(configs, oneHourAgo, db, now);
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.subsidiaryId).sort()).toEqual(["sub-1", "sub-2"]);
  });
});
