"use client";

import { brands, sectorMeta } from "@/lib/brands";
import type { Brand } from "@/lib/brands";
import { BrandCard } from "./BrandCard";
import { BrandCardHorizontal } from "./BrandCardHorizontal";

function SectorGroup({ brand }: { brand: Brand }) {
  const meta = sectorMeta[brand.sector];

  return (
    <div data-testid="sector-group">
      {/* Divider */}
      <div
        style={{
          width: "100%",
          height: "1px",
          background: "var(--border)",
          marginBottom: "clamp(48px, 6vw, 80px)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            width: "40px",
            height: "1px",
            background: "var(--accent)",
            opacity: 0.5,
          }}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <span
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "clamp(14px, 1.5vw, 18px)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
          }}
        >
          {meta.label}
        </span>
        <p
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "13px",
            color: "var(--text-tertiary)",
            marginTop: "8px",
            letterSpacing: "0.02em",
          }}
        >
          {meta.description}
        </p>
      </div>

      <BrandCardHorizontal brand={brand} />
    </div>
  );
}

export function PortfolioSection() {
  const precisionBrands = brands.filter((b) => b.sector === "precision-manufacturing");
  const bottomBrands = brands.filter(
    (b) => b.sector === "artisanal-craft" || b.sector === "digital-systems"
  );

  return (
    <section
      id="portfolio"
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
          maxWidth: "1100px",
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Section header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "clamp(48px, 6vw, 80px)",
          }}
        >
          <span
            className="spec-label"
            style={{ display: "block", marginBottom: "16px" }}
          >
            Portfolio
          </span>
          <h2
            style={{
              fontSize: "clamp(24px, 3vw, 36px)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Our Brands
          </h2>
        </div>

        {/* Sector groups */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(48px, 6vw, 80px)" }}>

          {/* Precision Manufacturing — 2 brands */}
          <div data-testid="sector-group">
            <div style={{ marginBottom: "24px" }}>
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "clamp(14px, 1.5vw, 18px)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  fontWeight: 600,
                }}
              >
                {sectorMeta["precision-manufacturing"].label}
              </span>
              <p
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "13px",
                  color: "var(--text-tertiary)",
                  marginTop: "8px",
                  letterSpacing: "0.02em",
                }}
              >
                {sectorMeta["precision-manufacturing"].description}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
                gap: "24px",
              }}
            >
              {precisionBrands.map((brand) => (
                <div key={brand.id}>
                  <BrandCard brand={brand} />
                </div>
              ))}
            </div>
          </div>

          {/* Artisanal Craft + Digital Systems — horizontal cards */}
          {bottomBrands.map((brand) => (
            <SectorGroup key={brand.id} brand={brand} />
          ))}
        </div>
      </div>
    </section>
  );
}
