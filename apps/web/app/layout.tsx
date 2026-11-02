import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Smriti", description: "Support, connection and care" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
