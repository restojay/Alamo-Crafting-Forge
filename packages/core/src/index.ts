// @servicebot/core — main entry point

// Database
export { ServiceBotDatabase } from "./db/database";
export type { Ticket, Task, TaskState, Draft, Contact, AuditEntry, TicketStatus, Urgency, WebhookAttempt, Subsidiary } from "./db/types";

// Email
export { parseEmail, parseEmailAddress } from "./email/parser/email-parser";
export { fetchNewMessages, extractEmailData } from "./email/gmail/fetcher";
export { matchEmailToSubsidiary } from "./email/matcher/subsidiary-matcher";
export type { RawEmail, ParsedEmail, EmailAddress } from "./email/types";
export type { MatchResult } from "./email/matcher/subsidiary-matcher";
export type { GmailAuthOptions } from "./email/gmail/auth";

// Agent
export { classifyEmail } from "./agent/classifier";
export { extractActionItems } from "./agent/extractor";
export { generateDraft } from "./agent/draft-generator";
export { createClaudeClient } from "./agent/claude-client";
export type { ClaudeClient } from "./agent/claude-client";
export type { Classification } from "./agent/classifier";
export type { ActionItem } from "./agent/extractor";

// Tasks
export { isValidTransition, transition } from "./tasks/state-machine";
export { computeDedupeHash } from "./tasks/dedupe";
export { getNextRun, isDue, generateRecurringTasks } from "./tasks/recurring";

// SMTP Outbound
export { createMailer } from "./email/smtp/mailer";
export type { OutboundMailer, SendInput, SendResult } from "./email/smtp/mailer";
export { sendApprovedDraft } from "./email/smtp/sender";
export type { SendApprovedDraftInput, SendApprovedDraftResult } from "./email/smtp/sender";

// Webhooks
export { dispatchWebhooks } from "./webhooks/dispatcher";
export type { WebhookConfig, DispatchInput, DispatchResult } from "./webhooks/dispatcher";
export { nextDelayMs, MAX_ATTEMPTS } from "./webhooks/retry-policy";
export { signPayload } from "./webhooks/signer";

// Notifications
export type { WebhookEvent } from "./notifications/types";

// Observability
export { createMetrics } from "./observability/metrics";
export type { Metrics, MetricCounters } from "./observability/metrics";
export { createLogger } from "./observability/logger";
export type { Logger } from "./observability/logger";

// Onboarding
export { registerClientFromConfig } from "./onboarding/register-client";
export type { RegisterClientInput, RegisterClientResult } from "./onboarding/register-client";

// Config
export type { SubsidiaryConfig } from "./config/types";
export { validateConfig, subsidiaryConfigSchema } from "./config/schema";
export { loadConfigs } from "./config/loader";
export type { LoadResult } from "./config/loader";
