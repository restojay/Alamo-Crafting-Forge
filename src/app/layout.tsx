import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { organizationSchema, localBusinessSchema } from "@/lib/structured-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Alamo Crafting Forge — Precision Manufacturing & Design",
    template: "%s | Alamo Crafting Forge",
  },
  description:
    "San Antonio-based manufacturing and design studio. Precision 3D-printed dice, firearm accessories, tabletop miniatures, and full-service web development.",
  keywords: [
    "3D printing", "custom dice", "firearm accessories", "tabletop miniatures",
    "web development", "San Antonio", "Alamo Crafting Forge",
  ],
  metadataBase: new URL("https://alamocraftingforge.com"),
  openGraph: {
    title: "Alamo Crafting Forge",
    description: "Precision Manufacturing & Design — San Antonio, TX",
    url: "https://alamocraftingforge.com",
    siteName: "Alamo Crafting Forge",
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alamo Crafting Forge",
    description: "Precision Manufacturing & Design — San Antonio, TX",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema(), localBusinessSchema()])
              .replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
