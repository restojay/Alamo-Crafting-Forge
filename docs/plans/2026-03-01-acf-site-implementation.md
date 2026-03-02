# ACF Site Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-page showcase site for Alamo Crafting Forge with a quad-quadrant hero, blueprint hover overlays, and external routing to four brand storefronts.

**Architecture:** Next.js App Router single-page app with four anchor sections (Our Brands, The Process, About, Contact). The hero is a 2x2 interactive grid where each quadrant represents a vertical (ACF Dice, Forgepoint, Realmforge, ACF Designs). Hover/tap triggers expansion, blueprint overlay, and CTA. Dark-mode-only with industrial minimalist aesthetic. No backend, no CMS, no e-commerce — pure static site.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion (animations), Geist fonts (via next/font), Vercel deployment.

**Design doc:** `docs/plans/2026-03-01-acf-site-design.md`

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `.gitignore` (update existing)

**Step 1: Initialize Next.js project**

Run from repo root (`C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge`):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults. This will scaffold into the existing directory.

**Step 2: Install additional dependencies**

```bash
npm install framer-motion lucide-react clsx
```

**Step 3: Configure Geist fonts in layout.tsx**

Replace the default font import in `src/app/layout.tsx`:

```tsx
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
```

Install geist font package:

```bash
npm install geist
```

**Step 4: Set up base CSS variables in globals.css**

Replace default globals.css with the ACF color system:

```css
@import "tailwindcss";

:root {
  --base: #121212;
  --secondary: #475569;
  --accent: #F97316;
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --glass-bg: rgba(18, 18, 18, 0.8);
  --glass-border: rgba(71, 85, 105, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: var(--base);
  color: var(--text-primary);
  font-family: var(--font-geist-sans), system-ui, sans-serif;
  overflow-x: hidden;
}

::selection {
  background-color: var(--accent);
  color: var(--base);
}
```

**Step 5: Verify dev server runs**

```bash
npm run dev
```

