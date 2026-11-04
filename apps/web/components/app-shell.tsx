'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { usePreferences } from '../app/preferences';
import { messages, pillars, locales, localeNames, type Locale } from '../lib/messages';
import { BrandLogo, Mascot } from './brand';
import { authMessages } from '../lib/auth/messages';
import { PwaControls } from './pwa-controls';
function subscribe(callback: () => void) { window.addEventListener('online', callback); window.addEventListener('offline', callback); return () => { window.removeEventListener('online', callback); window.removeEventListener('offline', callback); }; }
export function PillarNav() {
 const path = usePathname(); const { locale } = usePreferences(); const t = messages[locale];
 return <nav className="pillar-nav" aria-label={t.nav}>{pillars.map((p, i) => <Link key={p} href={`/${p}`} className={`nav-link ${p}`} aria-current={path === `/${p}` || path.startsWith(`/${p}/`) ? 'page' : undefined}><Mascot pillar={p} /><span>{t.tabs[i]}</span></Link>)}</nav>;
}
export function AppShell({ children }: { children: React.ReactNode }) {
 const { locale, setLocale } = usePreferences(); const t = messages[locale]; const path = usePathname();
 const isEntry = ['/login','/signup','/recover','/reset-password','/onboarding','/auth/callback'].includes(path);
 const a = authMessages[locale];
 const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
 const previousPath = useRef(path); const container = useRef<HTMLDivElement>(null);
 useEffect(() => { if (previousPath.current !== path) { container.current?.querySelector<HTMLElement>('h1, [data-route-heading]')?.focus(); previousPath.current = path; } }, [path]);
 return <div className="app-shell" lang={locale} ref={container}>
 <a href="#main" className="skip-link">{t.skip}</a>
 <header className="app-header"><Link href="/" className="brand-link" aria-label={t.brand}><BrandLogo alt={t.logo} /></Link><div className="preferences">
 <label className="field">{t.language}<select value={locale} onChange={e => setLocale(e.target.value as Locale)}>{locales.map(l => <option key={l} value={l}>{localeNames[l]}</option>)}</select></label>
 {!isEntry && <><Link className="account-link" href="/onboarding">Details</Link><button className="account-link" onClick={async()=>{const r=await fetch('/api/auth/logout',{method:'POST'});if(r.ok)window.location.assign('/login');}}>Sign out</button></>}
 </div></header><div className={isEntry?"app-body entry-body":"app-body"}>{!isEntry && <PillarNav />}<div className="content-column">
 {!online ? <div role="status" className="offline-notice">{t.offline}</div> : null}
 <main id="main" tabIndex={-1}>{children}</main>
 <footer className="app-footer"><p>{a.privacy}</p><PwaControls /></footer>
 </div></div></div>;
}
