export type Sector = "precision-manufacturing" | "artisanal-craft" | "digital-systems";

export interface Brand {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  blueprintMeta: string[];
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
    description: "FDM and SLA printing for functional parts, miniatures, and accessories.",
  },
  "artisanal-craft": {
    label: "Artisanal Craft",
    description: "Collector-grade resin dice engineered for balance and beauty.",
  },
  "digital-systems": {
    label: "Digital Systems",
    description: "Full-stack web development for small businesses.",
  },
};

export const brands: Brand[] = [
  {
    id: "forgepoint",
    name: "Forgepoint",
    tagline: "Personalized Firearm Accessories",
    description: "Custom-engraved and 3D-printed gun accessories — grip plugs, backplates, rail covers.",
    image: "/brands/forgepoint.webp",
    blueprintMeta: ["Material: CF-PETG", "Infill: 100%", "Fitment: ±0.1mm"],
    ctaLabel: "Visit Site",
    ctaHref: "https://www.ebay.com/str/forgepoint",
    sector: "precision-manufacturing",
  },
  {
    id: "realmforge",
    name: "Realmforge",
    tagline: "Tabletop Miniatures & Terrain",
    description: "High-detail resin miniatures and modular terrain for D&D, Pathfinder, and wargaming.",
    image: "/brands/realmforge.webp",
    blueprintMeta: ["Material: Tough 2000", "Layer: 50μm", "Build: 218×128mm"],
    ctaLabel: "Visit Site",
    ctaHref: "https://www.ebay.com/str/realmforge",
    sector: "precision-manufacturing",
  },
  {
    id: "acf-dice",
    name: "ACF Dice",
    tagline: "Precision Resin Dice Masters",
    description: "Custom dice masters printed on Formlabs 4B SLA — collector-grade detail for tabletop gaming.",
    image: "/brands/acf-dice.webp",
    blueprintMeta: ["Material: UV Resin", "Layer: 25μm", "Tolerance: ±0.05mm"],
    ctaLabel: "Visit Site",
    ctaHref: "https://acfdice.com",
    sector: "artisanal-craft",
  },
  {
    id: "acf-designs",
    name: "ACF Designs",
    tagline: "Full-Service Web Development",
    description: "Custom websites designed, built, and deployed for small businesses.",
    image: "/brands/acf-designs.webp",
    blueprintMeta: ["Next.js", "React", "Tailwind CSS", "Vercel"],
    ctaLabel: "Visit Site",
    ctaHref: "https://designs.alamocraftingforge.com",
    sector: "digital-systems",
  },
];
