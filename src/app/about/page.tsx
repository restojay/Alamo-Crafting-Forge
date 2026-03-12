import type { Metadata } from "next";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "About",
  description: "Alamo Crafting Forge is a San Antonio-based manufacturing and design studio operating four brands across precision manufacturing, artisanal craft, and digital systems.",
};

export default function AboutPage() {
  return (
    <main>
      <section
        style={{
          padding: "clamp(120px, 12vw, 160px) clamp(24px, 4vw, 48px) clamp(60px, 8vw, 100px)",
          background: "var(--base)",
          position: "relative",
        }}
      >
        <div className="noise-overlay" />
        <div style={{ maxWidth: "720px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          <span className="spec-label" style={{ display: "block", marginBottom: "16px" }}>
            About
          </span>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              marginBottom: "clamp(24px, 3vw, 40px)",
            }}
          >
            About the Forge
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <p style={{ fontSize: "16px", lineHeight: 1.8, color: "var(--text-secondary)" }}>
              Alamo Crafting Forge is a San Antonio-based manufacturing and design
              studio. We operate four specialized brands across precision
              manufacturing, artisanal craft, and digital systems — each with its
              own identity, all held to the same engineering standard.
            </p>

            <p style={{ fontSize: "16px", lineHeight: 1.8, color: "var(--text-secondary)" }}>
              We started with a single 3D printer and an obsession with tolerances.
              Today we run Formlabs SLA and Bambu Lab FDM machines producing
              everything from 25-micron dice masters to carbon-fiber reinforced
              firearm accessories. Every part is designed in Fusion 360, printed
              to spec, and inspected before it ships.
            </p>

            <p style={{ fontSize: "16px", lineHeight: 1.8, color: "var(--text-secondary)" }}>
              The same engineering mindset extends to our digital work. ACF Designs
              builds production websites using Next.js and Tailwind CSS — fast,
              accessible, and maintainable. No templates, no page builders. Just
              clean code deployed on modern infrastructure.
            </p>
          </div>
        </div>
      </section>

      <section
        className="section-divider"
        style={{
          padding: "clamp(60px, 8vw, 100px) clamp(24px, 4vw, 48px)",
          background: "var(--base)",
          position: "relative",
        }}
      >
        <div className="noise-overlay" />
        <div style={{ maxWidth: "720px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          <span className="spec-label" style={{ display: "block", marginBottom: "24px" }}>
            Principles
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {[
              {
                title: "Engineered to Spec",
                body: "Every product has a tolerance, a material spec, and a QA checkpoint. We don't ship \"close enough.\"",
              },
              {
                title: "Vertical Integration",
                body: "Design, manufacturing, and deployment under one roof. No handoffs, no miscommunication, no surprises.",
              },
              {
                title: "Craft at Scale",
                body: "We use industrial tools to produce artisan-quality output. Precision and character aren't mutually exclusive.",
              },
            ].map((v) => (
              <div key={v.title}>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                  }}
                >
                  {v.title}
                </h3>
                <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--text-secondary)" }}>
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
