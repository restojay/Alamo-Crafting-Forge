"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function subscribeToMotionPref(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getMotionPref() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Hero() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToMotionPref,
    getMotionPref,
    () => true,
  );
  return (
    <section
      id="hero"
      data-testid="hero"
      className=""
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: "var(--base)",
        padding: "clamp(24px, 4vw, 48px)",
        overflow: "hidden",
      }}
    >
      {/* Background image (poster frame / reduced-motion fallback) */}
      <Image
        src="/hero.jpeg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        style={{
          filter: "brightness(0.65) saturate(0.8)",
          zIndex: 0,
        }}
      />

      {/* Background video loop — only rendered after mount + motion allowed */}
      {mounted && !prefersReducedMotion && (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/hero.jpeg"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.65) saturate(0.8)",
            zIndex: 0,
          }}
        >
          <source src="/hero-loop.mp4" type="video/mp4" />
        </video>
      )}

      {/* Steel texture */}
      <div className="steel-texture" />
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(249,115,22,0.08) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          maxWidth: "720px",
        }}
      >
        {/* Logo mark */}
        <div
          className="hero-animate hero-animate-1"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "48px",
            height: "48px",
            border: "1.5px solid var(--accent)",
            borderRadius: "3px",
            marginBottom: "32px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "16px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "var(--accent)",
            }}
          >
            ACF
          </span>
        </div>

        {/* Headline */}
        <h1
          className="hero-animate hero-animate-2"
          style={{
            fontSize: "clamp(28px, 4vw, 52px)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "var(--text-primary)",
            marginBottom: "16px",
          }}
        >
          Alamo Crafting Forge
        </h1>

        {/* Subline */}
        <p
          className="hero-animate hero-animate-3"
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "clamp(12px, 1.2vw, 14px)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-primary)",
            marginBottom: "12px",
          }}
        >
          San Antonio, TX
        </p>

        <p
          className="hero-animate hero-animate-4"
          style={{
            fontSize: "clamp(14px, 1.5vw, 17px)",
            lineHeight: 1.7,
            color: "var(--text-primary)",
            maxWidth: "540px",
            margin: "0 auto 32px",
          }}
        >
          Precision manufacturing and design studio — from resin to code,
          everything we make is engineered to spec.
        </p>

        {/* Stats row */}
        <div
          className="hero-animate hero-animate-5"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "clamp(24px, 4vw, 48px)",
            marginBottom: "40px",
          }}
        >
          {[
            { value: "4", label: "Brands" },
            { value: "25μm", label: "Precision" },
            { value: "1", label: "Standard" },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "var(--accent)",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                className="spec-label"
                style={{ marginTop: "6px", fontSize: "10px", color: "var(--text-primary)" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div
          className="hero-animate hero-animate-6"
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a href="#portfolio" className="btn-accent">
            Explore Our Brands
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </a>
          <a href="#contact" className="btn-outline">
            Get in Touch
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
      </div>

      {/* Scroll indicator */}
      <div
        className="scroll-indicator hero-animate hero-animate-7"
        style={{
          position: "absolute",
          bottom: "32px",
          left: "50%",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: "1px",
            height: "40px",
            background:
              "linear-gradient(to bottom, var(--accent), transparent)",
          }}
        />
      </div>
    </section>
  );
}
