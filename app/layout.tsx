import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BataraSec Portal",
  description: "Internal BataraSec license and knowledge base portal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body>{children}</body>
    </html>
  );
}
