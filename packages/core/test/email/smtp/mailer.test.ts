/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { createMailer } from "../../../src/email/smtp/mailer.js";

describe("OutboundMailer", () => {
  it("sends email using subsidiary SMTP config", async () => {
    const transport = {
      sendMail: vi.fn().mockResolvedValue({ messageId: "msg-1" }),
    };
    const mailer = createMailer(() => transport as any);
    const result = await mailer.send({
      to: "customer@test.com",
      subject: "Re: Your request",
      text: "Thank you for reaching out.",
      smtp: {
        host: "smtp.test.com",
        port: 587,
        secure: false,
        username: "u",
        passwordEnv: "PASS",
        fromEmail: "ops@acf.com",
      },
    });
    expect(result.messageId).toBe("msg-1");
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "ops@acf.com",
        to: "customer@test.com",
        subject: "Re: Your request",
      }),
    );
  });

  it("includes fromName when provided", async () => {
    const transport = {
      sendMail: vi.fn().mockResolvedValue({ messageId: "msg-2" }),
    };
    const mailer = createMailer(() => transport as any);
    await mailer.send({
      to: "a@b.com",
      subject: "x",
      text: "y",
      smtp: {
        host: "h",
        port: 587,
        secure: false,
        username: "u",
        passwordEnv: "P",
        fromEmail: "ops@acf.com",
        fromName: "ACF Support",
      },
    });
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"ACF Support" <ops@acf.com>',
      }),
    );
  });

  it("throws if SMTP config is missing", async () => {
    const mailer = createMailer(() => {
      throw new Error("no transport");
    });
    await expect(
      mailer.send({
        to: "a@b.com",
        subject: "x",
        text: "y",
        smtp: undefined as any,
      }),
    ).rejects.toThrow();
  });
});
