import {localDoctorPreview} from '../../lib/local-doctor-preview';
import {VoiceStudio as DemoVoiceStudio} from '../../components/voice-studio';
export const dynamic='force-dynamic';
import {workspace} from '../../lib/workspace';
import {VoiceStudio} from '../../components/voice-call';
export default async function Page(){if(localDoctorPreview())return <><h1>A moment with Smriti</h1><p className="intro">Try a sample conversation. Live voice needs provider credentials.</p><DemoVoiceStudio demo/></>;const p=await workspace();return <><h1>Welcome {p.preferred_name}</h1><VoiceStudio patientId={p.id}/></>;}
