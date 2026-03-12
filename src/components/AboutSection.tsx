export function AboutSection() {
  return (
    <section
      id="about"
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
          maxWidth: "720px",
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
          textAlign: "center",
        }}
      >
        <span className="spec-label" style={{ display: "block", marginBottom: "16px" }}>
          About
        </span>

        <h2
          style={{
            fontSize: "clamp(22px, 2.5vw, 32px)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            marginBottom: "24px",
          }}
        >
          About the Forge
        </h2>

        <p
          style={{
            fontSize: "15px",
            lineHeight: 1.8,
            color: "var(--text-secondary)",
            letterSpacing: "0.01em",
            marginBottom: "32px",
          }}
        >
          Alamo Crafting Forge is a San Antonio-based manufacturing and design
          studio. We operate four specialized brands across precision
          manufacturing, artisanal craft, and digital systems — each with its
          own identity, all held to the same engineering standard. From resin
          to code, everything we ship is designed, tested, and made to spec.
        </p>

        <a href="/about" className="btn-outline">
          Learn More About ACF
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </a>
      </div>
    </section>
  );
}
