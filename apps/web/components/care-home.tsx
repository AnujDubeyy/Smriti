'use client';
import Link from 'next/link';
import {Mascot} from './brand';
import {SmritiArt} from './smriti-art';
import {useCareInbox} from './notification-panel';
export function CareHome({name,patientId,localPreview=false}:{name:string;patientId:string;localPreview?:boolean}){
 const {assignments,reminders}=useCareInbox();const pending=assignments.filter(a=>a.status==='assigned').length;
 return <section className="care-home"><div className="welcome-panel"><div><p className="eyebrow">YOUR DAILY SPACE</p><h1>Welcome, {name}</h1><p>A little conversation. A moment together. Care at your pace.</p><Link href="/companionship" className="button companionship">Talk to Smriti ↗</Link></div><div className="welcome-portrait"><Mascot pillar="companionship" large/></div></div>
 {pending>0?<Link href="/assessment" className="care-alert"><strong>{pending} {pending===1?'activity':'activities'} from your doctor</strong><span>View activities →</span></Link>:null}
 {reminders.map(reminder=><Link className="care-alert" href={reminder.href} key={reminder.id}><strong>{reminder.title}</strong><span>{reminder.detail} →</span></Link>)}
 <div className="section-heading"><h2>What would you like to do?</h2><span>Choose a space below</span></div>
 <div className="care-home-grid"><Link className="care-home-tile assessments" href="/assessment"><SmritiArt name="assessment-activity"/><strong>Your activities</strong><span>Follow a gentle activity assigned by your doctor.</span><b>Open assessments →</b></Link><Link className="care-home-tile talk" href="/companionship"><SmritiArt name="companionship-chat"/><strong>A familiar conversation</strong><span>Take your time and talk about your day.</span><b>Open companionship →</b></Link><Link className="care-home-tile observe" href="/monitoring"><SmritiArt name="monitoring-progress"/><strong>Your care journal</strong><span>Save daily observations and review them together.</span><b>Open monitoring →</b></Link><Link className="care-home-tile recordings" href="/assessment#recordings"><SmritiArt name="recordings"/><strong>Assessment recordings</strong><span>Listen, download, or share recordings saved on this device.</span><b>Open recording library →</b></Link></div>
 <div className="journal-card"><h2>For the caretaker</h2><p>Small everyday details help keep the care team informed. Record observations in your own words.</p><div className="actions"><Link className="button secondary" href="/monitoring">Add an observation</Link>{!localPreview?<Link className="button secondary" href={'/permissions?patient='+patientId}>Care permissions</Link>:null}</div></div></section>;
}
