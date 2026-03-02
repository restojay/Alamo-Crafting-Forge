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
        }}
      >
        <span
          className="spec-label"
          style={{ display: "block", textAlign: "center", marginBottom: "16px" }}
        >
          About
        </span>

        <h2
          style={{
            fontSize: "clamp(22px, 2.5vw, 32px)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            textAlign: "center",
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
            textAlign: "center",
            letterSpacing: "0.01em",
          }}
        >
          Alamo Crafting Forge is a San Antonio-based manufacturing and design
          studio. We operate four specialized brands across precision
          manufacturing, artisanal craft, and digital systems — each with its
          own identity, all held to the same engineering standard. From resin
          to code, everything we ship is designed, tested, and made to spec.
        </p>
      </div>
    </section>
  );
}
