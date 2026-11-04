'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useSyncExternalStore} from 'react';
import {usePreferences} from '../app/preferences';
import {messages,pillars,locales,localeNames,type Locale} from '../lib/messages';
import {BrandLogo,Mascot} from './brand';
import {PwaControls} from './pwa-controls';
function subscribe(callback:()=>void){
 window.addEventListener('online',callback);window.addEventListener('offline',callback);
 return()=>{window.removeEventListener('online',callback);window.removeEventListener('offline',callback);};
}
function PillarNav(){
 const path=usePathname();
 const {locale}=usePreferences();const t=messages[locale];
 return <nav className="pillar-nav" aria-label={t.nav}>
  {pillars.map((p,i)=><Link key={p} href={'/'+p} className={'nav-link '+p}
   aria-current={path==='/'+p||path.startsWith('/'+p+'/')?'page':undefined}>
   <Mascot pillar={p}/><span>{t.tabs[i]}</span>
  </Link>)}
 </nav>;
}
export function AppShell({children}:{children:React.ReactNode}){
 const {locale,setLocale}=usePreferences();
 const t=messages[locale],path=usePathname();
 const entry=['/login','/signup','/recover','/reset-password','/onboarding','/accept-invite','/auth/callback','/join'].includes(path);
 const doctor=path.startsWith('/doctor');
 const showNav=!entry&&!doctor;
 const online=useSyncExternalStore(subscribe,()=>navigator.onLine,()=>true);
 const previousPath=useRef(path),container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(previousPath.current!==path){
   container.current?.querySelector<HTMLElement>('h1,[data-route-heading]')?.focus();
   previousPath.current=path;
  }
 },[path]);
 return <div className={'app-shell '+(entry?'smriti-entry':'')} lang={locale} ref={container}>
  <a className="skip-link" href="#main">{t.skip}</a>
  <header className="app-header">
   <Link href="/" className="brand-link" aria-label={t.brand}><BrandLogo alt={t.logo}/></Link>
   {!entry?<div className="preferences">
    <label className="field">Language<select value={locale} onChange={e=>setLocale(e.target.value as Locale)}>
     {locales.map(l=><option key={l} value={l}>{localeNames[l]}</option>)}
    </select></label>
    <Link className="account-link" href="/profile" title="Profile settings" aria-label="Profile settings"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></svg><span>Profile</span></Link>
    <button className="account-link" type="button" onClick={async()=>{
     try{const r=await fetch('/api/auth/logout',{method:'POST'});if(r.ok)window.location.assign('/login');}catch{}
    }}>Sign out</button>
   </div>:null}
  </header>
  <div className={showNav?'app-body':'app-body entry-body'}>
   {showNav?<PillarNav/>:null}
   <div className="content-column">
    {!online?<div className="offline-notice" role="status">You are offline. Reconnect to use your care account.</div>:null}
    <main id="main" tabIndex={-1}>{children}</main>
    {!entry?<footer className="app-footer"><PwaControls/></footer>:null}
   </div>
  </div>
 </div>;
}
