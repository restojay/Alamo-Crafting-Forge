"use client";

import { motion } from "framer-motion";

export function AboutSection() {
  return (
    <section
      id="about"
      className="section-divider"
      style={{
        padding: "clamp(80px, 10vw, 140px) clamp(24px, 4vw, 48px)",
        position: "relative",
        background: "var(--base)",
      }}
    >
      <div className="noise-overlay" />

      <div
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Section label */}
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="spec-label"
          style={{ display: "block", textAlign: "center", marginBottom: "16px" }}
        >
          San Antonio, TX
        </motion.span>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            fontSize: "clamp(24px, 3vw, 36px)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            textAlign: "center",
            color: "var(--text-primary)",
            marginBottom: "32px",
          }}
        >
          About the Forge
        </motion.h2>

        {/* Body */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            fontSize: "15px",
            lineHeight: 1.8,
            color: "var(--text-secondary)",
            textAlign: "center",
            letterSpacing: "0.01em",
          }}
        >
          Alamo Crafting Forge is a manufacturing and design studio
          built on precision engineering. We produce 3D-printed products
          and custom websites across four specialized brands — each with
          its own identity, all held to the same standard of quality.
          Everything we ship is designed, tested, and made to spec.
        </motion.p>

        {/* Divider accent */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            width: "40px",
            height: "1px",
            background: "var(--accent)",
            margin: "40px auto 0",
            transformOrigin: "center",
          }}
        />

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "clamp(32px, 4vw, 64px)",
            marginTop: "40px",
          }}
        >
          {[
            { value: "4", label: "Brands" },
            { value: "2", label: "Printers" },
            { value: "1", label: "Standard" },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "var(--accent)",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                className="spec-label"
                style={{ marginTop: "8px" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
