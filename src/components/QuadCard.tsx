"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Brand } from "@/lib/brands";

interface QuadCardProps {
  brand: Brand;
  isExpanded: boolean;
  isDimmed: boolean;
  onHover: () => void;
  onLeave: () => void;
}

const bgClass: Record<string, string> = {
  "acf-dice": "quad-bg-dice",
  forgepoint: "quad-bg-forgepoint",
  realmforge: "quad-bg-realmforge",
  "acf-designs": "quad-bg-designs",
};

export function QuadCard({
  brand,
  isExpanded,
  isDimmed,
  onHover,
  onLeave,
}: QuadCardProps) {
  return (
    <div
      className={`quad-card ${bgClass[brand.id] || ""} ${isDimmed ? "dimmed" : ""}`}
      tabIndex={0}
      role="button"
      aria-expanded={isExpanded}
      aria-label={`${brand.name} — ${brand.tagline}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isExpanded && brand.ctaHref) {
            window.open(brand.ctaHref, "_blank", "noopener,noreferrer");
          } else {
            onHover();
          }
        }
        if (e.key === "Escape") {
          onLeave();
        }
      }}
    >
      {/* Product image — full bleed with dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
        }}
      >
        <Image
          src={brand.image}
          alt={brand.name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          style={{
            filter: isExpanded ? "brightness(0.35) saturate(1.1)" : "brightness(0.15) saturate(0.7)",
            transition: "filter 0.8s ease, transform 8s ease",
            transform: isExpanded ? "scale(1.05)" : "scale(1)",
          }}
          priority={brand.position.startsWith("top")}
        />
      </div>

      {/* Steel texture */}
      <div className="steel-texture" />

      {/* Noise texture */}
      <div className="noise-overlay" />

      {/* Thermal bloom — ember glow on hover */}
      <div className="thermal-bloom" />

      {/* Blueprint grid */}
      <div className={`blueprint-grid ${isExpanded ? "active" : ""}`} />

      {/* Scanline effect on hover */}
      {isExpanded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: "1px",
              background: "linear-gradient(90deg, transparent 0%, rgba(249, 115, 22, 0.3) 50%, transparent 100%)",
              animation: "scanline 4s linear infinite",
            }}
          />
        </div>
      )}

      {/* Corner markers */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          width: "16px",
          height: "16px",
          borderTop: `1px solid ${isExpanded ? "var(--accent)" : "var(--border)"}`,
          borderLeft: `1px solid ${isExpanded ? "var(--accent)" : "var(--border)"}`,
          transition: "border-color 0.5s ease",
          zIndex: 10,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          width: "16px",
          height: "16px",
          borderBottom: `1px solid ${isExpanded ? "var(--accent)" : "var(--border)"}`,
          borderRight: `1px solid ${isExpanded ? "var(--accent)" : "var(--border)"}`,
          transition: "border-color 0.5s ease",
          zIndex: 10,
        }}
      />

      {/* Spec label top-right */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "40px",
          zIndex: 10,
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "9px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: isExpanded ? "var(--accent)" : "var(--text-tertiary)",
          opacity: isExpanded ? 0.8 : 0.3,
          transition: "all 0.5s ease",
        }}
      >
        {brand.id.replace("-", " ")}
      </div>

      {/* Inner border */}
      <div
        style={{
          position: "absolute",
          inset: "12px",
          border: `1px solid ${isExpanded ? "rgba(249, 115, 22, 0.12)" : "var(--border)"}`,
          borderRadius: "1px",
          transition: "border-color 0.5s ease",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "clamp(24px, 4vw, 48px)",
        }}
      >
        {/* Brand name */}
        <motion.h2
          animate={{ y: isExpanded ? -8 : 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            fontSize: "clamp(20px, 2.5vw, 32px)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "var(--text-primary)",
          }}
        >
          {brand.name}
        </motion.h2>

        {/* Tagline */}
        <motion.p
          animate={{ y: isExpanded ? -8 : 0 }}
          transition={{ duration: 0.4, delay: 0.02, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "11px",
            letterSpacing: "0.06em",
            color: "var(--text-secondary)",
            marginTop: "6px",
          }}
        >
          {brand.tagline}
        </motion.p>

        {/* Expanded: metadata + CTA */}
        <motion.div
          initial={false}
          animate={{
            opacity: isExpanded ? 1 : 0,
            y: isExpanded ? 0 : 16,
            height: isExpanded ? "auto" : 0,
          }}
          transition={{
            duration: 0.4,
            delay: isExpanded ? 0.12 : 0,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          style={{ overflow: "hidden", marginTop: "16px" }}
        >
          {/* Metadata tags — unified accent */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
            {brand.blueprintMeta.map((meta) => (
              <span
                key={meta}
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  padding: "4px 10px",
                  border: "1px solid rgba(249, 115, 22, 0.2)",
                  background: "rgba(249, 115, 22, 0.05)",
                  color: "var(--accent)",
                  borderRadius: "1px",
                }}
              >
                {meta}
              </span>
            ))}
          </div>

          {/* CTA */}
          <a
            href={brand.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent"
            tabIndex={isExpanded ? 0 : -1}
          >
            {brand.ctaLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </a>
        </motion.div>
      </div>
    </div>
  );
}
