import Image from "next/image";
import type { Brand } from "@/lib/brands";

interface BrandCardHorizontalProps {
  brand: Brand;
}

export function BrandCardHorizontal({ brand }: BrandCardHorizontalProps) {
  return (
    <article
      data-testid="brand-card"
      className="brand-card brand-card-horizontal"
    >
      {/* Image — left half (stacks top on mobile) */}
      <div
        className="brand-card-horizontal-image"
        style={{
          position: "relative",
          width: "100%",
          minHeight: "280px",
          overflow: "hidden",
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

      {/* Content — right half */}
      <div
        style={{
          padding: "clamp(24px, 3vw, 36px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3
          style={{
            fontSize: "clamp(20px, 2.2vw, 26px)",
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
            marginBottom: "16px",
          }}
        >
          {brand.tagline}
        </p>

        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            marginBottom: "20px",
          }}
        >
          {brand.description}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "24px",
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
          style={{ fontSize: "12px", padding: "8px 20px", alignSelf: "flex-start" }}
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
