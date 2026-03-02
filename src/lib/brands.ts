export interface Brand {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  blueprintMeta: string[];
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
    blueprintMeta: ["Material: UV Resin", "Layer: 25μm", "Tolerance: ±0.05mm"],
    ctaLabel: "Enter Storefront",
    ctaHref: "https://dice.alamocraftingforge.com",
    position: "top-left",
  },
  {
    id: "forgepoint",
    name: "Forgepoint",
    tagline: "Personalized Firearm Accessories",
    description: "Custom-engraved and 3D-printed gun accessories — grip plugs, backplates, rail covers.",
    image: "/brands/forgepoint.jpg",
    blueprintMeta: ["Material: CF-PETG", "Infill: 100%", "Fitment: ±0.1mm"],
    ctaLabel: "Enter Storefront",
    ctaHref: "https://www.ebay.com/str/forgepoint",
    position: "top-right",
  },
  {
    id: "realmforge",
    name: "Realmforge",
    tagline: "Tabletop Miniatures & Terrain",
    description: "High-detail resin miniatures and modular terrain for D&D, Pathfinder, and wargaming.",
    image: "/brands/realmforge.jpg",
    blueprintMeta: ["Material: Tough 2000", "Layer: 50μm", "Build: 218×128mm"],
    ctaLabel: "Enter Storefront",
    ctaHref: "https://www.ebay.com/str/realmforge",
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
