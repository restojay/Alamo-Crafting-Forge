import { describe, it, expect } from "vitest";

function validateContactForm(data: Record<string, unknown>) {
  const errors: string[] = [];
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2)
    errors.push("Name is required (min 2 chars)");
  if (!data.email || typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.push("Valid email is required");
  if (!data.message || typeof data.message !== "string" || data.message.trim().length < 10)
    errors.push("Message is required (min 10 chars)");
  if (data.honeypot) errors.push("Bot detected");
  return errors;
}

describe("contact form validation", () => {
  it("rejects empty form", () => {
    expect(validateContactForm({})).toHaveLength(3);
  });

  it("rejects invalid email", () => {
    const errors = validateContactForm({ name: "Jay", email: "not-an-email", message: "Hello there, testing." });
    expect(errors).toContain("Valid email is required");
  });

  it("rejects short message", () => {
    const errors = validateContactForm({ name: "Jay", email: "jay@test.com", message: "Hi" });
    expect(errors).toContain("Message is required (min 10 chars)");
  });

  it("catches honeypot field", () => {
    const errors = validateContactForm({ name: "Jay", email: "jay@test.com", message: "Hello there, testing.", honeypot: "spam" });
    expect(errors).toContain("Bot detected");
  });

  it("passes valid form", () => {
    const errors = validateContactForm({ name: "Jay", email: "jay@test.com", message: "I'd like to discuss a project." });
    expect(errors).toHaveLength(0);
  });
});
