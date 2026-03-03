import { vi, describe, it, expect } from "vitest";
import type { OutboundMailer } from "@servicebot/core";

let capturedBaseSend: ReturnType<typeof vi.fn>;

vi.mock("@servicebot/core", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@servicebot/core")>();
  return {
    ...orig,
    createMailer: (_factory: unknown): OutboundMailer => {
      capturedBaseSend = vi.fn().mockResolvedValue(undefined);
      return { send: capturedBaseSend };
    },
  };
});

import { getMailer, getSubsidiarySmtpConfig, getServiceBotDb } from "./server";

describe("getMailer", () => {
  it("returns an OutboundMailer with a send method", () => {
    const mailer = getMailer();
    expect(typeof mailer.send).toBe("function");
  });

  it("dry-run mode rewrites recipient and prefixes subject", async () => {
    const mailer = getMailer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await mailer.send({ to: "real@customer.com", subject: "Ticket update", text: "body" } as any);
    expect(capturedBaseSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "restojay01@gmail.com",
        subject: "[DRY-RUN → real@customer.com] Ticket update",
      }),
    );
  });
});

describe("getSubsidiarySmtpConfig", () => {
  it("returns null for unknown subsidiary", () => {
    expect(getSubsidiarySmtpConfig("no-such-id-xyz")).toBeNull();
  });

  it("returns smtp config when present in stored configJson", () => {
    const db = getServiceBotDb();
    const id = `smtp-test-${Math.random().toString(36).slice(2)}`;
    const smtp = { host: "smtp.x.com", port: 587, secure: false, username: "u", passwordEnv: "P" };
    db.saveSubsidiary({
      id,
      name: "Test Sub",
      configJson: JSON.stringify({ id, name: "Test Sub", smtp }),
      createdAt: "2026-01-01T00:00:00Z",
    });
    expect(getSubsidiarySmtpConfig(id)).toEqual(smtp);
  });

  it("returns null when subsidiary has no smtp field", () => {
    const db = getServiceBotDb();
    const id = `no-smtp-${Math.random().toString(36).slice(2)}`;
    db.saveSubsidiary({
      id,
      name: "No SMTP Sub",
      configJson: JSON.stringify({ id, name: "No SMTP Sub" }),
      createdAt: "2026-01-01T00:00:00Z",
    });
    expect(getSubsidiarySmtpConfig(id)).toBeNull();
  });
});
