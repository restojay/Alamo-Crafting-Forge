import { Mail, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer id="contact" className="py-16 px-6 border-t" style={{ borderColor: "var(--glass-border)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div>
            <h2 className="text-xl font-bold tracking-wider mb-2">Alamo Crafting Forge</h2>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <MapPin size={14} />
              <span>San Antonio, TX</span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              <Mail size={14} />
              <a href="mailto:contact@alamocraftingforge.com"
                className="hover:text-[var(--accent)] transition-colors">
                contact@alamocraftingforge.com
              </a>
            </div>
          </div>
          <div className="flex gap-8 text-sm" style={{ color: "var(--text-secondary)" }}>
            <a href="#brands" className="hover:text-[var(--accent)] transition-colors">Our Brands</a>
            <a href="#process" className="hover:text-[var(--accent)] transition-colors">The Process</a>
            <a href="#about" className="hover:text-[var(--accent)] transition-colors">About</a>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t text-center text-xs"
          style={{ borderColor: "var(--glass-border)", color: "var(--secondary)" }}>
          &copy; {new Date().getFullYear()} Alamo Crafting Forge LLC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
