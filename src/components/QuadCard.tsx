"use client";

import { motion } from "framer-motion";
import type { Brand } from "@/lib/brands";

interface QuadCardProps {
  brand: Brand;
  isExpanded: boolean;
  onHover: () => void;
  onLeave: () => void;
}

const brandGradients: Record<string, string> = {
  "acf-dice": "from-purple-900/60 to-indigo-950/80",
  "forgepoint": "from-stone-800/60 to-zinc-950/80",
  "realmforge": "from-emerald-900/60 to-teal-950/80",
  "acf-designs": "from-sky-900/60 to-slate-950/80",
};

export function QuadCard({ brand, isExpanded, onHover, onLeave }: QuadCardProps) {
  return (
    <motion.div
      className="relative overflow-hidden cursor-pointer"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      animate={{
        flex: isExpanded ? 1.5 : 1,
      }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Gradient background (placeholder for photography) */}
      <div className={`absolute inset-0 bg-gradient-to-br ${brandGradients[brand.id] || "from-gray-900 to-gray-950"}`} />

      {/* Blueprint grid overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isExpanded ? 0.15 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          backgroundImage: `
            linear-gradient(rgba(249,115,22,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end p-8 md:p-10">
        {/* Brand name */}
        <h2 className="text-2xl md:text-3xl font-bold tracking-wide">
          {brand.name}
        </h2>

        {/* Tagline */}
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {brand.tagline}
        </p>

        {/* Expanded content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: isExpanded ? 1 : 0,
            y: isExpanded ? 0 : 10,
          }}
          transition={{ duration: 0.3, delay: isExpanded ? 0.15 : 0 }}
          className="mt-4"
        >
          {/* Blueprint metadata tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {brand.blueprintMeta.map((meta) => (
              <span
                key={meta}
                className="text-xs px-2 py-1 rounded border"
                style={{
                  fontFamily: "var(--font-geist-mono)",
                  color: "var(--accent)",
                  borderColor: "rgba(249,115,22,0.3)",
                  backgroundColor: "rgba(249,115,22,0.08)",
                }}
              >
                {meta}
              </span>
            ))}
          </div>

          {/* CTA button */}
          <a
            href={brand.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all hover:brightness-110"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--base)",
            }}
          >
            {brand.ctaLabel}
            <span aria-hidden="true">&rarr;</span>
          </a>
        </motion.div>
      </div>
    </motion.div>
  );
}
