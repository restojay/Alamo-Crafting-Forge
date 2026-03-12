import Image from "next/image";
import type { Brand } from "@/lib/brands";

interface BrandCardProps {
  brand: Brand;
}

export function BrandCard({ brand }: BrandCardProps) {
  return (
    <article
      data-testid="brand-card"
      className="brand-card"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 10",
          overflow: "hidden",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-10%",
            bottom: "-10%",
            left: "-10%",
          }}
        >
          <Image
            src={brand.image}
            alt={brand.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            style={{
              filter: "brightness(0.9) saturate(0.85)",
              transition: "filter 0.5s ease",
            }}
          />
        </div>
        <div className="noise-overlay" />
      </div>

      {/* Content */}
      <div style={{ padding: "clamp(20px, 3vw, 28px)", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3
          style={{
            fontSize: "clamp(18px, 2vw, 22px)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            marginBottom: "4px",
          }}
        >
          {brand.name}
        </h3>

        <p
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "11px",
            letterSpacing: "0.06em",
            color: "var(--text-secondary)",
            marginBottom: "12px",
          }}
        >
          {brand.tagline}
        </p>

        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            marginBottom: "16px",
          }}
        >
          {brand.description}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "20px",
            marginTop: "auto",
          }}
        >
          {brand.blueprintMeta.map((meta) => (
            <span
              key={meta}
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "10px",
                letterSpacing: "0.06em",
                padding: "3px 8px",
                border: "1px solid var(--border-strong)",
                color: "var(--text-tertiary)",
                borderRadius: "1px",
              }}
            >
              {meta}
            </span>
          ))}
        </div>

        <a
          href={`/brands/${brand.slug}`}
          className="btn-accent"
          style={{ fontSize: "12px", padding: "8px 20px" }}
        >
          Learn More
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </a>
      </div>
    </article>
  );
}
