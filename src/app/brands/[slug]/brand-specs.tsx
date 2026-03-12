import type { Brand } from "@/lib/brands";

export function BrandSpecs({ brand }: { brand: Brand }) {
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
      <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <p
          style={{
            fontSize: "16px",
            lineHeight: 1.8,
            color: "var(--text-secondary)",
            marginBottom: "clamp(40px, 5vw, 64px)",
          }}
        >
          {brand.longDescription}
        </p>

        <div>
          <span className="spec-label" style={{ display: "block", marginBottom: "24px" }}>
            Our Process
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {brand.processSteps.map((step, i) => (
              <div
                key={step.title}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr",
                  gap: "16px",
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "2px",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--accent)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: "4px",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "clamp(40px, 5vw, 64px)", textAlign: "center" }}>
          <a
            href={brand.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent"
            style={{ fontSize: "13px", padding: "12px 32px" }}
          >
            {brand.ctaLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
