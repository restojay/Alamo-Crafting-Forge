const socialLinks = [
  { label: "eBay", href: "https://www.ebay.com/str/forgepoint" },
];

export function SocialLinks() {
  if (socialLinks.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: "12px" }}>
      {socialLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
          style={{ fontSize: "12px" }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
