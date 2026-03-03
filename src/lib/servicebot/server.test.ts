import { describe, it, expect } from "vitest";
import { getMailer } from "./server";

describe("getMailer", () => {
  it("returns an OutboundMailer with a send method", () => {
    const mailer = getMailer();
    expect(typeof mailer.send).toBe("function");
  });
});
