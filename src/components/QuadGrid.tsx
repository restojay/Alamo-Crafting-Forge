"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { brands } from "@/lib/brands";
import { QuadCard } from "./QuadCard";

const positionToGrid: Record<string, { col: "left" | "right"; row: "top" | "bottom" }> = {
  "top-left": { col: "left", row: "top" },
  "top-right": { col: "right", row: "top" },
  "bottom-left": { col: "left", row: "bottom" },
  "bottom-right": { col: "right", row: "bottom" },
};

export function QuadGrid() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const hoveredBrand = hoveredId ? brands.find((b) => b.id === hoveredId) : null;
  const hoverCol = hoveredBrand ? positionToGrid[hoveredBrand.position]?.col : null;
  const hoverRow = hoveredBrand ? positionToGrid[hoveredBrand.position]?.row : null;

  return (
    <section
      id="brands"
      style={{
        width: "100%",
        position: "relative",
        background: "var(--base)",
      }}
    >
      {/* Steel texture base */}
      <div className="steel-texture" />

      {/* Ambient background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 50%, rgba(249,115,22,0.03) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Desktop: CSS Grid 2x2 with true 60/40 expansion */}
      <div
        className="hidden md:block"
        style={{
          height: "100vh",
          paddingTop: "64px",
          position: "relative",
        }}
      >
        {/* Crosshair center marker */}
        <div
          style={{
            position: "absolute",
            top: "calc(50% + 32px)",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "24px",
            height: "24px",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: "1px",
              background: "var(--accent)",
              opacity: 0.3,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: "1px",
              background: "var(--accent)",
              opacity: 0.3,
            }}
          />
        </div>

        {/* Grid divider lines */}
        <div
          style={{
            position: "absolute",
            top: "calc(50% + 32px)",
            left: 0,
            right: 0,
            height: "1px",
            background: "var(--border)",
            zIndex: 15,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "64px",
            bottom: 0,
            width: "1px",
            background: "var(--border)",
            zIndex: 15,
            pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="quad-hero-grid"
          data-hover-col={hoverCol || undefined}
          data-hover-row={hoverRow || undefined}
          style={{ height: "calc(100vh - 64px)" }}
        >
          {brands.map((brand) => (
            <QuadCard
              key={brand.id}
              brand={brand}
              isExpanded={hoveredId === brand.id}
              isDimmed={hoveredId !== null && hoveredId !== brand.id}
              onHover={() => setHoveredId(brand.id)}
              onLeave={() => setHoveredId(null)}
            />
          ))}
        </motion.div>
      </div>

      {/* Mobile: stacked panels — shorter default, expand on tap */}
      <div
        className="md:hidden"
        style={{
          display: "flex",
          flexDirection: "column",
          paddingTop: "64px",
        }}
      >
        {brands.map((brand) => (
          <div
            key={brand.id}
            style={{
              height: hoveredId === brand.id ? "80vh" : "30vh",
              transition: "height 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)",
              position: "relative",
            }}
            onClick={() =>
              setHoveredId(hoveredId === brand.id ? null : brand.id)
            }
          >
            <QuadCard
              brand={brand}
              isExpanded={hoveredId === brand.id}
              isDimmed={false}
              onHover={() => {}}
              onLeave={() => {}}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
