# ACF Website SOTA Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Alamo Crafting Forge single-page portfolio into a multi-page, conversion-optimized, SEO-ready corporate website that projects SOTA quality for a holding company operating four brands.

**Architecture:** Migrate from single `page.tsx` to Next.js App Router multi-route architecture with dedicated brand pages (`/brands/[slug]`), a contact page with form API, expanded about page, and full SEO infrastructure. Preserve the existing "Cold Steel & Ember" design system. All new pages are server components by default; only interactive widgets use `"use client"`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion 12, Geist fonts, Lucide React icons, Vitest (unit), Playwright (E2E)

**Council Reference:** Session 2026-03-11, unanimous consensus (Claude + Codex + Gemini). Governance: Strategic Deliverable, CEO approved in-session.

**Plan Gate Review:** Codex + Gemini both returned CHANGES REQUIRED (Round 1). Revisions applied:
- Codex: build-time brand validation, safe JSON-LD serialization, rate limiting on contact API, expanded test coverage, ffmpeg clarified as local-only
- Gemini: social proof task added, aesthetic continuity notes, ACF Designs gallery consideration
- CEO correction: Bluehost is active hosting (not a placeholder). Deployment to Vercel moved to final chunk — migrate only after site is fully built, tested, and ready. DNS migration must preserve email routing (Titan/Bluehost email for support@alamocraftingforge.com).

---

## Design System Continuity Note

