import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alamo Crafting Forge — Precision Manufacturing & Design",
  description:
    "San Antonio-based manufacturing and design studio. Precision 3D-printed dice, firearm accessories, tabletop miniatures, and full-service web development.",
  keywords: [
    "3D printing", "custom dice", "firearm accessories", "tabletop miniatures",
    "web development", "San Antonio", "Alamo Crafting Forge",
  ],
  openGraph: {
    title: "Alamo Crafting Forge",
    description: "Precision Manufacturing & Design — San Antonio, TX",
    url: "https://alamocraftingforge.com",
    siteName: "Alamo Crafting Forge",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
