import Image from "next/image";
import type { Brand } from "@/lib/brands";
import { sectorMeta } from "@/lib/brands";

export function BrandHero({ brand }: { brand: Brand }) {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "60vh",
        display: "flex",
        alignItems: "flex-end",
        padding: "clamp(24px, 4vw, 48px)",
        overflow: "hidden",
      }}
    >
      <Image
        src={brand.image}
        alt={brand.name}
        fill
        sizes="100vw"
        className="object-cover"
        priority
        style={{ filter: "brightness(0.5) saturate(0.8)", zIndex: 0 }}
      />
      <div className="noise-overlay" />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "800px",
          paddingBottom: "clamp(24px, 4vw, 48px)",
        }}
      >
        <span className="spec-label" style={{ marginBottom: "12px", display: "block" }}>
          {sectorMeta[brand.sector].label}
        </span>
        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "var(--text-primary)",
            marginBottom: "12px",
          }}
        >
          {brand.name}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "13px",
            letterSpacing: "0.06em",
            color: "var(--text-secondary)",
            marginBottom: "16px",
          }}
        >
          {brand.tagline}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {brand.blueprintMeta.map((meta) => (
            <span
              key={meta}
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "10px",
                letterSpacing: "0.06em",
                padding: "4px 10px",
                border: "1px solid var(--border-strong)",
                color: "var(--text-secondary)",
                borderRadius: "1px",
                background: "rgba(0,0,0,0.4)",
              }}
            >
              {meta}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
