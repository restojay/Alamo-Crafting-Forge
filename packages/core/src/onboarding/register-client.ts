import type { ServiceBotDatabase } from "../db/database";
import { validateConfig } from "../config/schema";
import type { SubsidiaryConfig } from "../config/types";

export interface RegisterClientInput {
  config: unknown;
  db: ServiceBotDatabase;
  now: () => Date;
}

export interface RegisterClientResult {
  clientId: string;
  created: boolean;
}

export async function registerClientFromConfig(
  input: RegisterClientInput,
): Promise<RegisterClientResult> {
  const validation = validateConfig(input.config);
  if (!validation.valid) {
    throw new Error(`Config validation failed: ${validation.errors.join(", ")}`);
  }

  const config = validation.config;

  // Always upsert into subsidiaries table (idempotent — safe to call every registration)
  input.db.saveSubsidiary({
    id: config.id,
    name: config.name,
    configJson: JSON.stringify(config),
    createdAt: input.now().toISOString(),
  });

  // Check for existing registration (idempotent)
  const existing = input.db.getSyncState(`client:${config.id}`);
  if (existing) {
    return { clientId: config.id, created: false };
  }

  // Register the client
  input.db.saveSyncState(
    `client:${config.id}`,
    JSON.stringify({
      registeredAt: input.now().toISOString(),
      name: config.name,
      sector: config.sector,
    }),
  );

  input.db.saveAuditEntry({
    entityType: "client",
    entityId: config.id,
    action: "registered",
    payloadJson: JSON.stringify({ name: config.name, sector: config.sector }),
  });

  return { clientId: config.id, created: true };
}
