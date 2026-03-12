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
