export interface MetricCounters {
  emails_processed: number;
  tasks_created: number;
  drafts_sent: number;
  webhooks_delivered: number;
  [key: string]: number;
}

export interface Metrics {
  increment(key: keyof MetricCounters): void;
  snapshot(): MetricCounters;
}

export function createMetrics(): Metrics {
  const counters: MetricCounters = {
    emails_processed: 0,
    tasks_created: 0,
    drafts_sent: 0,
    webhooks_delivered: 0,
  };

  return {
    increment(key: keyof MetricCounters) {
      counters[key] = (counters[key] ?? 0) + 1;
    },
    snapshot(): MetricCounters {
      const snap = { ...counters };
      for (const key of Object.keys(counters)) {
        counters[key] = 0;
      }
      return snap;
    },
  };
}
