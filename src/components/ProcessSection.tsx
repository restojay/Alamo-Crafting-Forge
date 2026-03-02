import { Layers, Cpu, PenTool, Globe } from "lucide-react";

const capabilities = [
  { icon: Layers, label: "SLA Resin Printing", detail: "Formlabs 4B" },
  { icon: Cpu, label: "FDM Manufacturing", detail: "Bambu Lab P1S" },
  { icon: PenTool, label: "CAD Design", detail: "Fusion 360 + OpenSCAD" },
  { icon: Globe, label: "Web Development", detail: "Next.js + React + Tailwind" },
];

export function ProcessSection() {
  return (
    <section id="process" className="py-24 px-6 border-t" style={{ borderColor: "var(--glass-border)" }}>
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">The Process</h2>
        <p className="text-sm mb-16" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-geist-mono)" }}>
          From resin to code — everything we make is engineered to spec.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {capabilities.map((cap) => (
            <div key={cap.label} className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center border"
                style={{ borderColor: "rgba(249,115,22,0.3)", backgroundColor: "rgba(249,115,22,0.06)" }}>
                <cap.icon size={24} style={{ color: "var(--accent)" }} />
              </div>
              <span className="text-sm font-medium">{cap.label}</span>
              <span className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-geist-mono)" }}>
                {cap.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
