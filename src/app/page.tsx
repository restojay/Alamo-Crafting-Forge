import { Hero } from "@/components/Hero";
import { PortfolioSection } from "@/components/PortfolioSection";
import { ProcessSection } from "@/components/ProcessSection";
import { AboutSection } from "@/components/AboutSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <PortfolioSection />
      <ProcessSection />
      <AboutSection />
      <Footer />
    </main>
  );
}
