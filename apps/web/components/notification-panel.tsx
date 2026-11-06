'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {isEntryRoute,isDoctorRoute} from '../lib/navigation';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useDemoCare} from '../lib/demo-care-store';
import {activityCatalog,type Assignment} from '../lib/assessment-activities';
type Reminder={id:string;title:string;href:string;detail:string};
const Inbox=createContext<{assignments:Assignment[];reminders:Reminder[];loading:boolean;error:string}>({assignments:[],reminders:[],loading:false,error:''});
export const useCareInbox=()=>useContext(Inbox);
export function CareInboxProvider({children,localPreview}:{children:React.ReactNode;localPreview:boolean}){
 const path=usePathname();
 const enabled=!isEntryRoute(path)&&!isDoctorRoute(path);
 const demo=useDemoCare();
 const [live,setLive]=useState<Assignment[]>([]);
 const [reminders,setReminders]=useState<Reminder[]>([]);
 const [loading,setLoading]=useState(enabled&&!localPreview);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(localPreview||!enabled){setLoading(false);setLive([]);setReminders([]);setError('');return;}
  setLoading(true);
  const controller=new AbortController();
  const refresh=async()=>{if(document.hidden)return;try{const r=await fetch('/api/v1/caretaker/assessments?notifications=1',{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error();const data=await r.json();setLive(data.assignments);setReminders(data.reminders||[]);setError(data.activitiesUnavailable?'Activities could not be loaded. Open Assessments to retry.':'');}catch{if(!controller.signal.aborted)setError('Could not refresh. Open Assessments to check your activities.');}finally{if(!controller.signal.aborted)setLoading(false);}};
  void refresh();const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);window.addEventListener('smriti-account-updated',refresh);
  return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('smriti-account-updated',refresh);};
 },[localPreview,enabled]);
 return <Inbox.Provider value={{assignments:localPreview?demo.assignments:enabled?live:[],reminders:enabled?reminders:[],loading:enabled&&loading,error:enabled?error:''}}>{children}</Inbox.Provider>;
}
export function NotificationPanel(){
 const {assignments,reminders,loading,error}=useCareInbox();
 const path=usePathname();const doctor=isDoctorRoute(path);
 const [open,setOpen]=useState(false);
 const [read,setRead]=useState<string[]>([]);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{setOpen(false);},[path]);
 useEffect(()=>{if(!open)return;function close(e:PointerEvent){if(!root.current?.contains(e.target as Node))setOpen(false);}function escape(e:KeyboardEvent){if(e.key==='Escape'){setOpen(false);root.current?.querySelector('button')?.focus();}}document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};},[open]);
 const items=assignments.filter(a=>doctor?a.status==='submitted':a.status==='assigned');const notices=doctor?[]:reminders;const unread=notices.filter(n=>!read.includes(n.id)).length+items.filter(a=>!read.includes(a.id+':'+a.status)).length;
 return <div className="notification-root" ref={root}><button className="notification-toggle" aria-label={`Notifications${unread?', '+unread+' unread':''}`} aria-expanded={open} aria-controls="notifications" onClick={()=>setOpen(v=>!v)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{unread>0?<span className="notification-count">{unread}</span>:null}</button>
 {open?<section className="notification-popover" id="notifications" aria-label="Notifications"><div className="section-heading"><h2>Notifications</h2><button className="text-button" onClick={()=>setOpen(false)} aria-label="Close notifications">✕</button></div>{unread>0?<button className="text-button" onClick={()=>setRead([...notices.map(n=>n.id),...items.map(a=>a.id+':'+a.status)])}>Mark all as read</button>:null}{loading?<p role="status">Checking for updates…</p>:null}{error?<p role="alert">{error}</p>:null}{!loading&&!error&&!items.length&&!notices.length?<p>{doctor?'Review patient responses in Assessments.':'You’re all caught up. New activities from your doctor will appear here.'}</p>:null}<ul>{notices.map(n=><li key={n.id}><Link href={n.href} onClick={()=>{setRead(v=>[...v,n.id]);setOpen(false);}}><strong>{n.title}</strong><span>{n.detail}</span></Link></li>)}{items.map(a=><li key={a.id} className={read.includes(a.id+':'+a.status)?'':'unread'}><Link href={doctor?'/doctor/assessments':'/assessment'} onClick={()=>{setRead(v=>[...v,a.id+':'+a.status]);setOpen(false);}}><strong>{doctor?'Activity completed':'New activity from your doctor'}</strong><span>{activityCatalog.find(x=>x.code===a.instrument_code)?.title||'Assigned activity'}</span><small>{a.due_date?'Due '+a.due_date.split('-').reverse().join('/'):'Open activity →'}</small></Link></li>)}</ul></section>:null}</div>;
}
