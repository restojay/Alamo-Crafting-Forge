"use client";

import { motion } from "framer-motion";
import { Layers, Cpu, PenTool, Globe } from "lucide-react";

const capabilities = [
  {
    icon: Layers,
    label: "SLA Resin Printing",
    detail: "Formlabs 4B",
    spec: "25μm layer resolution",
  },
  {
    icon: Cpu,
    label: "FDM Manufacturing",
    detail: "Bambu Lab P1S",
    spec: "Multi-material, high-speed",
  },
  {
    icon: PenTool,
    label: "CAD Design",
    detail: "Fusion 360 + OpenSCAD",
    spec: "Parametric & generative",
  },
  {
    icon: Globe,
    label: "Web Development",
    detail: "Next.js + React + Tailwind",
    spec: "Full-stack, deployed on Vercel",
  },
];

export function ProcessSection() {
  return (
    <section
      id="process"
      className="section-divider"
      style={{
        padding: "clamp(80px, 10vw, 140px) clamp(24px, 4vw, 48px)",
        position: "relative",
        background: "var(--base)",
      }}
    >
      {/* Subtle noise */}
      <div className="noise-overlay" />

      <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(48px, 6vw, 80px)" }}>
          <span className="spec-label" style={{ display: "block", marginBottom: "16px" }}>
            Capabilities
          </span>
          <h2
            style={{
              fontSize: "clamp(24px, 3vw, 36px)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              marginBottom: "12px",
            }}
          >
            The Process
          </h2>
          <p
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "13px",
              color: "var(--text-secondary)",
              letterSpacing: "0.02em",
            }}
          >
            From resin to code — everything we make is engineered to spec.
          </p>
        </div>

        {/* Capability cards */}
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
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                background: "var(--base)",
                padding: "clamp(28px, 3vw, 40px)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                position: "relative",
              }}
            >
              {/* Index number */}
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "9px",
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.15em",
                  position: "absolute",
                  top: "12px",
                  right: "14px",
                }}
              >
                0{i + 1}
              </span>

              {/* Icon */}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "2px",
                  background: "var(--accent-subtle)",
                }}
              >
                <cap.icon size={18} color="var(--accent)" strokeWidth={1.5} />
              </div>

              {/* Label */}
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  letterSpacing: "0.01em",
                }}
              >
                {cap.label}
              </h3>

              {/* Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "11px",
                    color: "var(--accent)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {cap.detail}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "10px",
                    color: "var(--text-tertiary)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {cap.spec}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
