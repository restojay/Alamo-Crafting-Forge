# Alamo Crafting Forge — Website Design Document

**Date:** 2026-03-01
**Type:** Brand Showcase + Routing Hub (Single-Page Application)
**Domain:** alamocraftingforge.com
**Approved by:** CEO

---

## Purpose

A single-page showcase site for Alamo Crafting Forge LLC. Equal-weight presentation of four verticals. Visitors explore what ACF does, then route to each brand's dedicated storefront for purchasing. The site itself is a portfolio piece for ACF Designs.

## Verticals

| # | Brand | Vertical | External Route |
|-|-|-|-|
| 1 | ACF Dice | Precision resin dice masters | dice.alamocraftingforge.com or dedicated site |
| 2 | Forgepoint | Personalized 3D-printed gun accessories | eBay / Shopify store |
| 3 | Realmforge | Resin tabletop miniatures & terrain | eBay / Shopify store |
| 4 | ACF Designs | Full-service web development | designs.alamocraftingforge.com or portfolio |

All four are DBAs under Alamo Crafting Forge LLC.

---

## Page Structure

Single-page scroll with four anchor sections and a persistent navigation bar.

### Navigation Bar

Fixed top, semi-transparent dark glassmorphism. Minimal.

```
[ACF Logo]  ···  Our Brands  ·  The Process  ·  About  ·  Contact
```

On mobile: hamburger menu.

### Section 1 — Our Brands (Hero, 100vh)

The Quad-Quadrant Grid. A 2x2 matrix filling the initial viewport.

```
┌─────────────────────┬─────────────────────┐
│                     │                     │
│     ACF Dice        │     Forgepoint      │
│     [macro die]     │  [backplate on gun] │
│                     │                     │
├─────────────────────┼─────────────────────┤
│                     │                     │
│    Realmforge       │    ACF Designs      │
│  [mini on dark bg]  │ [laptop w/ Fonsi]   │
│                     │                     │
└─────────────────────┴─────────────────────┘
```

**Default state:** Full-bleed macro photography per quadrant, brand name in Geist Sans, one-line tagline.

**Hover state:**
- Selected quadrant expands to ~60% of viewport (60/40 split)
- Subtle Ken Burns effect on background image
- Blueprint/wireframe overlay appears over the product photo
- Technical metadata fades in (resin type, layer height, material — or "Next.js · React · Tailwind" for Designs)
- Brand tagline and "Enter Storefront" CTA button (Forge Orange) appear
- Other three quadrants dim slightly

**Click CTA:** Routes to that brand's external storefront/site (new tab).

**Mobile:** Grid stacks to 4 full-width cards (~75vh each). Tap to reveal CTA and metadata. Swipe-friendly vertical scroll.

### Section 2 — The Process

Horizontal strip or grid showing ACF's manufacturing and design capabilities. Ties all four verticals together under "precision engineering."

Content:
- SLA Resin Printing (Formlabs 4B)
- FDM Manufacturing (Bambu Lab P1S fleet)
- CAD Design (Fusion 360 + OpenSCAD)
- Web Development (Next.js, React, full-stack)

Brief copy: "From resin to code — everything we make is engineered to spec."

Icons or micro-animations for each capability. Dark background, minimal text.

### Section 3 — About

2-3 sentences. Identity statement. Location: San Antonio, TX. What ties the verticals together: precision manufacturing and digital craft under one roof. Optional workshop/desk photo with dark treatment.

No biography. No mission statement. Just the through-line.

### Section 4 — Contact

- Email address
- Location (San Antonio, TX)
- Social links (if applicable)
- Optional simple contact form
- ACF logo, LLC notice, copyright

---

## Visual System

Design direction: **Industrial Minimalist** — Gemini advisory, 1 Mar 2026.

### Color Palette: "Cold Steel & Ember"

| Token | Value | Usage |
|-|-|-|
| `--base` | #121212 (Deep Charcoal) | Page background, primary surfaces |
| `--secondary` | #475569 (Slate Gray) | Secondary text, borders, subtle elements |
| `--accent` | #F97316 (Forge Orange) | CTAs, interactive highlights, hover states |
| `--text-primary` | #F8FAFC | Headings, primary text |
| `--text-secondary` | #94A3B8 | Body text, descriptions |

### Typography

| Role | Font | Fallback |
|-|-|-|
| Headings | Geist Sans | system-ui, sans-serif |
| Body / specs | Geist Mono | monospace |

Geist Sans for ultra-modern, technical headings. Geist Mono for "spec-sheet" details (material types, layer heights, tech stacks) — reinforces the precision/forge identity.

### Effects

- **Glassmorphism:** Nav bar uses semi-transparent dark glass with subtle backdrop blur
- **Ethereal shadows:** Depth without clutter on cards and interactive elements
- **Blueprint overlay:** On hover, a glowing wireframe/CAD overlay appears on product photos with technical metadata. The signature differentiator.
- **Ken Burns:** Subtle slow zoom/pan on quadrant images during hover

### Dark Mode

Dark by default. No light mode toggle. The dark aesthetic is the brand identity.

---

## Key Differentiator: Blueprint Overlay

When a user hovers over a quadrant (or taps on mobile), a semi-transparent blueprint/wireframe overlay appears on the product photo. Accompanied by technical metadata:

- ACF Dice: "Material: UV Resin · Layer: 25μm · Tolerance: ±0.05mm"
- Forgepoint: "Material: CF-PETG · Infill: 100% · Fitment: ±0.1mm"
- Realmforge: "Material: Tough 2000 · Layer: 50μm · Build: 218×128mm"
- ACF Designs: "Stack: Next.js · React · Tailwind · Vercel"

This visually links web development to physical manufacturing under the umbrella of precision engineering. It makes the site memorable and reinforces the ACF identity.

---

## Tech Stack

| Component | Choice |
|-|-|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| Language | TypeScript |
| Fonts | Geist Sans + Geist Mono (via next/font) |
| Images | next/image with priority loading |
| Deployment | Vercel |
| Domain | alamocraftingforge.com |
| Repo | Alamo-Crafting-Forge (existing) |

Single page, high-performance image optimization. No CMS needed — content is static. No e-commerce — all purchasing happens on external brand sites.

---

## Photography Requirements

All four verticals must use the same lighting setup for brand consistency:

- **Background:** Dark (black felt, dark wood, or composite dark)
- **Lighting:** Dramatic rim lighting, single key light
- **Style:** Extreme macro shots, tight focus on product detail
- **Consistency:** Same treatment across all four quadrants

Placeholder images acceptable for initial build; real photography required before production launch.

---

## External Routing

| Brand | Primary Route | Fallback |
|-|-|-|
| ACF Dice | dice.alamocraftingforge.com | ACFDice repo site |
| Forgepoint | eBay store | Shopify (future) |
| Realmforge | eBay store | Shopify (future) |
| ACF Designs | designs.alamocraftingforge.com | Contact form |

Each quadrant's CTA opens the external route in a new tab.

---

## Out of Scope

- E-commerce / cart / checkout (handled by external stores)
- Blog / CMS
- User authentication
- Light mode
- Individual product pages
- Dental vertical (deferred)
- Fursuit components (stays under Realmforge, not featured separately)

---

*Design direction by Gemini (External Advisor). Architecture by Chief of Staff. Approved by CEO, 1 Mar 2026.*
