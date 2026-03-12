import type { Metadata } from "next";
import { ContactForm } from "./contact-form";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Alamo Crafting Forge. We build precision 3D-printed parts, artisan dice, and custom websites.",
};

export default function ContactPage() {
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
        <div style={{ maxWidth: "640px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          <span className="spec-label" style={{ display: "block", marginBottom: "16px" }}>
            Contact
          </span>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              marginBottom: "12px",
            }}
          >
            Get in Touch
          </h1>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              marginBottom: "clamp(32px, 4vw, 48px)",
            }}
          >
            Have a project in mind or want to learn more about our capabilities?
            Send us a message and we'll respond within 1-2 business days.
          </p>

          <ContactForm />
        </div>
      </section>
      <Footer />
    </main>
  );
}
