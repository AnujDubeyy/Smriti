import {redirect} from 'next/navigation';
import {authenticatedClient} from '../../../lib/auth/access';
import {PatientSelector} from '../../../components/patient-selector';
export const dynamic='force-dynamic';
export default async function SelectPatient(){
 const auth=await authenticatedClient();
 if(auth.error==='unauthorized')redirect('/login');
 if(!auth.client)return <PatientSelector patients={[]} available={false}/>;
 const {data,error}=await auth.client.from('patients').select('id,preferred_name,locale').order('created_at').limit(100);
 if(error)throw new Error('Care relationships temporarily unavailable');
 return <PatientSelector patients={data??[]} available/>;
}
