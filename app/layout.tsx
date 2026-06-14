import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BataraSec Portal",
  description: "Internal BataraSec license and knowledge base portal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={{ backgroundColor: "#141416" }}>
      <body style={{ backgroundColor: "#141416", color: "#f4f4f5" }}>{children}</body>
    </html>
  );
}
