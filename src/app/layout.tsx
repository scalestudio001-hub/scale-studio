import type { Metadata } from "next";
import localFont from "next/font/local";
import { SITE_NAME } from "@/lib/utils";
import "./globals.css";

const inter = localFont({ src: "../fonts/inter-latin-wght-normal.woff2", variable: "--font-inter", weight: "100 900" });
const oswald = localFont({ src: "../fonts/oswald-latin-wght-normal.woff2", variable: "--font-oswald", weight: "200 700" });
const playfair = localFont({
  src: [
    { path: "../fonts/playfair-display-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/playfair-display-latin-500-italic.woff2", weight: "500", style: "italic" },
  ],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: `Plataforma de cursos de ${SITE_NAME}`,
};

export const viewport = { themeColor: "#0E0E0E" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${inter.variable} ${oswald.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
