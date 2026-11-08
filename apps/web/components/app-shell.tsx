'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {usePreferences} from '../app/preferences';
import {messages,pillars,locales,localeNames,type Locale} from '../lib/messages';
import {isEntryRoute,isDoctorRoute,showCareNavigation,isPillarActive,doctorSections,isDoctorSectionActive} from '../lib/navigation';
import {BrandLogo,Mascot} from './brand';
import {NotificationPanel} from './notification-panel';
import {PwaControls} from './pwa-controls';

function subscribe(callback:()=>void){
 window.addEventListener('online',callback);
 window.addEventListener('offline',callback);
 return()=>{
  window.removeEventListener('online',callback);
  window.removeEventListener('offline',callback);
 };
}
function MenuIcon(){
 return <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
  <path d="M4 6h16M4 12h16M4 18h16"/>
 </svg>;
}
function CloseIcon(){
 return <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
  <path d="M5 5l14 14M19 5L5 19"/>
 </svg>;
}
function ProfileIcon(){
 return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/>
 </svg>;
}
function CareNav({mode,expanded=false,doctor=false}:{mode:'desktop'|'mobile';expanded?:boolean;doctor?:boolean}){
 const path=usePathname();
 const {locale}=usePreferences();
 const t=messages[locale];
 return <nav
  id={mode==='desktop'?'smriti-desktop-navigation':undefined}
  className={mode==='desktop'?'smriti-desktop-navigation':'smriti-mobile-navigation'}
  aria-label={mode==='desktop'?t.nav:t.nav+' — bottom tabs'}>
  {!doctor?<Link href="/" title="Home" aria-label="Home" aria-current={path==='/'?'page':undefined} className={'smriti-nav-item'+(path==='/'?' is-active':'')}><span className="home-nav-icon" aria-hidden="true">⌂</span><span className="smriti-nav-label">Home</span></Link>:null}
  {doctor?doctorSections.map(section=>{
    const active=isDoctorSectionActive(path,section.href);
    return <Link key={section.href} href={section.href}
     title={section.label} aria-label={section.label}
     aria-current={active?'page':undefined}
     className={'smriti-nav-item smriti-doctor-item '+section.icon+
      (active?' is-active':'')}>
     {section.icon==='conversations'?(
      <Mascot pillar="companionship"/>
     ):section.icon==='monitoring'?(
      <Mascot pillar="monitoring"/>
     ):(
      <span aria-hidden="true" className="smriti-doctor-nav-icon"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={section.icon==='patients'?'M16 21v-2a5 5 0 0 0-10 0v2 M15 7a4 4 0 1 1-8 0 4 4 0 1 1 8 0':'M8 5H5v16h14V5h-3 M9 3h6v4H9z M8 14l3 3 5-6'}/></svg></span>
     )}
     <span className="smriti-nav-label" aria-hidden={mode==='desktop'&&!expanded}>{section.label}</span>
    </Link>;
   }):pillars.map((pillar,index)=>{
   const active=isPillarActive(path,pillar);
   return <Link
    key={pillar}
    href={'/'+pillar}
    title={t.tabs[index]}
    aria-label={t.tabs[index]}
    aria-current={active?'page':undefined}
    className={'smriti-nav-item '+pillar+(active?' is-active':'')}>
    <Mascot pillar={pillar}/>
    <span className="smriti-nav-label" aria-hidden={mode==='desktop'&&!expanded}>{t.tabs[index]}</span>
   </Link>;
  })}
  {mode==='desktop'?<Link
   href={doctor?'/doctor/profile':'/profile'}
   title="Profile and account"
   aria-label="Profile and account"
   aria-current={path==='/profile'||path==='/doctor/profile'?'page':undefined}
   className={'smriti-nav-item smriti-nav-profile'+(path==='/profile'||path==='/doctor/profile'?' is-active':'')}>
   <ProfileIcon/><span className="smriti-nav-label" aria-hidden={!expanded}>Profile</span>
  </Link>:null}
 </nav>;
}
export function AppShell({children,localPreview=false}:{children:React.ReactNode;localPreview?:boolean}){
 const {locale,setLocale}=usePreferences();
 const path=usePathname();
 const t=messages[locale];
 const entry=isEntryRoute(path);
 const doctor=isDoctorRoute(path);
 const showNav=showCareNavigation(path)||doctor;
 const online=useSyncExternalStore(subscribe,()=>navigator.onLine,()=>true);
 const [expanded,setExpanded]=useState(false);
 const [accountOpen,setAccountOpen]=useState(false);
 const [signingOut,setSigningOut]=useState(false);
 const [signOutError,setSignOutError]=useState('');
 const accountRef=useRef<HTMLDivElement>(null);
 const container=useRef<HTMLDivElement>(null);
 const previousPath=useRef(path);
 useEffect(()=>{
  if(previousPath.current!==path){
   container.current?.querySelector<HTMLElement>('main h1,[data-route-heading]')?.focus();
   previousPath.current=path;setExpanded(false);
  }
  setAccountOpen(false);
 },[path]);
 useEffect(()=>{
  if(!accountOpen)return;
  function dismissOnOutside(event:PointerEvent){
   if(!accountRef.current?.contains(event.target as Node))setAccountOpen(false);
  }
  function dismissOnEscape(event:KeyboardEvent){
   if(event.key==='Escape'){
    setAccountOpen(false);
    accountRef.current?.querySelector<HTMLButtonElement>('.smriti-account-toggle')?.focus();
   }
  }
  document.addEventListener('pointerdown',dismissOnOutside);
  document.addEventListener('keydown',dismissOnEscape);
  return()=>{
   document.removeEventListener('pointerdown',dismissOnOutside);
   document.removeEventListener('keydown',dismissOnEscape);
  };
 },[accountOpen]);
 async function signOut(){
  if(signingOut)return;
  setSigningOut(true);
  setSignOutError('');
  try{
   const response=await fetch('/api/auth/logout',{method:'POST'});
   if(!response.ok)throw new Error('sign_out_failed');
   window.location.assign('/login');
  }catch{
   setSignOutError('Could not sign out. Check your connection and try again.');
   setSigningOut(false);
  }
 }
 return <div
  className={'app-shell smriti-layout'+(entry?' smriti-entry':'')}
  lang={locale} ref={container}>
  <a className="skip-link" href="#main">{t.skip}</a>
  <header className="app-header smriti-layout-header">
   <div className="smriti-header-leading">
    {showNav?<button
     className="smriti-sidebar-toggle"
     type="button"
     aria-controls="smriti-desktop-navigation"
     aria-label={expanded?'Collapse sidebar':'Expand sidebar'}
     aria-expanded={expanded}
     title={expanded?'Collapse sidebar':'Expand sidebar'}
     onClick={()=>setExpanded(v=>!v)}>
     {expanded?<CloseIcon/>:<MenuIcon/>}
    </button>:null}
    <Link href={doctor?'/doctor':'/'} className="brand-link" aria-label={t.brand}>
     <BrandLogo alt={t.logo}/>
    </Link>
   </div>
   {!entry?<div className="smriti-header-trailing" ref={accountRef}>
    <NotificationPanel/>
    <button
     className="smriti-account-toggle"
     type="button"
     aria-label="Account and language options"
     aria-expanded={accountOpen}
     aria-controls="smriti-account-popover"
     title="Account and language"
     onClick={()=>setAccountOpen(v=>!v)}>
     <ProfileIcon/><span>Account</span>
     <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    {accountOpen?<div id="smriti-account-popover" className="smriti-account-popover">
     <label className="smriti-account-language">
      <span>Language</span>
      <select value={locale} onChange={e=>setLocale(e.target.value as Locale)}>
       {locales.map(l=><option key={l} value={l}>{localeNames[l]}</option>)}
      </select>
     </label>
     <Link href={doctor?'/doctor':'/'} className="smriti-account-option" onClick={()=>setAccountOpen(false)}>Home</Link>
     <Link href={doctor?'/doctor/profile':'/profile'} className="smriti-account-option" onClick={()=>setAccountOpen(false)}>Profile &amp; account</Link>
     <button type="button" className="smriti-account-option smriti-signout"
      onClick={()=>void signOut()} disabled={signingOut}>
      {signingOut?'Signing out…':'Sign out'}
     </button>
     {signOutError?<p role="alert" className="smriti-account-error">{signOutError}</p>:null}
    </div>:null}
   </div>:null}
  </header>
  <div className={
   showNav
    ?'app-body smriti-app-body smriti-app-body--nav'+(expanded?' is-sidebar-expanded':'')
    :'app-body smriti-app-body smriti-app-body--single'+(entry?' entry-body':'')
   }>
   {showNav?<aside className="smriti-desktop-rail">
    <CareNav mode="desktop" expanded={expanded} doctor={doctor}/>
   </aside>:null}
   <div className="content-column smriti-main-column">
    {!online?<div className="offline-notice" role="status">
     You are offline. Reconnect to use your care account.
    </div>:null}
    <main id="main" tabIndex={-1}>
     {localPreview&&!entry?<div className="preview-switch"><span>Demo workspace</span><div><Link href="/doctor" aria-current={doctor?'page':undefined}>Doctor view</Link><Link href="/" aria-current={!doctor?'page':undefined}>Patient view</Link></div></div>:null}
     {path!=='/join'&&path!=='/'&&path!=='/doctor'&&path!=='/assessment'?<nav className="page-breadcrumb" aria-label="Page navigation"><Link href={entry?'/login':doctor?'/doctor':'/'}>← {entry?'Back to sign in':doctor?'Back to patients':'Back to home'}</Link>{!entry?<Link href={doctor?'/doctor/assessments':'/assessment'}>Assessments</Link>:null}{!entry?<Link href={doctor?'/doctor/monitoring':'/monitoring'}>Monitoring</Link>:null}</nav>:null}
     <div className="route-content" key={path}>{children}</div></main>
    {!entry?<PwaControls/>:null}
   </div>
  </div>
  {showNav?<CareNav mode="mobile" doctor={doctor}/>:null}
 </div>;
}
