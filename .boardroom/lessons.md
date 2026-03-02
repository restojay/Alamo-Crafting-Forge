# Lessons Learned — Alamo Crafting Forge

Project-specific patterns. See `protocols/lessons-learned.md` for the full protocol.

---

### CSS animations for above-the-fold SSR content, not Framer Motion
- **Date:** 2026-03-02
- **Source:** Claude, Codex, Gemini during council deliberation
- **Error:** Used Framer Motion `initial={{ opacity: 0 }}` on hero text elements. SSR rendered them at opacity 0, causing a visible flicker when JS hydrated and animated them in. Stripping all FM was attempted as a workaround but removed animations entirely.
- **Fix:** Use CSS `@keyframes` with `animation-fill-mode: both` and staggered `animation-delay` for above-the-fold entrance animations. CSS loads with the stylesheet before JS hydration — zero flicker by design. Reserve Framer Motion for scroll-triggered (`whileInView`) and interactive animations below the fold.
- **Rule:** Never use Framer Motion `initial` to hide above-the-fold SSR content — use CSS animations for page-load entrances, JS for scroll/interactive.
- **Validated by:** Claude, Codex, Gemini