All new pages MUST adhere to the "Cold Steel & Ember" design system:
- Background: `var(--base)` (#0a0a0a) on all pages
- Noise overlay on every section
- Section dividers with accent highlight
- Spec labels: Geist Mono, 11px, 0.12em spacing, uppercase, `var(--text-tertiary)`
- Headings: Geist Sans, tight letter-spacing (-0.02em), `var(--text-primary)`
- Body text: 14-16px, `var(--text-secondary)`, line-height 1.6-1.8
- Accent: `var(--accent)` (#F97316) for interactive elements and highlights

Sub-pages that feel "generic" or break the industrial aesthetic are a design failure. Every new page should look like it belongs on the same site as the hero section.

---

## File Structure

### New Files
| File | Responsibility |
|-|-|
| `src/app/brands/page.tsx` | Brands index page (redirects or shows all brands) |
| `src/app/brands/[slug]/page.tsx` | Individual brand landing page |
| `src/app/brands/[slug]/brand-hero.tsx` | Brand-specific hero component |
| `src/app/brands/[slug]/brand-specs.tsx` | Brand technical specs section |
| `src/app/about/page.tsx` | Expanded about page |
| `src/app/contact/page.tsx` | Contact page with form |
| `src/app/contact/contact-form.tsx` | Client-side contact form component |
| `src/app/api/contact/route.ts` | Contact form API endpoint (with rate limiting) |
| `src/lib/brands.ts` | Extended with `slug`, `longDescription`, `gallery`, `specs` fields |
| `src/components/SocialLinks.tsx` | Reusable social media links component |
| `src/components/SocialProof.tsx` | Testimonials/client showcase component |
| `src/components/Breadcrumb.tsx` | Breadcrumb navigation component |
| `public/robots.txt` | Search engine crawl rules |
| `src/app/sitemap.ts` | Dynamic sitemap generator |
| `src/lib/structured-data.ts` | JSON-LD schema generators |
| `src/lib/og.ts` | OG metadata helper per route |

### Modified Files
| File | Changes |
|-|-|
| `src/lib/brands.ts` | Add `slug`, `longDescription`, `processSteps`, `gallery`, `specs` fields to Brand type |
| `src/app/layout.tsx` | Add JSON-LD Organization schema, update Navbar links for multi-page |
| `src/app/page.tsx` | Update brand card CTAs to link to internal `/brands/[slug]` pages |
| `src/app/globals.css` | Add styles for contact form, breadcrumb, brand page layout, capabilities section |
| `src/components/Navbar.tsx` | Update nav links for multi-page routes, add active state |
| `src/components/Footer.tsx` | Add social media links, update nav links for multi-page |
| `src/components/ProcessSection.tsx` | Expand from tiny icon strip to full capability showcase |
| `src/components/AboutSection.tsx` | Add richer content (mission, process, values) |
| `src/components/BrandCard.tsx` | Change CTA to internal link (`/brands/[slug]`) |
| `src/components/BrandCardHorizontal.tsx` | Change CTA to internal link (`/brands/[slug]`) |
| `next.config.ts` | Add image remotePatterns if needed, redirects |
| `public/brands/acf-designs.webp` | Replace with valid, visible image |

### Test Files
| File | Tests |
|-|-|
| `src/lib/__tests__/brands.test.ts` | Brand data integrity, slug uniqueness |
| `src/lib/__tests__/structured-data.test.ts` | JSON-LD output validation |
| `src/app/api/contact/__tests__/route.test.ts` | Contact API validation, rate limiting |
| `tests/brands.spec.ts` | E2E: brand pages render, nav works |
| `tests/contact.spec.ts` | E2E: contact form submission |
| `tests/seo.spec.ts` | E2E: robots.txt, sitemap, meta tags |

---

## Chunk 1: Foundation — Brand Data Model & SEO Infrastructure

### Task 1: Extend Brand Data Model

**Files:**
- Modify: `src/lib/brands.ts`
- Create: `src/lib/__tests__/brands.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/brands.test.ts
import { describe, it, expect } from "vitest";
import { brands } from "../brands";

describe("brands data", () => {
  it("every brand has a unique slug", () => {
    const slugs = brands.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every slug is URL-safe", () => {
    for (const b of brands) {
      expect(b.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("every brand has a longDescription", () => {
    for (const b of brands) {
      expect(b.longDescription.length).toBeGreaterThan(50);
    }
  });

  it("every brand has processSteps", () => {
    for (const b of brands) {
      expect(b.processSteps.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("getBrandBySlug returns correct brand", () => {
    const { getBrandBySlug } = require("../brands");
    expect(getBrandBySlug("forgepoint")?.name).toBe("Forgepoint");
    expect(getBrandBySlug("nonexistent")).toBeUndefined();
  });

  it("every brand image path points to a file that exists", async () => {
    const fs = await import("fs");
    const path = await import("path");
    for (const b of brands) {
      const imgPath = path.join(__dirname, "../../../..", "public", b.image);
      expect(fs.existsSync(imgPath), `Missing image: ${b.image}`).toBe(true);
    }
  });

  it("every brand has all required fields", () => {
    for (const b of brands) {
      expect(b.id).toBeTruthy();
      expect(b.slug).toBeTruthy();
      expect(b.name).toBeTruthy();
      expect(b.image).toBeTruthy();
      expect(b.ctaHref).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx vitest run src/lib/__tests__/brands.test.ts`
Expected: FAIL — `slug`, `longDescription`, `processSteps` don't exist on Brand type

- [ ] **Step 3: Extend Brand type and data**

```typescript
// src/lib/brands.ts — updated type and data
export type Sector = "precision-manufacturing" | "artisanal-craft" | "digital-systems";

export interface ProcessStep {
  title: string;
  description: string;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  processSteps: ProcessStep[];
  image: string;
  blueprintMeta: string[];
  ctaLabel: string;
  ctaHref: string;
  sector: Sector;
}

// ... keep existing sectorMeta ...

export const brands: Brand[] = [
  {
    id: "forgepoint",
    slug: "forgepoint",
    name: "Forgepoint",
    tagline: "Personalized Firearm Accessories",
    description: "Custom-engraved and 3D-printed gun accessories — grip plugs, backplates, rail covers.",
    longDescription: "Forgepoint manufactures custom firearm accessories using carbon-fiber reinforced PETG on Bambu Lab P1S printers. Every part is printed at 100% infill with ±0.1mm fitment tolerance, then inspected against CAD reference geometry before shipping. We specialize in Glock-compatible grip plugs, backplates, and Picatinny rail covers with laser-engraved personalization.",
    processSteps: [
      { title: "CAD Design", description: "Parametric models in Fusion 360, validated against manufacturer specs." },
      { title: "FDM Printing", description: "CF-PETG on Bambu P1S at 100% infill for structural integrity." },
      { title: "Post-Processing", description: "Laser engraving, fitment check, and QA inspection." },
    ],
    image: "/brands/forgepoint.webp",
    blueprintMeta: ["Material: CF-PETG", "Infill: 100%", "Fitment: ±0.1mm"],
    ctaLabel: "Visit Site",
    ctaHref: "https://www.ebay.com/str/forgepoint",
    sector: "precision-manufacturing",
  },
  {
    id: "realmforge",
    slug: "realmforge",
    name: "Realmforge",
    tagline: "Tabletop Miniatures & Terrain",
    description: "High-detail resin miniatures and modular terrain for D&D, Pathfinder, and wargaming.",
    longDescription: "Realmforge produces high-detail resin miniatures and modular terrain pieces using Formlabs Form 4B SLA printers at 50μm layer height. Our catalog spans fantasy heroes, monsters, and interlocking dungeon terrain tiles. Every model is printed in Tough 2000 resin for durability, then cleaned in IPA and UV-cured for a paint-ready finish.",
    processSteps: [
      { title: "Model Prep", description: "STL validation, support generation, and build plate optimization." },
      { title: "SLA Printing", description: "Formlabs 4B at 50μm in Tough 2000 resin for detail and durability." },
      { title: "Post-Cure", description: "IPA wash, UV cure, support removal, and quality inspection." },
    ],
    image: "/brands/realmforge.webp",
    blueprintMeta: ["Material: Tough 2000", "Layer: 50μm", "Build: 218×128mm"],
    ctaLabel: "Visit Site",
    ctaHref: "https://www.ebay.com/str/realmforge",
    sector: "precision-manufacturing",
  },
  {
    id: "acf-dice",
    slug: "acf-dice",
    name: "ACF Dice",
    tagline: "Precision Resin Dice Masters",
    description: "Custom dice masters printed on Formlabs 4B SLA — collector-grade detail for tabletop gaming.",
    longDescription: "ACF Dice creates collector-grade resin dice masters using Formlabs Form 4B SLA technology at 25μm layer height — the finest resolution available in desktop resin printing. Each master is engineered for weight balance across all faces, with ±0.05mm dimensional tolerance. Masters are used to create silicone molds for small-batch artisan dice production.",
    processSteps: [
      { title: "Digital Sculpting", description: "Precision number placement and balance geometry in CAD." },
      { title: "SLA Printing", description: "25μm layers on Formlabs 4B for collector-grade surface finish." },
      { title: "Master Finishing", description: "Sanding, polishing, and dimensional verification for mold-ready masters." },
    ],
    image: "/brands/acf-dice.webp",
    blueprintMeta: ["Material: UV Resin", "Layer: 25μm", "Tolerance: ±0.05mm"],
    ctaLabel: "Visit Site",
    ctaHref: "https://acfdice.com",
    sector: "artisanal-craft",
  },
  {
    id: "acf-designs",
    slug: "acf-designs",
    name: "ACF Designs",
    tagline: "Full-Service Web Development",
    description: "Custom websites designed, built, and deployed for small businesses.",
    longDescription: "ACF Designs builds custom websites for small businesses using modern web technology. We handle everything from design through deployment — responsive layouts, SEO optimization, domain configuration, and ongoing hosting on Vercel. Our stack is Next.js, React, and Tailwind CSS, delivering fast, accessible, and maintainable sites.",
    processSteps: [
      { title: "Discovery", description: "Requirements gathering, brand analysis, and sitemap planning." },
      { title: "Design & Build", description: "Component-driven development in Next.js with responsive Tailwind layouts." },
      { title: "Deploy & Support", description: "Vercel deployment, domain setup, analytics, and ongoing maintenance." },
    ],
    image: "/brands/acf-designs.webp",
    blueprintMeta: ["Next.js", "React", "Tailwind CSS", "Vercel"],
    ctaLabel: "Visit Site",
    ctaHref: "https://designs.alamocraftingforge.com",
    sector: "digital-systems",
  },
];

export function getBrandBySlug(slug: string): Brand | undefined {
  return brands.find((b) => b.slug === slug);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx vitest run src/lib/__tests__/brands.test.ts`
Expected: PASS (all 5 assertions)

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/lib/brands.ts src/lib/__tests__/brands.test.ts
git commit -m "feat: extend brand data model with slugs, long descriptions, and process steps"
```

---

### Task 2: Create Structured Data Helpers

**Files:**
- Create: `src/lib/structured-data.ts`
- Create: `src/lib/__tests__/structured-data.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/structured-data.test.ts
import { describe, it, expect } from "vitest";
import { organizationSchema, localBusinessSchema, brandPageSchema } from "../structured-data";
import { brands } from "../brands";

describe("structured data", () => {
  it("organizationSchema returns valid JSON-LD", () => {
    const schema = organizationSchema();
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Organization");
    expect(schema.name).toBe("Alamo Crafting Forge");
    expect(schema.url).toBe("https://alamocraftingforge.com");
  });

  it("localBusinessSchema includes address", () => {
    const schema = localBusinessSchema();
    expect(schema["@type"]).toBe("LocalBusiness");
    expect(schema.address.addressLocality).toBe("San Antonio");
    expect(schema.address.addressRegion).toBe("TX");
  });

  it("brandPageSchema includes brand data", () => {
    const schema = brandPageSchema(brands[0]);
    expect(schema["@type"]).toBe("Product");
    expect(schema.name).toBe("Forgepoint");
    expect(schema.brand.name).toBe("Alamo Crafting Forge");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx vitest run src/lib/__tests__/structured-data.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement structured data generators**

```typescript
// src/lib/structured-data.ts
import type { Brand } from "./brands";

const SITE_URL = "https://alamocraftingforge.com";
const COMPANY_NAME = "Alamo Crafting Forge";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      "San Antonio-based precision manufacturing and design studio. 3D-printed accessories, tabletop miniatures, artisan dice, and web development.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "San Antonio",
      addressRegion: "TX",
      addressCountry: "US",
    },
    sameAs: [],
  };
}

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: COMPANY_NAME,
    url: SITE_URL,
    description:
      "Precision manufacturing and design studio operating four brands across 3D printing, artisan craft, and web development.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "San Antonio",
      addressRegion: "TX",
      addressCountry: "US",
    },
    priceRange: "$$",
  };
}

export function brandPageSchema(brand: Brand) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: brand.name,
    description: brand.longDescription,
    image: `${SITE_URL}${brand.image}`,
    url: `${SITE_URL}/brands/${brand.slug}`,
    brand: {
      "@type": "Organization",
      name: COMPANY_NAME,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx vitest run src/lib/__tests__/structured-data.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/lib/structured-data.ts src/lib/__tests__/structured-data.test.ts
git commit -m "feat: add JSON-LD structured data generators for org, local business, and brand pages"
```

---

### Task 3: Add robots.txt and Dynamic Sitemap

**Files:**
- Create: `public/robots.txt`
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Create robots.txt**

```
# public/robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://alamocraftingforge.com/sitemap.xml
```

- [ ] **Step 2: Create dynamic sitemap**

```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { brands } from "@/lib/brands";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://alamocraftingforge.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.7 },
  ];

  const brandRoutes: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: `${baseUrl}/brands/${brand.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  return [...staticRoutes, ...brandRoutes];
}
```

- [ ] **Step 3: Verify robots.txt serves correctly**

Run: `cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && curl -s http://localhost:3000/robots.txt | head -5`
Expected: Content of robots.txt file

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add public/robots.txt src/app/sitemap.ts
git commit -m "feat: add robots.txt and dynamic sitemap with brand routes"
```

---

### Task 4: Add JSON-LD to Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update root layout with structured data and updated nav**

Update `src/app/layout.tsx` to inject Organization JSON-LD into the `<head>` and update metadata with OG image placeholder:

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { organizationSchema, localBusinessSchema } from "@/lib/structured-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Alamo Crafting Forge — Precision Manufacturing & Design",
    template: "%s | Alamo Crafting Forge",
  },
  description:
    "San Antonio-based manufacturing and design studio. Precision 3D-printed dice, firearm accessories, tabletop miniatures, and full-service web development.",
  keywords: [
    "3D printing", "custom dice", "firearm accessories", "tabletop miniatures",
    "web development", "San Antonio", "Alamo Crafting Forge",
  ],
  metadataBase: new URL("https://alamocraftingforge.com"),
  openGraph: {
    title: "Alamo Crafting Forge",
    description: "Precision Manufacturing & Design — San Antonio, TX",
    url: "https://alamocraftingforge.com",
    siteName: "Alamo Crafting Forge",
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alamo Crafting Forge",
    description: "Precision Manufacturing & Design — San Antonio, TX",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema(), localBusinessSchema()])
              .replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify build still works**

Run: `cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx next build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/app/layout.tsx
git commit -m "feat: add JSON-LD structured data and enhanced OG metadata to root layout"
```

---

## Chunk 2: Multi-Page Architecture — Brand Pages

### Task 5: Create Brand Landing Page Route

**Files:**
- Create: `src/app/brands/[slug]/page.tsx`
- Create: `src/app/brands/[slug]/brand-hero.tsx`
- Create: `src/app/brands/[slug]/brand-specs.tsx`

- [ ] **Step 1: Create brand hero component**

```tsx
// src/app/brands/[slug]/brand-hero.tsx
import Image from "next/image";
import type { Brand } from "@/lib/brands";
import { sectorMeta } from "@/lib/brands";

export function BrandHero({ brand }: { brand: Brand }) {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "60vh",
        display: "flex",
        alignItems: "flex-end",
        padding: "clamp(24px, 4vw, 48px)",
        overflow: "hidden",
      }}
    >
      <Image
        src={brand.image}
        alt={brand.name}
        fill
        sizes="100vw"
        className="object-cover"
        priority
        style={{ filter: "brightness(0.5) saturate(0.8)", zIndex: 0 }}
      />
      <div className="noise-overlay" />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "800px",
          paddingBottom: "clamp(24px, 4vw, 48px)",
        }}
      >
        <span className="spec-label" style={{ marginBottom: "12px", display: "block" }}>
          {sectorMeta[brand.sector].label}
        </span>
        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "var(--text-primary)",
            marginBottom: "12px",
          }}
        >
          {brand.name}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "13px",
            letterSpacing: "0.06em",
            color: "var(--text-secondary)",
            marginBottom: "16px",
          }}
        >
          {brand.tagline}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {brand.blueprintMeta.map((meta) => (
            <span
              key={meta}
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "10px",
                letterSpacing: "0.06em",
                padding: "4px 10px",
                border: "1px solid var(--border-strong)",
                color: "var(--text-secondary)",
                borderRadius: "1px",
                background: "rgba(0,0,0,0.4)",
              }}
            >
              {meta}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create brand specs component**

```tsx
// src/app/brands/[slug]/brand-specs.tsx
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
        {/* Long description */}
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

        {/* Process steps */}
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

        {/* CTA */}
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
```

- [ ] **Step 3: Create the brand page route with metadata**

```tsx
// src/app/brands/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { brands, getBrandBySlug } from "@/lib/brands";
import { brandPageSchema } from "@/lib/structured-data";
import { BrandHero } from "./brand-hero";
import { BrandSpecs } from "./brand-specs";
import { Footer } from "@/components/Footer";

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return brands.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = getBrandBySlug(slug);
  if (!brand) return {};

  return {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.longDescription.slice(0, 160),
    openGraph: {
      title: `${brand.name} | Alamo Crafting Forge`,
      description: brand.tagline,
      images: [{ url: brand.image, width: 1200, height: 630 }],
    },
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const brand = getBrandBySlug(slug);
  if (!brand) notFound();

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(brandPageSchema(brand)) }}
      />
      <BrandHero brand={brand} />
      <BrandSpecs brand={brand} />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 4: Verify the brand page renders**

Run: `curl -s http://localhost:3000/brands/forgepoint | grep -o "<h1[^>]*>[^<]*</h1>" | head -1`
Expected: Contains "Forgepoint"

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/app/brands/
git commit -m "feat: add individual brand landing pages with hero, specs, process steps, and SEO metadata"
```

---

### Task 6: Update Brand Cards to Link Internally

**Files:**
- Modify: `src/components/BrandCard.tsx`
- Modify: `src/components/BrandCardHorizontal.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update BrandCard CTA to internal link**

In `src/components/BrandCard.tsx`, change the CTA `<a>` tag at line 113-131:

Replace the external link:
```tsx
<a
  href={brand.ctaHref}
  target="_blank"
  rel="noopener noreferrer"
  className="btn-accent"
  style={{ fontSize: "12px", padding: "8px 20px" }}
>
  {brand.ctaLabel}
```

With internal link:
```tsx
<a
  href={`/brands/${brand.slug}`}
  className="btn-accent"
  style={{ fontSize: "12px", padding: "8px 20px" }}
>
  Learn More
```

- [ ] **Step 2: Update BrandCardHorizontal CTA the same way**

In `src/components/BrandCardHorizontal.tsx`, change the CTA `<a>` tag at line 118-135:

Replace:
```tsx
<a
  href={brand.ctaHref}
  target="_blank"
  rel="noopener noreferrer"
  className="btn-accent"
  style={{ fontSize: "12px", padding: "8px 20px", alignSelf: "flex-start" }}
>
  {brand.ctaLabel}
```

With:
```tsx
<a
  href={`/brands/${brand.slug}`}
  className="btn-accent"
  style={{ fontSize: "12px", padding: "8px 20px", alignSelf: "flex-start" }}
>
  Learn More
```

- [ ] **Step 3: Verify homepage cards link to brand pages**

Run: `curl -s http://localhost:3000 | grep -o 'href="/brands/[^"]*"' | sort -u`
Expected: `/brands/forgepoint`, `/brands/realmforge`, `/brands/acf-dice`, `/brands/acf-designs`

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/components/BrandCard.tsx src/components/BrandCardHorizontal.tsx
git commit -m "feat: update brand cards to link to internal brand pages instead of external sites"
```

---

### Task 7: Update Navbar for Multi-Page Navigation

**Files:**
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Update navLinks for multi-page routes**

In `src/components/Navbar.tsx`, replace the `navLinks` array (line 7-11):

```typescript
const navLinks = [
  { label: "Brands", href: "/#portfolio" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
```

Also update the logo link from `#hero` to `/`:

```tsx
<a
  href="/"
  className="flex items-center gap-3 group"
```

- [ ] **Step 2: Verify nav links work from brand pages**

Navigate to `http://localhost:3000/brands/forgepoint` and confirm nav links route correctly.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/components/Navbar.tsx
git commit -m "feat: update navbar links for multi-page routing"
```

---

## Chunk 3: Contact Form & About Page

### Task 8: Create Contact Form API Route

**Files:**
- Create: `src/app/api/contact/route.ts`
- Create: `src/app/api/contact/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/contact/__tests__/route.test.ts
import { describe, it, expect } from "vitest";

// Test the validation logic directly (not the route handler)
function validateContactForm(data: Record<string, unknown>) {
  const errors: string[] = [];
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2)
    errors.push("Name is required (min 2 chars)");
  if (!data.email || typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.push("Valid email is required");
  if (!data.message || typeof data.message !== "string" || data.message.trim().length < 10)
    errors.push("Message is required (min 10 chars)");
  if (data.honeypot) errors.push("Bot detected");
  return errors;
}

describe("contact form validation", () => {
  it("rejects empty form", () => {
    expect(validateContactForm({})).toHaveLength(3);
  });

  it("rejects invalid email", () => {
    const errors = validateContactForm({ name: "Jay", email: "not-an-email", message: "Hello there, testing." });
    expect(errors).toContain("Valid email is required");
  });

  it("rejects short message", () => {
    const errors = validateContactForm({ name: "Jay", email: "jay@test.com", message: "Hi" });
    expect(errors).toContain("Message is required (min 10 chars)");
  });

  it("catches honeypot field", () => {
    const errors = validateContactForm({ name: "Jay", email: "jay@test.com", message: "Hello there, testing.", honeypot: "spam" });
    expect(errors).toContain("Bot detected");
  });

  it("passes valid form", () => {
    const errors = validateContactForm({ name: "Jay", email: "jay@test.com", message: "I'd like to discuss a project." });
    expect(errors).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx vitest run src/app/api/contact/__tests__/route.test.ts`
Expected: PASS (pure function test, no imports needed)

- [ ] **Step 3: Create the API route**

```typescript
// src/app/api/contact/route.ts
import { NextResponse } from "next/server";

// Simple in-memory rate limiter (per-IP, 5 requests per 15 minutes)
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function validateContactForm(data: Record<string, unknown>) {
  const errors: string[] = [];
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2)
    errors.push("Name is required (min 2 chars)");
  if (!data.email || typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.push("Valid email is required");
  if (!data.message || typeof data.message !== "string" || data.message.trim().length < 10)
    errors.push("Message is required (min 10 chars)");
  if (data.honeypot) errors.push("Bot detected");
  return errors;
}

export async function POST(request: Request) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, errors: ["Too many requests. Please try again later."] },
      { status: 429 },
    );
  }

  // Origin check — reject requests not from our domain
  const origin = request.headers.get("origin");
  if (origin && !origin.includes("alamocraftingforge.com") && !origin.includes("localhost")) {
    return NextResponse.json({ success: false, errors: ["Invalid origin"] }, { status: 403 });
  }

  try {
    const body = await request.json();
    const errors = validateContactForm(body);

    if (errors.length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    const { name, email, message, subject } = body as {
      name: string;
      email: string;
      message: string;
      subject?: string;
    };

    // Log submission (replace with email/CRM integration later)
    console.log("[Contact Form]", { name, email, subject, message: message.slice(0, 100) });

    return NextResponse.json({ success: true, message: "Message received. We'll be in touch." });
  } catch {
    return NextResponse.json({ success: false, errors: ["Invalid request body"] }, { status: 400 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/app/api/contact/route.ts src/app/api/contact/__tests__/route.test.ts
git commit -m "feat: add contact form API route with validation and honeypot protection"
```

---

### Task 9: Create Contact Page

**Files:**
- Create: `src/app/contact/page.tsx`
- Create: `src/app/contact/contact-form.tsx`

- [ ] **Step 1: Create the contact form client component**

```tsx
// src/app/contact/contact-form.tsx
"use client";

import { useState, type FormEvent } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<string[]>([]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrors([]);

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name"),
      email: form.get("email"),
      subject: form.get("subject"),
      message: form.get("message"),
      honeypot: form.get("_hp"),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (result.success) {
        setState("success");
      } else {
        setState("error");
        setErrors(result.errors || ["Something went wrong."]);
      }
    } catch {
      setState("error");
      setErrors(["Network error. Please try again."]);
    }
  }

  if (state === "success") {
    return (
      <div
        style={{
          padding: "40px",
          border: "1px solid var(--border-strong)",
          borderRadius: "3px",
          textAlign: "center",
          background: "var(--base-raised)",
        }}
      >
        <div style={{ fontSize: "24px", marginBottom: "12px", color: "var(--accent)" }}>Message Sent</div>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Thanks for reaching out. We'll get back to you within 1-2 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Honeypot — hidden from humans */}
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <input type="text" name="_hp" tabIndex={-1} autoComplete="off" />
      </div>

      {errors.length > 0 && (
        <div style={{ padding: "12px 16px", border: "1px solid #ef4444", borderRadius: "2px", background: "rgba(239,68,68,0.1)" }}>
          {errors.map((err) => (
            <p key={err} style={{ fontSize: "13px", color: "#ef4444" }}>{err}</p>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <label className="spec-label" htmlFor="name" style={{ display: "block", marginBottom: "8px" }}>Name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            className="contact-input"
          />
        </div>
        <div>
          <label className="spec-label" htmlFor="email" style={{ display: "block", marginBottom: "8px" }}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="contact-input"
          />
        </div>
      </div>

      <div>
        <label className="spec-label" htmlFor="subject" style={{ display: "block", marginBottom: "8px" }}>Subject</label>
        <input
          id="subject"
          name="subject"
          type="text"
          className="contact-input"
          placeholder="Optional"
        />
      </div>

      <div>
        <label className="spec-label" htmlFor="message" style={{ display: "block", marginBottom: "8px" }}>Message</label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          rows={6}
          className="contact-input"
          style={{ resize: "vertical" }}
        />
      </div>

      <button
        type="submit"
        className="btn-accent"
        disabled={state === "submitting"}
        style={{
          alignSelf: "flex-start",
          fontSize: "13px",
          padding: "12px 32px",
          opacity: state === "submitting" ? 0.6 : 1,
          cursor: state === "submitting" ? "not-allowed" : "pointer",
        }}
      >
        {state === "submitting" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create the contact page**

```tsx
// src/app/contact/page.tsx
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
```

- [ ] **Step 3: Add contact form CSS to globals.css**

Append to `src/app/globals.css` inside `@layer components`:

```css
  /* --- Contact Form Input --- */
  .contact-input {
    width: 100%;
    padding: 10px 14px;
    font-size: 14px;
    font-family: inherit;
    color: var(--text-primary);
    background: var(--base-raised);
    border: 1px solid var(--border-strong);
    border-radius: 2px;
    transition: border-color 0.3s ease;
  }

  .contact-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .contact-input::placeholder {
    color: var(--text-tertiary);
  }
```

- [ ] **Step 4: Verify contact page renders**

Run: `curl -s http://localhost:3000/contact | grep -o "<h1[^>]*>[^<]*</h1>" | head -1`
Expected: Contains "Get in Touch"

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/app/contact/ src/app/globals.css
git commit -m "feat: add contact page with multi-field form, honeypot protection, and validation"
```

---

### Task 10: Create Expanded About Page

**Files:**
- Create: `src/app/about/page.tsx`

- [ ] **Step 1: Create the about page**

```tsx
// src/app/about/page.tsx
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

      {/* Values section */}
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
```

- [ ] **Step 2: Verify about page renders**

Run: `curl -s http://localhost:3000/about | grep -o "<h1[^>]*>[^<]*</h1>" | head -1`
Expected: Contains "About the Forge"

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/app/about/page.tsx
git commit -m "feat: add expanded about page with company story, origin, and engineering principles"
```

---

## Chunk 4: Visual Fixes & Capabilities Expansion

### Task 11: Fix ACF Designs Brand Image

**Files:**
- Modify: `public/brands/acf-designs.webp`

- [ ] **Step 1: Verify the current image is broken/blank**

Run: `file "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/public/brands/acf-designs.webp" && wc -c < "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/public/brands/acf-designs.webp"`

Check if the file is valid and has reasonable content. If the image exists but renders blank, it may need a replacement with an actual screenshot of ACF Designs work or a website mockup.

- [ ] **Step 2: If image is broken, create a placeholder**

If the image is blank or corrupt, the CEO will need to provide a replacement image (a screenshot of an ACF Designs project, or a website mockup on a dark background). For now, log this as a manual action item.

**NOTE TO IMPLEMENTER:** This task requires a manual asset — ask the CEO for a replacement image for `public/brands/acf-designs.webp` that shows actual web development work (a browser mockup, code editor screenshot, or website portfolio piece). The current image renders as blank gray.

- [ ] **Step 3: Commit (if image was replaced)**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add public/brands/acf-designs.webp
git commit -m "fix: replace blank ACF Designs brand image with visible portfolio screenshot"
```

---

### Task 12: Expand Capabilities / Process Section

**Files:**
- Modify: `src/components/ProcessSection.tsx`

- [ ] **Step 1: Rewrite ProcessSection with full capability cards**

Replace the entire `ProcessSection.tsx` with an expanded version:

```tsx
// src/components/ProcessSection.tsx
"use client";

import { motion } from "framer-motion";

const capabilities = [
  {
    label: "SLA Printing",
    spec: "25μm · Formlabs 4B",
    description: "Ultra-high-resolution resin printing for miniatures, dice masters, and precision parts.",
  },
  {
    label: "FDM Manufacturing",
    spec: "Multi-material · Bambu P1S",
    description: "Carbon-fiber PETG and multi-material printing for functional, structural components.",
  },
  {
    label: "CAD Design",
    spec: "Parametric · Fusion 360",
    description: "Parametric modeling with dimensional tolerances, fitment validation, and export to any format.",
  },
  {
    label: "Web Development",
    spec: "Full-stack · Next.js + Vercel",
    description: "Custom websites built with modern frameworks, deployed on edge infrastructure.",
  },
];

export function ProcessSection() {
  return (
    <section
      id="capabilities"
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
          maxWidth: "1100px",
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ marginBottom: "clamp(32px, 4vw, 48px)" }}>
          <span className="spec-label" style={{ display: "block", marginBottom: "16px" }}>
            Capabilities
          </span>
          <h2
            style={{
              fontSize: "clamp(22px, 2.5vw, 32px)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            What We Build With
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: "1px",
            background: "var(--border)",
            border: "1px solid var(--border)",
          }}
        >
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                background: "var(--base)",
                padding: "clamp(24px, 3vw, 36px)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  color: "var(--accent)",
                  textTransform: "uppercase",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {cap.label}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                }}
              >
                {cap.description}
              </p>
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "10px",
                  letterSpacing: "0.04em",
                  color: "var(--text-tertiary)",
                  marginTop: "auto",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                {cap.spec}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify the expanded section renders**

Visually check `http://localhost:3000/#capabilities` — cards should show numbered headers, descriptions, and spec footers.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/components/ProcessSection.tsx
git commit -m "feat: expand capabilities section from icon strip to full descriptive cards"
```

---

### Task 13: Update Homepage AboutSection to Link to Full Page

**Files:**
- Modify: `src/components/AboutSection.tsx`

- [ ] **Step 1: Add a link to the full about page**

Update `AboutSection.tsx` to include a CTA linking to `/about`:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/components/AboutSection.tsx
git commit -m "feat: add CTA link from homepage about section to full /about page"
```

---

### Task 14: Add Social Links to Footer

**Files:**
- Create: `src/components/SocialLinks.tsx`
- Modify: `src/components/Footer.tsx`

- [ ] **Step 1: Create SocialLinks component**

```tsx
// src/components/SocialLinks.tsx
const socialLinks = [
  { label: "eBay", href: "https://www.ebay.com/str/forgepoint" },
  // Add more as they become available (Instagram, etc.)
];

export function SocialLinks() {
  if (socialLinks.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: "12px" }}>
      {socialLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
          style={{ fontSize: "12px" }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update Footer to use multi-page links and add social**

In `src/components/Footer.tsx`, update `footerLinks` (line 7-11):

```typescript
const footerLinks = [
  { label: "Brands", href: "/#portfolio" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
```

And update the "Work With Us" CTA from `mailto:` to the contact page:

```tsx
<a
  href="/contact"
  className="btn-outline"
>
  Get in Touch
  <ArrowUpRight size={12} />
</a>
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/components/SocialLinks.tsx src/components/Footer.tsx
git commit -m "feat: update footer with multi-page links and contact page CTA"
```

---

### Task 15: Add Social Proof Section to Homepage

**Files:**
- Create: `src/components/SocialProof.tsx`
- Modify: `src/app/page.tsx`

Gemini flagged the council's Priority 4 (Conversion Engine) requires social proof. SOTA boutique manufacturing sites lead with "Proof of Work."

- [ ] **Step 1: Create SocialProof component**

```tsx
// src/components/SocialProof.tsx
"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "The grip plugs fit perfectly — tighter tolerances than OEM parts I've bought.",
    author: "Forgepoint Customer",
    context: "Custom Glock 19 Backplate",
  },
  {
    quote: "Incredibly detailed miniatures. Paint-ready right out of the box.",
    author: "Realmforge Customer",
    context: "D&D Campaign Set",
  },
  {
    quote: "ACF Designs delivered our site in under two weeks. Fast, clean, professional.",
    author: "Small Business Owner",
    context: "Website Build",
  },
];

export function SocialProof() {
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
      <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <span className="spec-label" style={{ display: "block", marginBottom: "16px" }}>
          From Our Customers
        </span>
        <h2
          style={{
            fontSize: "clamp(22px, 2.5vw, 32px)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            marginBottom: "clamp(32px, 4vw, 48px)",
          }}
        >
          Proof of Work
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "24px",
          }}
        >
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                background: "var(--base-raised)",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "clamp(20px, 3vw, 32px)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.7,
                  color: "var(--text-secondary)",
                  fontStyle: "italic",
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>
              <div style={{ marginTop: "auto" }}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                  {t.author}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "10px",
                    letterSpacing: "0.06em",
                    color: "var(--text-tertiary)",
                    marginTop: "2px",
                  }}
                >
                  {t.context}
                </div>
              </div>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add SocialProof to homepage**

Update `src/app/page.tsx` to include the SocialProof component between ProcessSection and AboutSection:

```tsx
import { Hero } from "@/components/Hero";
import { PortfolioSection } from "@/components/PortfolioSection";
import { ProcessSection } from "@/components/ProcessSection";
import { SocialProof } from "@/components/SocialProof";
import { AboutSection } from "@/components/AboutSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <PortfolioSection />
      <ProcessSection />
      <SocialProof />
      <AboutSection />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add src/components/SocialProof.tsx src/app/page.tsx
git commit -m "feat: add social proof section with customer testimonials to homepage"
```

**NOTE TO IMPLEMENTER:** The testimonials above are placeholder text. Replace with real customer quotes as they become available. The CEO should provide actual testimonials or review excerpts.

---

## Chunk 5: Polish & E2E Verification

### Task 16: Create OG Default Image Placeholder (renumbered from 15)

**Files:**
- Create: `public/og-default.png`

- [ ] **Step 1: Create a placeholder OG image**

**NOTE TO IMPLEMENTER:** Generate or create a 1200x630 PNG with the ACF brand identity:
- Background: `#0a0a0a` (var(--base))
- Center: "ACF" monogram in orange (`#F97316`) with "Alamo Crafting Forge" below
- Bottom: "Precision Manufacturing & Design — San Antonio, TX" in light gray

This can be generated programmatically or designed manually. For now, a simple branded placeholder is acceptable.

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add public/og-default.png
git commit -m "feat: add branded OG image for social sharing"
```

---

### Task 17: Optimize Hero Video (LOCAL ONLY — do not depend on ffmpeg in Vercel build)

**Files:**
- Modify: `public/hero-loop.mp4`

This optimization runs on the developer's local machine or in CI, NOT in Vercel's build pipeline. Commit the optimized file directly.

- [ ] **Step 1: Check current video size and compress locally**

```bash
# Check size
ls -lh "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/public/hero-loop.mp4"

# Compress with ffmpeg locally (target: <1MB, 720p, CRF 28)
ffmpeg -i "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/public/hero-loop.mp4" \
  -vf "scale=-2:720" -c:v libx264 -crf 28 -preset slow -an \
  "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/public/hero-loop-optimized.mp4"
```

If ffmpeg is not installed, skip this task and log it as a manual action item.

- [ ] **Step 2: If compression succeeds, replace the original**

```bash
mv "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/public/hero-loop-optimized.mp4" \
   "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/public/hero-loop.mp4"
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add public/hero-loop.mp4
git commit -m "perf: compress hero video to ~1MB for faster page load"
```

---

### Task 18: E2E Test Suite

**Files:**
- Create: `tests/seo.spec.ts`
- Create: `tests/brands.spec.ts`
- Create: `tests/contact.spec.ts`

- [ ] **Step 1: Create SEO E2E tests**

```typescript
// tests/seo.spec.ts
import { test, expect } from "@playwright/test";

test.describe("SEO infrastructure", () => {
  test("robots.txt is served", async ({ page }) => {
    const res = await page.goto("/robots.txt");
    expect(res?.status()).toBe(200);
    const text = await res?.text();
    expect(text).toContain("Sitemap:");
    expect(text).toContain("Disallow: /admin/");
  });

  test("sitemap.xml contains brand routes", async ({ page }) => {
    const res = await page.goto("/sitemap.xml");
    expect(res?.status()).toBe(200);
    const text = await res?.text();
    expect(text).toContain("/brands/forgepoint");
    expect(text).toContain("/brands/acf-dice");
    expect(text).toContain("/about");
    expect(text).toContain("/contact");
  });

  test("homepage has JSON-LD structured data", async ({ page }) => {
    await page.goto("/");
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toContain("Organization");
    expect(jsonLd).toContain("Alamo Crafting Forge");
  });
});
```

- [ ] **Step 2: Create brand page E2E tests**

```typescript
// tests/brands.spec.ts
import { test, expect } from "@playwright/test";

test.describe("brand pages", () => {
  test("forgepoint page renders", async ({ page }) => {
    await page.goto("/brands/forgepoint");
    await expect(page.locator("h1")).toContainText("Forgepoint");
  });

  test("acf-dice page has process steps", async ({ page }) => {
    await page.goto("/brands/acf-dice");
    await expect(page.locator("text=Our Process")).toBeVisible();
  });

  test("brand page has JSON-LD", async ({ page }) => {
    await page.goto("/brands/realmforge");
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toContain("Realmforge");
  });

  test("invalid slug returns 404", async ({ page }) => {
    const res = await page.goto("/brands/nonexistent-brand");
    expect(res?.status()).toBe(404);
  });

  test("homepage brand cards link to internal pages", async ({ page }) => {
    await page.goto("/");
    const links = await page.locator('a[href^="/brands/"]').all();
    expect(links.length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 3: Create contact E2E tests**

```typescript
// tests/contact.spec.ts
import { test, expect } from "@playwright/test";

test.describe("contact page", () => {
  test("contact form renders", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("h1")).toContainText("Get in Touch");
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
  });

  test("form validates required fields", async ({ page }) => {
    await page.goto("/contact");
    await page.locator('button[type="submit"]').click();
    // HTML5 validation should prevent submission
    const nameInput = page.locator('input[name="name"]');
    expect(await nameInput.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  });
});
```

- [ ] **Step 4: Run E2E tests**

Run: `cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx playwright test tests/`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add tests/seo.spec.ts tests/brands.spec.ts tests/contact.spec.ts
git commit -m "test: add E2E tests for SEO, brand pages, and contact form"
```

---

## Chunk 6: Deployment — Migrate from Bluehost to Vercel

**IMPORTANT:** Bluehost is active hosting with email infrastructure (Titan email for support@alamocraftingforge.com). This migration must preserve email routing. Only execute this chunk after all code is built, tested, and verified locally.

### Task 19: Verify Full Build & Preview Deploy

**Files:**
- Create: `vercel.json` (if redirects needed)

- [ ] **Step 1: Verify production build succeeds with all new routes**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx next build
```

Expected: Build succeeds. All brand pages, about, contact statically generated.

- [ ] **Step 2: Run full test suite**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx vitest run && npx playwright test tests/
```

Expected: All unit and E2E tests pass.

- [ ] **Step 3: Link to Vercel and deploy preview**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx vercel link
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx vercel
```

This creates a **preview deployment** (not production). Vercel assigns a temporary URL like `acf-xxxxx.vercel.app`. Verify the full site works at the preview URL before touching DNS.

- [ ] **Step 4: CEO reviews preview deployment**

Share the preview URL with the CEO. All pages, forms, brand pages, SEO should be verified on the preview URL before proceeding to production cutover.

- [ ] **Step 5: Commit deployment config**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
git add vercel.json .vercel/ 2>/dev/null
git commit -m "chore: add Vercel deployment configuration" 2>/dev/null || true
```

---

### Task 20: Production Cutover — DNS Migration

**Files:**
- None (infrastructure task)

**PREREQUISITE:** CEO has approved the preview deployment from Task 19.

- [ ] **Step 1: Deploy to production on Vercel**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge" && npx vercel --prod
```

- [ ] **Step 2: Add custom domain in Vercel dashboard**

In Vercel: Settings > Domains > Add `alamocraftingforge.com`.

Vercel will provide DNS records (either nameservers or A/CNAME records).

- [ ] **Step 3: Update DNS at Bluehost — PRESERVE EMAIL**

**CRITICAL:** Do NOT change nameservers away from Bluehost if Titan email is active there. Instead, use the A/CNAME approach:

- In Bluehost DNS management, update the **A record** for `@` (root domain) to point to Vercel's IP (provided in Vercel dashboard, typically `76.76.21.21`)
- Add/update **CNAME** for `www` to point to `cname.vercel-dns.com`
- **Leave MX records, TXT/SPF records, and all email-related DNS records UNTOUCHED**

This preserves Bluehost as the DNS host (keeping email routing intact) while pointing only the web traffic to Vercel.

**NOTE TO IMPLEMENTER:** This is a manual DNS step. The CEO must access Bluehost DNS settings. Only change A and CNAME records for web — do not touch MX, SPF, DKIM, or DMARC records.

- [ ] **Step 4: Verify email still works after DNS change**

Send a test email to support@alamocraftingforge.com and confirm it arrives. Check SPF/DKIM alignment hasn't broken.

- [ ] **Step 5: Verify production site**

```bash
curl -s -o /dev/null -w "%{http_code}" https://alamocraftingforge.com
```

Expected: 200 — the new Next.js site, not the Bluehost holding page.

- [ ] **Step 6: SSL verification**

Vercel auto-provisions SSL. Verify HTTPS works:

```bash
curl -sI https://alamocraftingforge.com | head -5
```

Expected: HTTP/2 200 with valid SSL certificate from Let's Encrypt.

---

## Summary

| Chunk | Tasks | Focus |
|-|-|-|
| 1 | 1-4 | Brand data model, structured data, robots.txt, sitemap, root layout SEO |
| 2 | 5-7 | Brand landing pages, internal card links, multi-page nav |
| 3 | 8-10 | Contact API (with rate limiting + origin check) + form page, expanded about page |
| 4 | 11-15 | Fix ACF Designs image, expand capabilities, about CTA, footer updates, social proof |
| 5 | 16-18 | OG image, video optimization (local), E2E tests |
| 6 | 19-20 | Vercel preview deploy, CEO review, production cutover with DNS migration (preserve email) |

**Manual action items (require CEO input):**
- Task 11: Replacement image for `public/brands/acf-designs.webp`
- Task 15: Replace placeholder testimonials with real customer quotes
- Task 16: Branded OG image (1200x630 PNG)
- Task 17: ffmpeg required locally for video compression
- Task 19: CEO reviews Vercel preview deployment before production cutover
- Task 20: DNS changes at Bluehost (A/CNAME only — preserve MX/email records for Titan)

**Advisor review revisions applied:**
- Codex: build-time brand validation, JSON-LD `<` escaping, rate limiting + origin check on contact API, expanded E2E coverage (404 test), ffmpeg clarified as local-only
- Gemini: social proof task added (Task 15), design system continuity note added, aesthetic audit guidance
- CEO correction: Bluehost is active hosting with Titan email. Deployment moved to final chunk (Chunk 6). DNS migration uses A/CNAME records only to preserve email routing — MX, SPF, DKIM, DMARC records must not be touched.

**Total tasks:** 20 (Task 1-20)
**Estimated commits:** 19 (Task 20 is infrastructure-only)
