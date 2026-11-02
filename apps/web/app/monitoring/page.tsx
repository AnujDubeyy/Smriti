import Link from 'next/link';
import Shell from '../shell';
import {requireAccount} from '../../lib/page-access';
import {LogsPanel} from '../../components/logs-panel';
import {z} from 'zod';
export default async function Page({searchParams}:{searchParams:Promise<{patient?:string}>}){const {patient}=await searchParams;if(patient){await requireAccount();if(!z.uuid().safeParse(patient).success)return <p>Invalid patient selection.</p>;return <LogsPanel patientId={patient}/>;}return <><Shell/><Link href="/patients/select" className="button monitoring" prefetch={false}>Choose patient to view logs</Link></>;}
