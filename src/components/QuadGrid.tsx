"use client";

import { useState } from "react";
import { brands } from "@/lib/brands";
import { QuadCard } from "./QuadCard";

export function QuadGrid() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const topRow = brands.filter((b) => b.position.startsWith("top"));
  const bottomRow = brands.filter((b) => b.position.startsWith("bottom"));

  return (
    <section id="brands" className="h-screen w-full pt-16 flex flex-col">
      {/* Desktop: 2x2 grid */}
      <div className="hidden md:flex flex-col flex-1">
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
