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
