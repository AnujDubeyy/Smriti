import Link from 'next/link';
import {workspace} from '../lib/workspace';
export const dynamic='force-dynamic';
export default async function Home(){const patient=await workspace();return <><h1>Welcome {patient.preferred_name}</h1><p className="intro">A little conversation, at your own pace.</p><section className="empty-state companionship"><div><h2>Talk to Smriti</h2><p>Start a voice conversation in your language.</p><Link className="button companionship" href="/companionship">Begin call</Link></div></section><div className="actions"><Link href="/monitoring">Doctor Monitoring</Link><Link href="/onboarding">Your details</Link></div></>;}
