"use client";

import { useState, type FormEvent } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<string[]>([]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrors([]);

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name"),
      email: form.get("email"),
      subject: form.get("subject"),
      message: form.get("message"),
      honeypot: form.get("_hp"),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (result.success) {
        setState("success");
      } else {
        setState("error");
        setErrors(result.errors || ["Something went wrong."]);
      }
    } catch {
      setState("error");
      setErrors(["Network error. Please try again."]);
    }
  }

  if (state === "success") {
    return (
      <div
        style={{
          padding: "40px",
          border: "1px solid var(--border-strong)",
          borderRadius: "3px",
          textAlign: "center",
          background: "var(--base-raised)",
        }}
      >
        <div style={{ fontSize: "24px", marginBottom: "12px", color: "var(--accent)" }}>Message Sent</div>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Thanks for reaching out. We'll get back to you within 1-2 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <input type="text" name="_hp" tabIndex={-1} autoComplete="off" />
      </div>

      {errors.length > 0 && (
        <div style={{ padding: "12px 16px", border: "1px solid #ef4444", borderRadius: "2px", background: "rgba(239,68,68,0.1)" }}>
          {errors.map((err) => (
            <p key={err} style={{ fontSize: "13px", color: "#ef4444" }}>{err}</p>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <label className="spec-label" htmlFor="name" style={{ display: "block", marginBottom: "8px" }}>Name</label>
          <input id="name" name="name" type="text" required minLength={2} className="contact-input" />
        </div>
        <div>
          <label className="spec-label" htmlFor="email" style={{ display: "block", marginBottom: "8px" }}>Email</label>
          <input id="email" name="email" type="email" required className="contact-input" />
        </div>
      </div>

      <div>
        <label className="spec-label" htmlFor="subject" style={{ display: "block", marginBottom: "8px" }}>Subject</label>
        <input id="subject" name="subject" type="text" className="contact-input" placeholder="Optional" />
      </div>

      <div>
        <label className="spec-label" htmlFor="message" style={{ display: "block", marginBottom: "8px" }}>Message</label>
        <textarea id="message" name="message" required minLength={10} rows={6} className="contact-input" style={{ resize: "vertical" }} />
      </div>

      <button
        type="submit"
        className="btn-accent"
        disabled={state === "submitting"}
        style={{
          alignSelf: "flex-start",
          fontSize: "13px",
          padding: "12px 32px",
          opacity: state === "submitting" ? 0.6 : 1,
          cursor: state === "submitting" ? "not-allowed" : "pointer",
        }}
      >
        {state === "submitting" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
