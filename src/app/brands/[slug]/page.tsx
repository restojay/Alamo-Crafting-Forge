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
