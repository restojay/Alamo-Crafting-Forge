export function AboutSection() {
  return (
    <section id="about" className="py-24 px-6 border-t" style={{ borderColor: "var(--glass-border)" }}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">About the Forge</h2>
        <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Alamo Crafting Forge is a San Antonio-based manufacturing and design studio.
          We build precision 3D-printed products and custom websites — four brands,
          one standard of quality. Everything we ship is engineered, tested, and made to spec.
        </p>
      </div>
    </section>
  );
}
