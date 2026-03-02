import type { WebhookEvent } from "../notifications/types";

export interface SubsidiaryConfig {
  id: string;
  name: string;
  sector: string;
  email: {
    inbound: string;
    smtp: string;
    credentialKey: string;
    pollIntervalMinutes: number;
  };
  agent: {
    businessContext: string;
    tone: string;
    faq: { question: string; answer: string }[];
    services: string[];
  };
  operations: {
    businessHours: string;
    escalationContact: string;
    slaOverrides?: Record<string, number>;
    taskRoutingDefaults?: Record<string, string>;
  };
  tasks: {
    recurring: { label: string; cron: string }[];
    categories: string[];
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    passwordEnv: string;
    fromEmail: string;
    fromName?: string;
  };
  webhooks?: Array<{
    event: WebhookEvent;
    url: string;
    secretEnv?: string;
    timeoutMs?: number;
  }>;
}
