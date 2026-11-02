"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useSyncExternalStore} from 'react';
import {usePreferences} from './preferences';
import {messages,type Locale} from '../lib/messages';
const pillars=['assessment','companionship','monitoring'] as const;
const roles=['patient','caregiver','clinician'] as const;
function subscribe(callback:()=>void){window.addEventListener('online',callback);window.addEventListener('offline',callback);return ()=>{window.removeEventListener('online',callback);window.removeEventListener('offline',callback);};}
export default function Shell(){
 const path=usePathname();const index=Math.max(0,pillars.findIndex(p=>path===`/${p}`));const pillar=pillars[index];
 const {role,setRole,locale,setLocale}=usePreferences();const t=messages[locale];
 const online=useSyncExternalStore(subscribe,()=>navigator.onLine,()=>true);
 return <div lang={locale}>
 <a className="skip-link" href="#main">{t.skip}</a>
 <header><Link href="/">Smriti</Link><label>{t.language}<select value={locale} onChange={e=>setLocale(e.target.value as Locale)}><option value="en">English</option><option value="hi">हिन्दी · Beta</option><option value="mr">मराठी · Beta</option></select></label><label>{t.role}<select value={role} onChange={e=>setRole(e.target.value as typeof role)}>{roles.map((r,i)=><option key={r} value={r}>{t.roles[i]}</option>)}</select></label></header>
 {!online?<p role="status" className="offline">{t.offline}</p>:null}
 <main id="main" tabIndex={-1}><p className="eyebrow">{t.demo}</p><h1 className={pillar}>{t.tabs[index]}</h1><section className="empty"><h2>{t.titles[roles.indexOf(role)][index]}</h2><p>{t.descriptions[index]}</p><p className="note">{t.disclaimer}</p></section><Link href="/" onClick={()=>setLocale('en')}>{t.back}</Link></main>
 <nav aria-label={t.nav}>{pillars.map((p,i)=><Link key={p} className={p} href={'/'+p} aria-current={p===pillar?'page':undefined}>{t.tabs[i]}</Link>)}</nav>
 </div>;
}
