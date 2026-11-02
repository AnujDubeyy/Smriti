'use client';
import Link from 'next/link';
import {useState} from 'react';
import {usePreferences} from '../app/preferences';
import {authMessages} from '../lib/auth/messages';
type Patient={id:string;preferred_name:string;locale:string};
export function PatientSelector({patients,available}:{patients:Patient[];available:boolean}){
 const {locale}=usePreferences();const t=authMessages[locale];const [selected,setSelected]=useState<Patient|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState(false);
 async function choose(id:string){setBusy(true);setError(false);setSelected(null);try{const r=await fetch(`/api/v1/patients/${id}`,{cache:'no-store'});if(!r.ok){setError(true);return;}setSelected((await r.json()).patient);}catch{setError(true);}finally{setBusy(false);}}
 async function logout(){setBusy(true);setError(false);setSelected(null);try{const r=await fetch('/api/auth/logout',{method:'POST',cache:'no-store'});if(r.ok)window.location.replace('/login');else setError(true);}catch{setError(true);}finally{setBusy(false);}}
 return <section><h1 tabIndex={-1}>{t.patients}</h1><p>{t.privacy}</p>{!available?<p className="offline-notice">{t.unavailable}</p>:<>
 {!patients.length?<div className="state-panel"><h2>{t.empty}</h2><p>{t.emptyHint}</p></div>:<ul className="patient-list">{patients.map(p=><li key={p.id}><span>{p.preferred_name}</span><button className="button secondary" disabled={busy} onClick={()=>choose(p.id)} aria-label={`${t.choose}: ${p.preferred_name}`}>{t.choose}</button></li>)}</ul>}
 {selected?<section className="state-panel" aria-live="polite"><h2>{t.selected}</h2><p>{selected.preferred_name}</p></section>:null}
 <p role="status">{busy?t.busy:error?t.error:''}</p><button className="button secondary" onClick={logout} disabled={busy}>{t.logout}</button></>}
 <p><Link href="/">{t.preview}</Link></p></section>;
}
