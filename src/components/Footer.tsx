"use client";

import { Mail, MapPin, ArrowUpRight } from "lucide-react";

const CURRENT_YEAR = 2026;

const footerLinks = [
  { label: "Brands", href: "#portfolio" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export function Footer() {
  return (
    <footer
      id="contact"
      className="section-divider"
      style={{
        padding: "clamp(60px, 8vw, 100px) clamp(24px, 4vw, 48px) clamp(32px, 4vw, 48px)",
        position: "relative",
        background: "var(--base)",
      }}
    >
      <div className="noise-overlay" />

      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Top section */}
        <div
          className="grid gap-12"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
        >
          {/* Brand column */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--text-primary)",
                marginBottom: "20px",
              }}
            >
              Alamo Crafting Forge
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  color: "var(--text-tertiary)",
                }}
              >
                <MapPin size={12} />
                <span>San Antonio, TX</span>
              </div>
              <a
                href="mailto:contact@alamocraftingforge.com"
                className="footer-email"
              >
                <Mail size={12} />
                <span>contact@alamocraftingforge.com</span>
              </a>
            </div>
          </div>

          {/* Navigation column */}
          <div>
            <span className="spec-label" style={{ display: "block", marginBottom: "16px" }}>
              Navigation
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {footerLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="footer-link"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Inquiry CTA column */}
          <div>
            <span className="spec-label" style={{ display: "block", marginBottom: "16px" }}>
              Work With Us
            </span>
            <a
              href="mailto:contact@alamocraftingforge.com"
              className="btn-outline"
            >
              Get in Touch
              <ArrowUpRight size={12} />
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: "clamp(40px, 6vw, 80px)",
            paddingTop: "20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              color: "var(--text-tertiary)",
            }}
          >
            &copy; {CURRENT_YEAR} Alamo Crafting Forge LLC
          </span>
          <span
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              color: "var(--text-tertiary)",
            }}
          >
            Precision Manufacturing & Design
          </span>
        </div>
      </div>
    </footer>
  );
}
