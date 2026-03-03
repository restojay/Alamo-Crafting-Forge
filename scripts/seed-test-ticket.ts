/**
 * Seed script: creates a synthetic ticket + draft for dry-run SMTP smoke testing.
 * Run with: npx tsx scripts/seed-test-ticket.ts
 *
 * Pre-requisites:
 * - SERVICEBOT_DB_PATH set (or defaults to ./servicebot.db)
 * - Subsidiary "sunny-side-hvac" registered (run onboarding first, or this script
 *   will still create the ticket — it just won't have SMTP config to auto-send)
 */
import { ServiceBotDatabase } from "@servicebot/core";
import { randomUUID } from "node:crypto";

const dbPath = process.env.SERVICEBOT_DB_PATH || "./servicebot.db";
const db = new ServiceBotDatabase(dbPath);

const ticketId = randomUUID();
const draftId = randomUUID();

db.saveTicket({
  id: ticketId,
  subsidiaryId: "sunny-side-hvac",
  emailId: `test-email-${Date.now()}`,
  subject: "Test: AC not cooling",
  customerEmail: "restojay01@gmail.com",
  customerName: "Jay (Test)",
  status: "open",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

db.saveDraft({
  id: draftId,
  ticketId,
  body: "Hi Jay,\n\nThank you for reaching out! We'll have a tech out to you within 4 hours.\n\nBest,\nSunny Side HVAC",
  approved: 0,
  createdAt: new Date().toISOString(),
});

console.log(`✓ Created ticket: ${ticketId}`);
console.log(`✓ Created draft:  ${draftId}`);
console.log(`\nNext steps:`);
console.log(`  1. pnpm dev`);
console.log(`  2. Visit http://localhost:3000/admin/servicebot/tickets`);
console.log(`  3. Click "Test: AC not cooling" → approve draft`);
console.log(`  4. Check restojay01@gmail.com for the DRY-RUN email`);

db.close();
