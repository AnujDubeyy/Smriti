export const dynamic='force-dynamic';
import {workspace} from '../../lib/workspace';
import {VoiceStudio} from '../../components/voice-call';
export default async function Page(){const p=await workspace();return <><h1>Welcome {p.preferred_name}</h1><VoiceStudio patientId={p.id}/></>;}
