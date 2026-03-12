"use client";

import { motion } from "framer-motion";

const capabilities = [
  {
    label: "SLA Printing",
    spec: "25μm · Formlabs 4B",
    description: "Ultra-high-resolution resin printing for miniatures, dice masters, and precision parts.",
  },
  {
    label: "FDM Manufacturing",
    spec: "Multi-material · Bambu P1S",
    description: "Carbon-fiber PETG and multi-material printing for functional, structural components.",
  },
  {
    label: "CAD Design",
    spec: "Parametric · Fusion 360",
    description: "Parametric modeling with dimensional tolerances, fitment validation, and export to any format.",
  },
  {
    label: "Web Development",
    spec: "Full-stack · Next.js + Vercel",
    description: "Custom websites built with modern frameworks, deployed on edge infrastructure.",
  },
];

export function ProcessSection() {
  return (
    <section
      id="capabilities"
      className="section-divider"
      style={{
        padding: "clamp(60px, 8vw, 100px) clamp(24px, 4vw, 48px)",
        position: "relative",
        background: "var(--base)",
      }}
    >
      <div className="noise-overlay" />

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ marginBottom: "clamp(32px, 4vw, 48px)" }}>
          <span className="spec-label" style={{ display: "block", marginBottom: "16px" }}>
            Capabilities
          </span>
          <h2
            style={{
              fontSize: "clamp(22px, 2.5vw, 32px)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            What We Build With
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: "1px",
            background: "var(--border)",
            border: "1px solid var(--border)",
          }}
        >
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                background: "var(--base)",
                padding: "clamp(24px, 3vw, 36px)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  color: "var(--accent)",
                  textTransform: "uppercase",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {cap.label}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                }}
              >
                {cap.description}
              </p>
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "10px",
                  letterSpacing: "0.04em",
                  color: "var(--text-tertiary)",
                  marginTop: "auto",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                {cap.spec}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
