import {requireAccount} from '../../lib/page-access';
import {Permissions} from '../../components/care-workflows';
import {z} from 'zod';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{patient?:string}>}){await requireAccount();const id=(await searchParams).patient;if(!z.uuid().safeParse(id).success)return <p>Choose a patient from your care account first.</p>;return <Permissions patientId={id!}/>;}
