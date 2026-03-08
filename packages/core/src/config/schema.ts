import { z } from "zod";
import type { SubsidiaryConfig } from "./types";

/** Zod schema matching the SubsidiaryConfig interface exactly. */
export const subsidiaryConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sector: z.string().min(1),

  email: z.object({
    inbound: z.string().email(),
    smtp: z.string().min(1),
    credentialKey: z.string().min(1),
    pollIntervalMinutes: z.number().int().min(1).max(60),
  }),

  agent: z.object({
    businessContext: z.string(),
    tone: z.string(),
    faq: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    ),
    services: z.array(z.string()),
  }),

  operations: z.object({
    businessHours: z.string(),
    escalationContact: z.string(),
    slaOverrides: z.record(z.string(), z.number()).optional(),
    taskRoutingDefaults: z.record(z.string(), z.string()).optional(),
  }),

  tasks: z.object({
    recurring: z.array(
      z.object({
        label: z.string(),
        cron: z.string(),
      }),
    ),
    categories: z.array(z.string()),
  }),

  smtp: z.object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    username: z.string().min(1),
    passwordEnv: z.string().min(1),
    fromEmail: z.string().email(),
    fromName: z.string().optional(),
  }).optional(),

  webhooks: z.array(
    z.object({
      event: z.enum(["task.completed", "booking.created"]),
      url: z.string().url(),
      secretEnv: z.string().optional(),
      timeoutMs: z.number().int().min(1).max(15000).default(5000),
    }),
  ).optional(),
});

/** Type-check: ensure the schema output is assignable to SubsidiaryConfig. */
type _SchemaCheck = z.infer<typeof subsidiaryConfigSchema> extends SubsidiaryConfig
  ? true
  : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: _SchemaCheck = true;

export type ValidResult = { valid: true; config: SubsidiaryConfig };
export type InvalidResult = { valid: false; errors: string[] };
export type ValidationResult = ValidResult | InvalidResult;

/** Validate a config object. Returns { valid, config } or { valid, errors }. Never throws. */
export function validateConfig(input: unknown): ValidationResult {
  const result = subsidiaryConfigSchema.safeParse(input);
  if (result.success) {
    return { valid: true, config: result.data as SubsidiaryConfig };
  }
  return {
    valid: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    ),
  };
}
