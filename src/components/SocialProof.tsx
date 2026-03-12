"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "The grip plugs fit perfectly — tighter tolerances than OEM parts I've bought.",
    author: "Forgepoint Customer",
    context: "Custom Glock 19 Backplate",
  },
  {
    quote: "Incredibly detailed miniatures. Paint-ready right out of the box.",
    author: "Realmforge Customer",
    context: "D&D Campaign Set",
  },
  {
    quote: "ACF Designs delivered our site in under two weeks. Fast, clean, professional.",
    author: "Small Business Owner",
    context: "Website Build",
  },
];

export function SocialProof() {
  return (
    <section
      className="section-divider"
      style={{
        padding: "clamp(60px, 8vw, 100px) clamp(24px, 4vw, 48px)",
        background: "var(--base)",
        position: "relative",
      }}
    >
      <div className="noise-overlay" />
      <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <span className="spec-label" style={{ display: "block", marginBottom: "16px" }}>
          From Our Customers
        </span>
        <h2
          style={{
            fontSize: "clamp(22px, 2.5vw, 32px)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            marginBottom: "clamp(32px, 4vw, 48px)",
          }}
        >
          Proof of Work
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "24px",
          }}
        >
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                background: "var(--base-raised)",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "clamp(20px, 3vw, 32px)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.7,
                  color: "var(--text-secondary)",
                  fontStyle: "italic",
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>
              <div style={{ marginTop: "auto" }}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                  {t.author}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "10px",
                    letterSpacing: "0.06em",
                    color: "var(--text-tertiary)",
                    marginTop: "2px",
                  }}
                >
                  {t.context}
                </div>
              </div>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
