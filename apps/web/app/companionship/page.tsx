import Link from 'next/link';
import Shell from '../shell';
import {requireAccount} from '../../lib/page-access';
import {VoiceStudio} from '../../components/voice-studio';
import {z} from 'zod';
export default async function Page({searchParams}:{searchParams:Promise<{patient?:string}>}){const {patient}=await searchParams;if(patient){await requireAccount();if(!z.uuid().safeParse(patient).success)return <p>Invalid patient selection.</p>;return <VoiceStudio patientId={patient}/>;}return <><Shell/><div className="actions"><Link href="/patients/select" className="button companionship" prefetch={false}>Choose patient and start conversation</Link><Link href="/voice" className="button secondary">Try mock voice demo</Link></div></>;}
