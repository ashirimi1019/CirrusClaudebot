import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CirrusLabs — Signal-Driven Outbound",
  description:
    "AI-powered outbound engine that finds companies with hiring signals and turns them into pipeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#030303] text-white`}>
        {children}
      </body>
    </html>
  );
}
