import type { Metadata } from "next";
import "./globals.css";
import {Preferences} from "./preferences";
export const metadata: Metadata = { title: "Smriti", description: "Support, connection and care" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><Preferences>{children}</Preferences></body></html>; }
