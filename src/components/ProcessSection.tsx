"use client";

import { motion } from "framer-motion";

/* Compact SVG icons */
function IconSLA() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function IconFDM() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M9 4v16" />
      <path d="M15 4v16" />
      <path d="M4 9h16" />
      <path d="M4 15h16" />
    </svg>
  );
}

function IconCAD() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

function IconWeb() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
      <path d="M16 18l6-6-6-6" />
      <path d="M8 6l-6 6 6 6" />
      <path d="M14.5 4l-5 16" />
    </svg>
  );
}

const capabilities = [
  { icon: IconSLA, label: "SLA Printing", spec: "25μm · Formlabs 4B" },
  { icon: IconFDM, label: "FDM Manufacturing", spec: "Multi-material · Bambu P1S" },
  { icon: IconCAD, label: "CAD Design", spec: "Parametric · Fusion 360" },
  { icon: IconWeb, label: "Web Development", spec: "Full-stack · Next.js + Vercel" },
];

export function ProcessSection() {
  return (
    <section
      id="capabilities"
      className="section-divider"
      style={{
        padding: "clamp(40px, 5vw, 64px) clamp(24px, 4vw, 48px)",
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
        {/* Inline capability strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1px",
            background: "var(--border)",
            border: "1px solid var(--border)",
          }}
        >
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              style={{
                background: "var(--base)",
                padding: "clamp(16px, 2vw, 24px)",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "2px",
                  background: "var(--accent-subtle)",
                  flexShrink: 0,
                }}
              >
                <cap.icon />
              </div>

              {/* Label + spec */}
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {cap.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "10px",
                    color: "var(--text-tertiary)",
                    letterSpacing: "0.04em",
                    marginTop: "2px",
                  }}
                >
                  {cap.spec}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
