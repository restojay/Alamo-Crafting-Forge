import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceBotDatabase } from "@servicebot/core";
import type { SubsidiaryConfig } from "@servicebot/core";
import { runScheduler } from "../src/scheduler.js";

const stubConfig: SubsidiaryConfig = {
  id: "sunny-side-hvac",
  name: "Sunny Side HVAC",
  sector: "hvac",
  email: {
    inbound: "info@sunnysidehvac.com",
    smtp: "smtp.gmail.com",
    credentialKey: "sunny-side-creds",
    pollIntervalMinutes: 5,
  },
  agent: {
    businessContext: "Residential and commercial HVAC contractor.",
    tone: "professional and friendly",
    faq: [],
    services: ["AC repair"],
  },
  operations: {
    businessHours: "Mon-Sat 8am-6pm",
    escalationContact: "info@sunnysidehvac.com",
  },
  tasks: {
    recurring: [
      { label: "Weekly inventory check", cron: "0 9 * * 1" }, // every Monday 9am
    ],
    categories: ["service-call", "inventory"],
  },
  webhooks: [],
};

describe("runScheduler", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    vi.useFakeTimers();
    db = new ServiceBotDatabase(":memory:");
  });

  afterEach(() => {
    db.close();
    vi.useRealTimers();
  });

  it("triggers recurring task generation on start", () => {
    // Set fake time to a Monday 9:05am so the cron "0 9 * * 1" is due
    const monday = new Date("2026-03-02T09:05:00Z"); // 2026-03-02 is a Monday
    vi.setSystemTime(monday);

    const scheduler = runScheduler({
      db,
      configs: [stubConfig],
      intervalMs: 60_000,
      now: () => monday,
    });

    // A recurring task should have been created
    const lastRun = db.getSyncState("recurring:last_run");
    expect(lastRun).toBe(monday.toISOString());

    scheduler.stop();
  });

  it("persists last-run time to sync_state", () => {
    const now = new Date("2026-03-02T10:00:00Z");
    vi.setSystemTime(now);

    const scheduler = runScheduler({
      db,
      configs: [stubConfig],
      intervalMs: 60_000,
      now: () => now,
    });

    expect(db.getSyncState("recurring:last_run")).toBe(now.toISOString());

    scheduler.stop();
  });

  it("stop() halts the interval", () => {
    const now = new Date("2026-03-02T10:00:00Z");
    vi.setSystemTime(now);

    let callCount = 0;
    const trackingNow = () => {
      callCount++;
      return now;
    };

    const scheduler = runScheduler({
      db,
      configs: [stubConfig],
      intervalMs: 1000,
      now: trackingNow,
    });

    // Initial tick runs immediately
    const initialCount = callCount;

    // Stop the scheduler
    scheduler.stop();

    // Advance timers — should NOT trigger more ticks
    vi.advanceTimersByTime(5000);
    expect(callCount).toBe(initialCount);
  });

  it("runs periodically on the interval", () => {
    // Use a time far enough from any cron trigger to isolate interval behavior
    let currentTime = new Date("2026-03-03T15:00:00Z"); // Tuesday 3pm
    vi.setSystemTime(currentTime);

    const scheduler = runScheduler({
      db,
      configs: [stubConfig],
      intervalMs: 1000,
      now: () => currentTime,
    });

    // After initial tick, last_run is set
    const firstRun = db.getSyncState("recurring:last_run");
    expect(firstRun).toBe(currentTime.toISOString());

    // Advance time and tick
    currentTime = new Date("2026-03-03T15:00:01Z");
    vi.advanceTimersByTime(1000);

    const secondRun = db.getSyncState("recurring:last_run");
    expect(secondRun).toBe(currentTime.toISOString());

    scheduler.stop();
  });
});
