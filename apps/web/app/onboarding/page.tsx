import {requireAccount} from '../../lib/page-access';
import {Onboarding} from '../../components/care-workflows';
export const dynamic='force-dynamic';
export default async function Page(){const c=await requireAccount();const {data,error}=await c.from('patients').select('id,care_details').order('created_at').limit(1).maybeSingle();if(error)throw new Error('Unable to load details');const {data:consents}=data?await c.from('consent_grants').select('purpose,expires_at,revoked_at').eq('patient_id',data.id):{data:[]};const permissions=Object.fromEntries((consents??[]).filter(x=>!x.revoked_at&&(!x.expires_at||new Date(x.expires_at)>new Date())).map(x=>[x.purpose,true]));return <Onboarding initial={data?.care_details??{}} permissions={permissions}/>;}
