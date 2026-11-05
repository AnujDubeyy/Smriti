import {localDoctorPreview} from '../lib/local-doctor-preview';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import './workspace.css';
import { Preferences } from './preferences';
import { AppShell } from '../components/app-shell';
export const metadata: Metadata = { title: { default: 'Smriti', template: '%s · Smriti' }, description: 'Support, connection and care', applicationName: 'Smriti', appleWebApp: { capable: true, title: 'Smriti', statusBarStyle: 'default' }, icons: { icon: '/brand/icon-192.png', apple: '/brand/icon-192.png' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#FAF9F6' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en-IN" dir="ltr"><body><Preferences><AppShell localPreview={localDoctorPreview()}>{children}</AppShell></Preferences></body></html>; }