Expected: App loads at `localhost:3000` with dark background.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, Geist fonts, ACF color system"
```

---

## Task 2: Brand Data & Types

**Files:**
- Create: `src/lib/brands.ts`

**Step 1: Create brand data file**

```ts
export interface Brand {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image: string; // path in /public/brands/
  blueprintMeta: string[]; // technical specs shown on hover
  ctaLabel: string;
  ctaHref: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export const brands: Brand[] = [
  {
    id: "acf-dice",
    name: "ACF Dice",
    tagline: "Precision Resin Dice Masters",
    description: "Custom dice masters printed on Formlabs 4B SLA — collector-grade detail for tabletop gaming.",
    image: "/brands/acf-dice.jpg",
    blueprintMeta: ["Material: UV Resin", "Layer: 25\u03BCm", "Tolerance: \u00B10.05mm"],
    ctaLabel: "Enter Storefront",
    ctaHref: "https://dice.alamocraftingforge.com",
    position: "top-left",
  },
  {
    id: "forgepoint",
    name: "Forgepoint",
    tagline: "Personalized Firearm Accessories",
    description: "Custom-engraved and 3D-printed gun accessories \u2014 grip plugs, backplates, rail covers.",
    image: "/brands/forgepoint.jpg",
    blueprintMeta: ["Material: CF-PETG", "Infill: 100%", "Fitment: \u00B10.1mm"],
    ctaLabel: "Enter Storefront",
    ctaHref: "https://forgepoint.alamocraftingforge.com",
    position: "top-right",
  },
  {
    id: "realmforge",
    name: "Realmforge",
    tagline: "Tabletop Miniatures & Terrain",
    description: "High-detail resin miniatures and modular terrain for D&D, Pathfinder, and wargaming.",
    image: "/brands/realmforge.jpg",
    blueprintMeta: ["Material: Tough 2000", "Layer: 50\u03BCm", "Build: 218\u00D7128mm"],
    ctaLabel: "Enter Storefront",
    ctaHref: "https://realmforge.alamocraftingforge.com",
    position: "bottom-left",
  },
  {
    id: "acf-designs",
    name: "ACF Designs",
    tagline: "Full-Service Web Development",
    description: "Custom websites designed, built, and deployed for small businesses.",
    image: "/brands/acf-designs.jpg",
    blueprintMeta: ["Next.js", "React", "Tailwind CSS", "Vercel"],
    ctaLabel: "View Portfolio",
    ctaHref: "https://designs.alamocraftingforge.com",
    position: "bottom-right",
  },
];
```

**Step 2: Commit**

```bash
git add src/lib/brands.ts
git commit -m "feat: add brand data and types for four ACF verticals"
```

---

## Task 3: Navbar Component

**Files:**
- Create: `src/components/Navbar.tsx`

**Step 1: Build the glassmorphism navbar**

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Our Brands", href: "#brands" },
  { label: "The Process", href: "#process" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b"
      style={{
        backgroundColor: "var(--glass-bg)",
        borderColor: "var(--glass-border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="text-lg font-bold tracking-wider" style={{ color: "var(--text-primary)" }}>
          ACF
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-sm font-medium transition-colors hover:text-[var(--accent)]"
              style={{ color: "var(--text-secondary)" }}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: "var(--text-primary)" }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden border-t px-6 py-4 flex flex-col gap-4"
            style={{
              backgroundColor: "var(--glass-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-sm font-medium text-left transition-colors hover:text-[var(--accent)]"
                style={{ color: "var(--text-secondary)" }}
              >
                {link.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
```

**Step 2: Add Navbar to layout.tsx**

In `src/app/layout.tsx`, import and render `<Navbar />` inside `<body>` above `{children}`.

**Step 3: Verify navbar renders**

```bash
npm run dev
```

Expected: Fixed glassmorphism navbar at top with 4 links on desktop, hamburger on mobile.

**Step 4: Commit**

```bash
git add src/components/Navbar.tsx src/app/layout.tsx
git commit -m "feat: add glassmorphism navbar with smooth scroll anchors"
```

---

## Task 4: Quad-Quadrant Hero (Core)

**Files:**
- Create: `src/components/QuadGrid.tsx`
- Create: `src/components/QuadCard.tsx`
- Create: `public/brands/` (placeholder images)

**Step 1: Create placeholder brand images**

Create `public/brands/` directory. Add four placeholder images (1200x800 dark gradient PNGs) named `acf-dice.jpg`, `forgepoint.jpg`, `realmforge.jpg`, `acf-designs.jpg`. Use solid dark gradients as placeholders — real photography comes later.

Generate placeholders programmatically or use simple dark colored rectangles.

**Step 2: Build the QuadCard component**

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import type { Brand } from "@/lib/brands";

interface QuadCardProps {
  brand: Brand;
  isExpanded: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export function QuadCard({ brand, isExpanded, onHover, onLeave }: QuadCardProps) {
  return (
    <motion.div
      className="relative overflow-hidden cursor-pointer group"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      animate={{
        flex: isExpanded ? 1.5 : 1,
      }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Background image with Ken Burns */}
      <motion.div
        className="absolute inset-0"
        animate={{
          scale: isExpanded ? 1.08 : 1,
        }}
        transition={{ duration: 8, ease: "linear" }}
      >
        <Image
          src={brand.image}
          alt={brand.name}
          fill
          className="object-cover"
          priority
        />
      </motion.div>

      {/* Dark overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: isExpanded
            ? "linear-gradient(135deg, rgba(18,18,18,0.4), rgba(18,18,18,0.7))"
            : "linear-gradient(135deg, rgba(18,18,18,0.5), rgba(18,18,18,0.8))",
        }}
      />

      {/* Blueprint overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isExpanded ? 0.15 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          backgroundImage: `
            linear-gradient(rgba(249,115,22,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end p-8 md:p-10">
        {/* Brand name — always visible */}
        <h2
          className="text-2xl md:text-3xl font-bold tracking-wide"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          {brand.name}
        </h2>

        {/* Tagline — always visible */}
        <p
          className="text-sm mt-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {brand.tagline}
        </p>

        {/* Expanded content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: isExpanded ? 1 : 0,
            y: isExpanded ? 0 : 10,
          }}
          transition={{ duration: 0.3, delay: isExpanded ? 0.15 : 0 }}
          className="mt-4"
        >
          {/* Blueprint metadata */}
          <div className="flex flex-wrap gap-2 mb-4">
            {brand.blueprintMeta.map((meta) => (
              <span
                key={meta}
                className="text-xs px-2 py-1 rounded border"
                style={{
                  fontFamily: "var(--font-geist-mono)",
                  color: "var(--accent)",
                  borderColor: "rgba(249,115,22,0.3)",
                  backgroundColor: "rgba(249,115,22,0.08)",
                }}
              >
                {meta}
              </span>
            ))}
          </div>

          {/* CTA */}
          <a
            href={brand.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all hover:brightness-110"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--base)",
            }}
          >
            {brand.ctaLabel}
            <span aria-hidden="true">&rarr;</span>
          </a>
        </motion.div>
      </div>
    </motion.div>
  );
}
```

**Step 3: Build the QuadGrid container**

```tsx
"use client";

import { useState } from "react";
import { brands } from "@/lib/brands";
import { QuadCard } from "./QuadCard";

export function QuadGrid() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const topRow = brands.filter((b) => b.position.startsWith("top"));
  const bottomRow = brands.filter((b) => b.position.startsWith("bottom"));

