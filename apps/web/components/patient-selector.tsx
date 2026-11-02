'use client';
import Link from 'next/link';
import {useState} from 'react';
import {usePreferences} from '../app/preferences';
import {authMessages} from '../lib/auth/messages';
type Patient={id:string;preferred_name:string;locale:string};
export function PatientSelector({patients,available}:{patients:Patient[];available:boolean}){
 const {locale}=usePreferences();const t=authMessages[locale];const [busy,setBusy]=useState(false);const [error,setError]=useState(false);
 async function logout(){setBusy(true);setError(false);try{const r=await fetch('/api/auth/logout',{method:'POST',cache:'no-store'});if(r.ok)window.location.replace('/login');else setError(true);}catch{setError(true);}finally{setBusy(false);}}
 return <section><h1 tabIndex={-1}>{t.patients}</h1><p>{t.privacy}</p>{!available?<p className="offline-notice">{t.unavailable}</p>:<>
 {!patients.length?<div className="state-panel"><h2>{t.empty}</h2><p>{t.emptyHint}</p></div>:<ul className="patient-list">{patients.map(p=><li key={p.id}><span>{p.preferred_name}</span><Link className="button secondary" href={`/permissions?patient=${p.id}`} prefetch={false}>{t.choose}</Link></li>)}</ul>}

 <p role="status">{busy?t.busy:error?t.error:''}</p><button className="button secondary" onClick={logout} disabled={busy}>{t.logout}</button></>}
 <div className="actions"><Link href="/onboarding">Set up profile / request verification</Link><Link href="/accept-invite">Accept invitation</Link></div><p><Link href="/">{t.preview}</Link></p></section>;
}
