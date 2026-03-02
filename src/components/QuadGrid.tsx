"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { brands } from "@/lib/brands";
import { QuadCard } from "./QuadCard";

export function QuadGrid() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const topRow = brands.filter((b) => b.position.startsWith("top"));
  const bottomRow = brands.filter((b) => b.position.startsWith("bottom"));

  return (
    <section
      id="brands"
      style={{
        height: "100vh",
        width: "100%",
        paddingTop: "64px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "var(--base)",
      }}
    >
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

      {/* Desktop: 2x2 grid */}
      <div
        className="hidden md:flex"
        style={{ flexDirection: "column", flex: 1, position: "relative", zIndex: 1 }}
      >
        {/* Crosshair center marker */}
        <div
          style={{
            position: "absolute",
            top: "50%",
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

        {/* Horizontal divider */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: "1px",
            background: "var(--border)",
            zIndex: 15,
            pointerEvents: "none",
          }}
        />

        {/* Vertical divider */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: "1px",
            background: "var(--border)",
            zIndex: 15,
            pointerEvents: "none",
          }}
        />

        {/* Top row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ display: "flex", flex: 1, minHeight: 0 }}
        >
          {topRow.map((brand) => (
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

        {/* Bottom row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ display: "flex", flex: 1, minHeight: 0 }}
        >
          {bottomRow.map((brand) => (
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

      {/* Mobile: stacked panels */}
      <div className="md:hidden" style={{ display: "flex", flexDirection: "column" }}>
        {brands.map((brand) => (
          <div
            key={brand.id}
            style={{ height: "75vh" }}
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
