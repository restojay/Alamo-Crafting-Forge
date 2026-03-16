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
  image: string;
  blueprintMeta: string[];
  processSteps: ProcessStep[];
  ctaLabel: string;
  ctaHref: string;
  sector: Sector;
}

export interface SectorMeta {
  label: string;
  description: string;
}

export const sectorMeta: Record<Sector, SectorMeta> = {
  "precision-manufacturing": {
    label: "Precision Manufacturing",
    description: "FDM and SLA printing for functional parts, dental models, and accessories.",
  },
  "artisanal-craft": {
    label: "Artisanal Craft",
    description: "Handcrafted miniatures, terrain, and collector-grade resin dice.",
  },
  "digital-systems": {
    label: "Digital Systems",
    description: "Full-stack web development for small businesses.",
  },
};

export const brands: Brand[] = [
  {
    id: "forgepoint",
    slug: "forgepoint",
    name: "Forgepoint",
    tagline: "Personalized Firearm Accessories",
    description: "Custom-engraved and 3D-printed gun accessories — grip plugs, backplates, rail covers.",
    longDescription:
      "Forgepoint manufactures custom firearm accessories using carbon-fiber reinforced PETG on Bambu Lab P1S printers. Every part is printed at 100% infill with ±0.1mm fitment tolerance, then inspected against CAD reference geometry before shipping. We specialize in Glock-compatible grip plugs, backplates, and Picatinny rail covers with laser-engraved personalization.",
    image: "/brands/forgepoint.webp",
    blueprintMeta: ["Material: CF-PETG", "Infill: 100%", "Fitment: ±0.1mm"],
    processSteps: [
      {
        title: "CAD Design",
        description: "Parametric models in Fusion 360, validated against manufacturer specs.",
      },
      {
        title: "FDM Printing",
        description: "CF-PETG on Bambu P1S at 100% infill for structural integrity.",
      },
      {
        title: "Post-Processing",
        description: "Laser engraving, fitment check, and QA inspection.",
      },
    ],
    ctaLabel: "Visit Site",
    ctaHref: "https://www.ebay.com/str/forgepoint",
    sector: "precision-manufacturing",
  },
  {
    id: "acf-dental",
    slug: "acf-dental",
    name: "ACF Dental",
    tagline: "Next-Day Dental Models",
    description: "Precision 3D printed dental models for San Antonio dental offices — next-day turnaround, local delivery.",
    longDescription:
      "ACF Dental produces clinical-grade 3D printed dental models using Formlabs Form 4B resin printers calibrated for micron-level dimensional accuracy. We serve San Antonio dental practices with diagnostic models, orthodontic models, and die models — all printed, QC-inspected, and hand-delivered next day via local courier. HIPAA compliant, TSBDE registered.",
    image: "/brands/acf-dental.png",
    blueprintMeta: ["Material: Dental Resin", "Layer: 50μm", "Delivery: Next-Day"],
    processSteps: [
      {
        title: "Scan Upload",
        description: "Dentists upload intraoral scans (STL, PLY, OBJ) through our portal.",
      },
      {
        title: "SLA Printing",
        description: "Formlabs 4B at 50μm in dental-grade resin for clinical accuracy.",
      },
      {
        title: "QC & Delivery",
        description: "Multi-point inspection, then same-day or next-day courier to your office.",
      },
    ],
    ctaLabel: "Visit Site",
    ctaHref: "https://dental.alamocraftingforge.com",
    sector: "precision-manufacturing",
  },
  {
    id: "realmforge",
    slug: "realmforge",
    name: "Realmforge",
    tagline: "Tabletop Miniatures & Terrain",
    description: "High-detail resin miniatures and modular terrain for D&D, Pathfinder, and wargaming.",
    longDescription:
      "Realmforge produces high-detail resin miniatures and modular terrain pieces using Formlabs Form 4B SLA printers at 50μm layer height. Our catalog spans fantasy heroes, monsters, and interlocking dungeon terrain tiles. Every model is printed in Tough 2000 resin for durability, then cleaned in IPA and UV-cured for a paint-ready finish.",
    image: "/brands/realmforge.webp",
    blueprintMeta: ["Material: Tough 2000", "Layer: 50μm", "Build: 218×128mm"],
    processSteps: [
      {
        title: "Model Prep",
        description: "STL validation, support generation, and build plate optimization.",
      },
      {
        title: "SLA Printing",
        description: "Formlabs 4B at 50μm in Tough 2000 resin for detail and durability.",
      },
      {
        title: "Post-Cure",
        description: "IPA wash, UV cure, support removal, and quality inspection.",
      },
    ],
    ctaLabel: "Visit Site",
    ctaHref: "https://www.ebay.com/str/realmforge",
    sector: "artisanal-craft",
  },
  {
    id: "acf-dice",
    slug: "acf-dice",
    name: "ACF Dice",
    tagline: "Precision Resin Dice Masters",
    description: "Custom dice masters printed on Formlabs 4B SLA — collector-grade detail for tabletop gaming.",
    longDescription:
      "ACF Dice creates collector-grade resin dice masters using Formlabs Form 4B SLA technology at 25μm layer height — the finest resolution available in desktop resin printing. Each master is engineered for weight balance across all faces, with ±0.05mm dimensional tolerance. Masters are used to create silicone molds for small-batch artisan dice production.",
    image: "/brands/acf-dice.webp",
    blueprintMeta: ["Material: UV Resin", "Layer: 25μm", "Tolerance: ±0.05mm"],
    processSteps: [
      {
        title: "Digital Sculpting",
        description: "Precision number placement and balance geometry in CAD.",
      },
      {
        title: "SLA Printing",
        description: "25μm layers on Formlabs 4B for collector-grade surface finish.",
      },
      {
        title: "Master Finishing",
        description: "Sanding, polishing, and dimensional verification for mold-ready masters.",
      },
    ],
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
    longDescription:
      "ACF Designs builds custom websites for small businesses using modern web technology. We handle everything from design through deployment — responsive layouts, SEO optimization, domain configuration, and ongoing hosting on Vercel. Our stack is Next.js, React, and Tailwind CSS, delivering fast, accessible, and maintainable sites.",
    image: "/brands/acf-designs.webp",
    blueprintMeta: ["Next.js", "React", "Tailwind CSS", "Vercel"],
    processSteps: [
      {
        title: "Discovery",
        description: "Requirements gathering, brand analysis, and sitemap planning.",
      },
      {
        title: "Design & Build",
        description: "Component-driven development in Next.js with responsive Tailwind layouts.",
      },
      {
        title: "Deploy & Support",
        description: "Vercel deployment, domain setup, analytics, and ongoing maintenance.",
      },
    ],
    ctaLabel: "Visit Site",
    ctaHref: "https://designs.alamocraftingforge.com",
    sector: "digital-systems",
  },
];

export function getBrandBySlug(slug: string): Brand | undefined {
  return brands.find((b) => b.slug === slug);
}