  return (
    <section id="brands" className="h-screen w-full flex flex-col">
      {/* Desktop: 2x2 grid */}
      <div className="hidden md:flex flex-col h-full">
        <div className="flex flex-1 min-h-0">
          {topRow.map((brand) => (
            <QuadCard
              key={brand.id}
              brand={brand}
              isExpanded={hoveredId === brand.id}
              onHover={() => setHoveredId(brand.id)}
              onLeave={() => setHoveredId(null)}
            />
          ))}
        </div>
        <div className="flex flex-1 min-h-0">
          {bottomRow.map((brand) => (
            <QuadCard
              key={brand.id}
              brand={brand}
              isExpanded={hoveredId === brand.id}
              onHover={() => setHoveredId(brand.id)}
              onLeave={() => setHoveredId(null)}
            />
          ))}
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden flex flex-col">
        {brands.map((brand) => (
          <div key={brand.id} className="h-[75vh]">
            <QuadCard
              brand={brand}
              isExpanded={hoveredId === brand.id}
              onHover={() => setHoveredId(brand.id)}
              onLeave={() => setHoveredId(null)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 4: Wire into page.tsx**

Replace `src/app/page.tsx` content:

```tsx
import { QuadGrid } from "@/components/QuadGrid";

export default function Home() {
  return (
    <main>
      <QuadGrid />
    </main>
  );
}
```

**Step 5: Verify quad grid renders**

```bash
npm run dev
```

Expected: 2x2 grid filling viewport. Hover expands quadrant, shows blueprint grid overlay, metadata tags, and CTA button. Mobile shows stacked cards.

**Step 6: Commit**

```bash
git add src/components/QuadGrid.tsx src/components/QuadCard.tsx src/app/page.tsx public/brands/
git commit -m "feat: add quad-quadrant hero grid with blueprint overlay and hover expansion"
```

---

## Task 5: The Process Section

**Files:**
- Create: `src/components/ProcessSection.tsx`

**Step 1: Build the process section**

```tsx
import { Layers, Cpu, PenTool, Globe } from "lucide-react";

const capabilities = [
  {
    icon: Layers,
    label: "SLA Resin Printing",
    detail: "Formlabs 4B",
  },
  {
    icon: Cpu,
    label: "FDM Manufacturing",
    detail: "Bambu Lab P1S",
  },
  {
    icon: PenTool,
    label: "CAD Design",
    detail: "Fusion 360 + OpenSCAD",
  },
  {
    icon: Globe,
    label: "Web Development",
    detail: "Next.js + React + Tailwind",
  },
];

export function ProcessSection() {
  return (
    <section id="process" className="py-24 px-6 border-t" style={{ borderColor: "var(--glass-border)" }}>
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">The Process</h2>
        <p className="text-sm mb-16" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-geist-mono)" }}>
          From resin to code — everything we make is engineered to spec.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {capabilities.map((cap) => (
            <div key={cap.label} className="flex flex-col items-center gap-3">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center border"
                style={{
                  borderColor: "rgba(249,115,22,0.3)",
                  backgroundColor: "rgba(249,115,22,0.06)",
                }}
              >
                <cap.icon size={24} style={{ color: "var(--accent)" }} />
              </div>
              <span className="text-sm font-medium">{cap.label}</span>
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-geist-mono)" }}
              >
                {cap.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Add to page.tsx after QuadGrid**

```tsx
import { QuadGrid } from "@/components/QuadGrid";
import { ProcessSection } from "@/components/ProcessSection";

export default function Home() {
  return (
    <main>
      <QuadGrid />
      <ProcessSection />
    </main>
  );
}
```

**Step 3: Verify**

```bash
npm run dev
```

Expected: Process section renders below the quad grid with 4 capability cards in a row.

**Step 4: Commit**

```bash
git add src/components/ProcessSection.tsx src/app/page.tsx
git commit -m "feat: add process section with manufacturing and dev capabilities"
```

---

## Task 6: About Section

**Files:**
- Create: `src/components/AboutSection.tsx`

**Step 1: Build the about section**

```tsx
export function AboutSection() {
  return (
    <section id="about" className="py-24 px-6 border-t" style={{ borderColor: "var(--glass-border)" }}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">About the Forge</h2>
        <p
          className="text-base leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Alamo Crafting Forge is a San Antonio-based manufacturing and design studio.
          We build precision 3D-printed products and custom websites — four brands,
          one standard of quality. Everything we ship is engineered, tested, and made to spec.
        </p>
      </div>
    </section>
  );
}
```

**Step 2: Add to page.tsx**

Import and render `<AboutSection />` after `<ProcessSection />`.

**Step 3: Commit**

```bash
git add src/components/AboutSection.tsx src/app/page.tsx
git commit -m "feat: add about section"
```

---

## Task 7: Contact / Footer Section

**Files:**
- Create: `src/components/Footer.tsx`

**Step 1: Build the footer/contact section**

```tsx
import { Mail, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer id="contact" className="py-16 px-6 border-t" style={{ borderColor: "var(--glass-border)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          {/* Brand */}
          <div>
            <h2 className="text-xl font-bold tracking-wider mb-2">Alamo Crafting Forge</h2>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <MapPin size={14} />
              <span>San Antonio, TX</span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              <Mail size={14} />
              <a
                href="mailto:contact@alamocraftingforge.com"
                className="hover:text-[var(--accent)] transition-colors"
              >
                contact@alamocraftingforge.com
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-8 text-sm" style={{ color: "var(--text-secondary)" }}>
            <a href="#brands" className="hover:text-[var(--accent)] transition-colors">Our Brands</a>
            <a href="#process" className="hover:text-[var(--accent)] transition-colors">The Process</a>
            <a href="#about" className="hover:text-[var(--accent)] transition-colors">About</a>
          </div>
        </div>

        {/* Copyright */}
        <div
          className="mt-12 pt-6 border-t text-center text-xs"
          style={{ borderColor: "var(--glass-border)", color: "var(--secondary)" }}
        >
          &copy; {new Date().getFullYear()} Alamo Crafting Forge LLC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
```

**Step 2: Add to page.tsx**

Import and render `<Footer />` as the last element in `<main>`.

**Step 3: Verify full page flow**

```bash
npm run dev
```

Expected: Full page scrolls through all 4 sections. Nav links smooth-scroll to anchors. Quad grid hover works. Mobile responsive.

**Step 4: Commit**

```bash
git add src/components/Footer.tsx src/app/page.tsx
git commit -m "feat: add footer with contact info and copyright"
```

---

## Task 8: Metadata & SEO

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `public/favicon.ico` (or `src/app/icon.svg`)

**Step 1: Add metadata to layout.tsx**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alamo Crafting Forge — Precision Manufacturing & Design",
  description:
    "San Antonio-based manufacturing and design studio. Precision 3D-printed dice, firearm accessories, tabletop miniatures, and full-service web development.",
  keywords: [
    "3D printing", "custom dice", "firearm accessories", "tabletop miniatures",
    "web development", "San Antonio", "Alamo Crafting Forge",
  ],
  openGraph: {
    title: "Alamo Crafting Forge",
    description: "Precision Manufacturing & Design — San Antonio, TX",
    url: "https://alamocraftingforge.com",
    siteName: "Alamo Crafting Forge",
    type: "website",
  },
};
```

**Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add metadata and OpenGraph tags for SEO"
```

---

## Task 9: Polish & Build Verification

**Files:**
- Modify: various components as needed

**Step 1: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Test production server**

```bash
npm run start
```

Verify: All sections render, nav scrolling works, hover interactions work, mobile responsive, no console errors.

**Step 3: Fix any build issues**

Address TypeScript errors, missing imports, image optimization warnings.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues and polish"
```

---

## Task 10: Vercel Deployment Config

**Files:**
- Create: `vercel.json` (if needed)

**Step 1: Verify Vercel-ready**

The Next.js project should be deployable with zero config. Confirm:
- `next.config.ts` has no custom server settings
- All images use `next/image` or are in `public/`
- No environment variables required

**Step 2: Deploy**

```bash
npx vercel deploy --prod
```

Or connect GitHub repo to Vercel dashboard for auto-deploy.

**Step 3: Configure domain**

Set up `alamocraftingforge.com` in Vercel dashboard with DNS CNAME.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: production deployment configuration"
```

---

## Summary

| Task | Component | Estimated Steps |
|-|-|-|
| 1 | Project scaffold | 6 |
| 2 | Brand data & types | 2 |
| 3 | Navbar | 4 |
| 4 | Quad-quadrant hero | 6 |
| 5 | Process section | 4 |
| 6 | About section | 3 |
| 7 | Footer/contact | 4 |
| 8 | Metadata & SEO | 2 |
| 9 | Polish & build | 4 |
| 10 | Deployment | 4 |

**Total: 10 tasks, 39 steps.**

Tasks 2-3 can run in parallel. Tasks 5-7 can run in parallel. Task 4 is the critical path — the quad grid hero is the core of the site.
